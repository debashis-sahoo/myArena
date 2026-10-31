import { afterEach, describe, expect, it } from 'vitest';
import { createMatch, roll, type MatchState } from '@myarena/ludo';
import {
  COMPUTER_PAUSE_MIN_MS, COMPUTER_PAUSE_SPAN_MS, createSoloMatch, createSoloRunner, type Clock, type SoloDice, type SoloUpdate,
} from '../../src/features/ludo/solo/soloRunner';
import {
  SAVE_KEY, SAVE_MAX_AGE_MS, clearSaved, isMatchState, loadSaved, loadSetup, save, saveSetup, type SoloSettings,
} from '../../src/features/ludo/solo/soloStorage';

class FakeClock implements Clock {
  time = 0;
  private timers: { at: number; id: number; run: () => void }[] = [];
  private next = 1;
  now(): number { return this.time; }
  setTimeout(run: () => void, ms: number): unknown { const id = this.next; this.next += 1; this.timers.push({ at: this.time + ms, id, run }); return id; }
  clearTimeout(handle: unknown): void { this.timers = this.timers.filter((timer) => timer.id !== handle); }
  advance(ms: number): void {
    const end = this.time + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const due = this.timers[0];
      if (!due || due.at > end) break;
      this.timers.shift();
      this.time = due.at;
      due.run();
    }
    this.time = end;
  }
}

const dice = (values: number[], first: number, random = 0.5): SoloDice => {
  let index = 0;
  return { value: () => values[index++ % values.length]!, seed: () => 1234, firstSeat: () => first, random: () => random };
};

const settings = (opponents: 1 | 2 | 3, difficulty: SoloSettings['difficulty'] = 'normal'): SoloSettings => ({ opponents, difficulty, theme: 'classic' });

function run(options: { settings?: SoloSettings; values?: number[]; first?: number; random?: number; resume?: MatchState | null } = {}) {
  const clock = new FakeClock();
  const updates: SoloUpdate[] = [];
  const runner = createSoloRunner({
    settings: options.settings ?? settings(1), visitorLabel: 'Pat', resume: options.resume ?? null, clock,
    dice: dice(options.values ?? [6], options.first ?? 0, options.random), onUpdate: (update) => updates.push(update),
  });
  runner.start();
  return { clock, updates, runner, last: () => updates.at(-1)! };
}

afterEach(() => localStorage.clear());

describe('solo match set-up', () => {
  it('seats the visitor as Red and gives the computers the colours of seats.ts', () => {
    expect(createSoloMatch(settings(1), 'Pat', 0).seats.map((seat) => [seat.color, seat.kind, seat.label])).toEqual([
      ['RED', 'HUMAN', 'Pat'], ['YELLOW', 'COMPUTER', 'Computer 1'],
    ]);
    expect(createSoloMatch(settings(2), 'Pat', 0).seats.map((seat) => seat.color)).toEqual(['RED', 'GREEN', 'YELLOW']);
    expect(createSoloMatch(settings(3), 'Pat', 0).seats.map((seat) => seat.color)).toEqual(['RED', 'GREEN', 'YELLOW', 'BLUE']);
  });

  it('starts on the seat the random source picked and sets the viewer as seat 0, with no turn limit or away state', () => {
    const { last } = run({ first: 1 });
    expect(last().view).toMatchObject({ you: 0, turnLimitSeconds: 0, turn: { seat: 1, phase: 'ROLL', decisionMsLeft: null } });
    expect(last().view.seats.every((seat) => !seat.away && !seat.left)).toBe(true);
  });
});

describe('computer turns', () => {
  it('pauses 700 to 1500 ms before each action, so a turn takes at most 3 s apart from the roll animation', () => {
    for (const [random, expected] of [[0, COMPUTER_PAUSE_MIN_MS], [0.9999, COMPUTER_PAUSE_MIN_MS + COMPUTER_PAUSE_SPAN_MS]] as const) {
      const { clock, updates } = run({ first: 1, random, values: [6, 6] });
      clock.advance(expected - 1);
      expect(updates).toHaveLength(1);
      clock.advance(1);
      expect(updates).toHaveLength(2);
      expect(updates[1]!.events[0]).toMatchObject({ kind: 'ROLLED', seat: 1, value: 6, durationMs: 2400, seed: 1234 });
      // The move waits for the roll animation, then the same pause.
      clock.advance(2400 + expected - 1);
      expect(updates).toHaveLength(2);
      clock.advance(1);
      expect(updates).toHaveLength(3);
      expect(updates[2]!.events[0]).toMatchObject({ kind: 'MOVED', seat: 1 });
      expect(expected * 2).toBeLessThanOrEqual(3000);
    }
  });

  it('logs every computer roll and move in plain words', () => {
    const { clock, last } = run({ first: 1, values: [6] });
    clock.advance(1100 + 2400 + 1100);
    const text = last().view.log.map((entry) => entry.text).join(' | ');
    expect(text).toContain('Computer 1 rolled a 6.');
    expect(text).toContain('Computer 1 brought pawn 1 onto the board.');
  });

  it('passes the turn to the visitor after a computer roll that cannot be used', () => {
    const { clock, last } = run({ first: 1, values: [3] });
    clock.advance(1100 + 2400 + 1200);
    expect(last().view.turn).toMatchObject({ seat: 0, phase: 'ROLL' });
  });
});

describe('the visitor', () => {
  it('can roll only on their own turn and cannot move while the die is rolling', () => {
    const waiting = run({ first: 1 });
    expect(waiting.runner.roll()).toMatch(/not time/);
    const mine = run({ first: 0, values: [6] });
    expect(mine.runner.roll()).toBeNull();
    expect(mine.last().view.turn).toMatchObject({ seat: 0, phase: 'MOVE', dice: 6, legalPawns: [0, 1, 2, 3] });
    expect(mine.runner.move(0)).toMatch(/still rolling/);
    mine.clock.advance(2400);
    expect(mine.runner.move(0)).toBeNull();
    expect(mine.runner.move(0)).toMatch(/not time/);
  });

  it('is refused an illegal pawn once the die has settled', () => {
    const { clock, runner } = run({ first: 0, values: [6] });
    runner.roll();
    clock.advance(2400);
    expect(runner.move(7)).toMatch(/cannot move/);
  });

  it('stops all computer play when the match is left', () => {
    const { clock, runner, updates } = run({ first: 1 });
    runner.stop();
    clock.advance(10_000);
    expect(updates).toHaveLength(1);
  });
});

describe('saving and restoring', () => {
  const state = (): MatchState => roll(createSoloMatch(settings(1), 'Pat', 0), 6).state;

  it('restores a saved match exactly', () => {
    save(settings(1), state(), 1000);
    const saved = loadSaved(1000 + 60_000);
    expect(saved?.state).toEqual(state());
    expect(saved?.settings).toEqual(settings(1));
    const { last } = run({ resume: saved!.state });
    expect(last().view.turn).toMatchObject({ seat: 0, phase: 'MOVE', dice: 6 });
  });

  it('discards a save 30 minutes after savedAt, and "Leave match" discards it at once', () => {
    save(settings(1), state(), 1000);
    expect(loadSaved(1000 + SAVE_MAX_AGE_MS - 1)).not.toBeNull();
    expect(loadSaved(1000 + SAVE_MAX_AGE_MS)).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    save(settings(1), state(), 1000);
    clearSaved();
    expect(loadSaved(1001)).toBeNull();
  });

  it('keeps a save under about 10 KB and tolerates invalid or missing storage', () => {
    let big = createMatch([{ kind: 'HUMAN', label: 'Pat' }, { kind: 'COMPUTER', label: 'Computer 1' }], 0);
    big = { ...big, log: Array.from({ length: 50 }, (_, n) => ({ n, text: 'x'.repeat(300) })), logCount: 50 };
    save(settings(1), big, 5);
    expect(localStorage.getItem(SAVE_KEY)!.length).toBeLessThanOrEqual(10_000);
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadSaved(6)).toBeNull();
    localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: 5, settings: settings(1), state: { seats: [] } }));
    expect(loadSaved(6)).toBeNull();
    expect(isMatchState({})).toBe(false);
  });

  it('remembers the last set-up choices and falls back to the defaults', () => {
    expect(loadSetup()).toEqual({ opponents: 1, difficulty: 'normal', theme: 'classic' });
    saveSetup({ opponents: 3, difficulty: 'hard', theme: 'diwali' });
    expect(loadSetup()).toEqual({ opponents: 3, difficulty: 'hard', theme: 'diwali' });
    localStorage.setItem('myarena-ludo-solo-setup', JSON.stringify({ opponents: 9 }));
    expect(loadSetup().opponents).toBe(1);
  });
});

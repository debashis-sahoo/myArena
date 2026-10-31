import { describe, expect, it } from 'vitest';
import { setup } from './ludo-helpers.js';

const roll = { type: 'roll' };
const moveOf = (pawn: number) => ({ type: 'move', payload: { pawn } });
type Event = { kind: string; seat?: number; reason?: string; pawn?: number; value?: number; durationMs?: number };
const events = (published: unknown[][]) => published.flat() as Event[];
const kinds = (published: unknown[][]) => events(published).map((event) => event.kind);

describe('decision timers', () => {
  it('starts a timer for the roll and counts it down in the view', () => {
    const { clock, matchView } = setup({ limit: 30 });
    expect(matchView(0).turn.decisionMsLeft).toBe(30_000);
    clock.advance(10_000);
    expect(matchView(1).turn.decisionMsLeft).toBe(20_000);
  });

  it('starts a new timer for the move once the die has settled, and cancels it when the seat acts', () => {
    const { runner, clock, matchView, published, idOf: id } = setup({ limit: 30, values: [6] });
    clock.advance(5_000);
    runner.act(id(0), roll);
    // The move timer begins when the die settles (2.4 s), so 32.4 s remain at the moment of the roll.
    expect(matchView(0).turn.decisionMsLeft).toBe(32_400);
    clock.advance(2_400 + 8_000);
    runner.act(id(0), moveOf(0));
    // A 6 earns another roll, which gets its own full timer; the old one never fires.
    expect(matchView(0).turn).toMatchObject({ phase: 'ROLL', decisionMsLeft: 30_000 });
    clock.advance(29_999);
    expect(kinds(published)).not.toContain('AUTO_PLAYED');
  });

  it('creates no timer when the limit is "no limit"', () => {
    const { clock, matchView, published } = setup({ limit: 0 });
    expect(matchView(0).turn.decisionMsLeft).toBeNull();
    const before = published.length;
    clock.advance(60 * 60 * 1000);
    expect(published).toHaveLength(before);
  });

  it('rolls with the same die and animation on a timeout, then moves after the die settles', () => {
    const { clock, published, state, matchView } = setup({ limit: 30, values: [6, 3] });
    clock.advance(30_000);
    const first = published.at(-1) as Event[];
    expect(first.map((event) => event.kind)).toEqual(['AUTO_PLAYED', 'ROLLED']);
    expect(first[0]).toMatchObject({ seat: 0, reason: 'TIMEOUT' });
    expect(first[1]).toMatchObject({ seat: 0, value: 6, durationMs: 2400 });
    expect(state().seats[0]).toMatchObject({ missed: 1, away: false });
    expect(matchView(0).turn.settleMsLeft).toBe(2400);

    clock.advance(2_999);
    expect(published.at(-1)).toBe(first);
    clock.advance(1);
    const second = published.at(-1) as Event[];
    expect(second.map((event) => event.kind)).toEqual(['AUTO_PLAYED', 'MOVED']);
    expect(second[0]).toMatchObject({ seat: 0, reason: 'TIMEOUT', pawn: 0 });
  });

  it('plays the move for a seat that rolled but did not choose a pawn', () => {
    const { runner, clock, published, state, idOf: id } = setup({ limit: 30, values: [6] });
    runner.act(id(0), roll);
    clock.advance(2_400 + 30_000);
    const last = published.at(-1) as Event[];
    expect(last.map((event) => event.kind)).toEqual(['AUTO_PLAYED', 'MOVED']);
    expect(last[0]).toMatchObject({ reason: 'TIMEOUT', pawn: 0 });
    expect(state().seats[0]!.missed).toBe(1);
  });
});

describe('away', () => {
  /** Seat 0 never acts; seat 1 rolls a 3 each time (no legal move), so the turn returns to seat 0. */
  function threeTimeouts() {
    const context = setup({ players: 2, limit: 30, values: [3] });
    const { runner, clock, idOf: id } = context;
    for (let miss = 1; miss <= 3; miss += 1) {
      clock.advance(30_000 + 3_600);
      expect(context.state().seats[0]!.missed).toBe(miss);
      expect(context.state().current).toBe(1);
      runner.act(id(1), roll);
      clock.advance(3_600);
    }
    return context;
  }

  it('marks a seat away on the third timeout in a row', () => {
    const { state, published } = threeTimeouts();
    expect(state().seats[0]).toMatchObject({ missed: 3, away: true });
    expect(kinds(published)).toContain('AWAY_SET');
    expect(events(published).filter((event) => event.kind === 'AUTO_PLAYED')).toHaveLength(3);
  });

  it('plays an away seat after a 600 ms pause, with no timer to wait for', () => {
    const { clock, published, state, matchView } = threeTimeouts();
    expect(state().current).toBe(0);
    expect(matchView(1).turn.decisionMsLeft).toBeNull();
    const before = published.length;
    clock.advance(599);
    expect(published).toHaveLength(before);
    clock.advance(1);
    const played = published.at(-1) as Event[];
    expect(played.map((event) => event.kind)).toEqual(['AUTO_PLAYED', 'ROLLED']);
    expect(played[0]).toMatchObject({ seat: 0, reason: 'AWAY' });
  });

  it('is cleared by "I\'m back" and by any manual action', () => {
    const away = threeTimeouts();
    expect(away.runner.act(away.idOf(0), { type: 'resume' })).toEqual({ accepted: true });
    expect(events(away.published).at(-1)).toMatchObject({ kind: 'AWAY_CLEARED', seat: 0 });
    expect(away.state().seats[0]).toMatchObject({ missed: 0, away: false });
    expect(away.runner.act(away.idOf(0), { type: 'resume' })).toMatchObject({ accepted: false, reason: 'NOT_AWAY' });

    const manual = threeTimeouts();
    manual.clock.advance(300);
    expect(manual.runner.act(manual.idOf(0), roll)).toEqual({ accepted: true });
    expect(kinds([manual.published.at(-1)!])).toEqual(['AWAY_CLEARED', 'ROLLED']);
    expect(manual.state().seats[0]).toMatchObject({ missed: 0, away: false });
    // The pending automatic roll was cancelled: nothing further is played for them.
    const count = manual.published.length;
    manual.clock.advance(400);
    expect(manual.published).toHaveLength(count);
  });

  it('resets missed turns when the seat acts manually before becoming away', () => {
    const { runner, clock, state, idOf: id } = setup({ players: 2, limit: 30, values: [3] });
    clock.advance(30_000 + 3_600);
    expect(state().seats[0]!.missed).toBe(1);
    runner.act(id(1), roll);
    clock.advance(3_600);
    runner.act(id(0), roll);
    expect(state().seats[0]!.missed).toBe(0);
  });
});

describe('a seat leaving', () => {
  it('removes the seat and keeps the others playing', () => {
    const { runner, published, state, idOf: id } = setup({ players: 3, limit: 0 });
    runner.participantLeft(id(2));
    expect(events(published).at(-1)).toMatchObject({ kind: 'SEAT_LEFT', seat: 2 });
    expect(state().seats[2]).toMatchObject({ left: true, pawns: [] });
    expect(state().current).toBe(0);
  });

  it('passes the turn when it was theirs, with a fresh timer', () => {
    const { runner, published, state, matchView, idOf: id } = setup({ players: 3, limit: 30 });
    runner.participantLeft(id(0));
    expect(kinds([published.at(-1)!])).toEqual(['SEAT_LEFT', 'TURN']);
    expect(state().current).toBe(1);
    expect(matchView(1).turn.decisionMsLeft).toBe(30_000);
  });

  it('declares the last remaining seat the winner and ends the match', () => {
    const { runner, ended, published, state, idOf: id } = setup({ players: 2, limit: 30 });
    runner.participantLeft(id(0));
    expect(kinds([published.at(-1)!])).toEqual(['SEAT_LEFT', 'WON']);
    expect(state()).toMatchObject({ winner: 1, phase: 'ENDED' });
    expect(ended).toHaveLength(1);
  });

  it('ignores a member without a seat', () => {
    const { runner, published } = setup({ players: 2 });
    const before = published.length;
    runner.participantLeft('someone-else');
    expect(published).toHaveLength(before);
  });
});

describe('clean-up', () => {
  it('clears every timer when the match ends and when it is released', () => {
    const won = setup({ players: 2, limit: 30 });
    won.runner.participantLeft(won.idOf(0));
    const afterEnd = won.published.length;
    won.clock.advance(10 * 60 * 1000);
    expect(won.published).toHaveLength(afterEnd);

    const released = setup({ limit: 30 });
    released.runner.stop();
    const count = released.published.length;
    released.clock.advance(10 * 60 * 1000);
    expect(released.published).toHaveLength(count);
  });
});

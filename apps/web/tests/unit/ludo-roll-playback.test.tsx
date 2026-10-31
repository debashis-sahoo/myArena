import { cleanup, render, renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, legalPawns, toMatchView, type LudoMatchView } from '@myarena/ludo';
import { RollPlayback, useRollPlayback } from '../../src/features/ludo/match/rollPlayback';
import { BoardView } from '../../src/features/ludo/view/BoardView';

const announce = vi.fn();
vi.mock('../../src/a11y/announcer', () => ({ useAnnouncer: () => announce }));

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] }); announce.mockClear(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const rolled = (value: number, seat = 0, seed = 7) => ({ kind: 'ROLLED', seat, value, seed, durationMs: 2400 });
const make = (instant = false) => {
  const said: string[] = [];
  const playback = new RollPlayback({ instant: () => instant, announce: (text, seat) => said.push(`${seat}:${text}`) });
  return { playback, said };
};

describe('RollPlayback', () => {
  it('starts a throw for a ROLLED event and settles it when the animation ends', () => {
    const { playback } = make();
    playback.handle([rolled(4)]);
    expect(playback.getSnapshot().active).toMatchObject({ face: 4, seed: 7, durationMs: 2400, seat: 0 });
    expect(playback.getSnapshot().face).toBeNull();
    vi.advanceTimersByTime(2399);
    expect(playback.getSnapshot().active).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(playback.getSnapshot()).toEqual({ active: null, face: 4 });
  });

  it('announces the roll when it settles, not when it starts, and only once', () => {
    const { playback, said } = make();
    playback.handle([rolled(6, 1)]);
    expect(said).toEqual([]);
    vi.advanceTimersByTime(2400);
    expect(said).toEqual(['1:rolled a 6']);
    vi.advanceTimersByTime(5000);
    playback.skip();
    expect(said).toHaveLength(1);
  });

  it('skips for this viewer only: another viewer keeps rolling', () => {
    const mine = make();
    const theirs = make();
    mine.playback.handle([rolled(3)]);
    theirs.playback.handle([rolled(3)]);
    vi.advanceTimersByTime(600);
    mine.playback.skip();
    expect(mine.playback.getSnapshot()).toEqual({ active: null, face: 3 });
    expect(theirs.playback.getSnapshot().active).not.toBeNull();
    vi.advanceTimersByTime(1800);
    expect(theirs.playback.getSnapshot()).toEqual({ active: null, face: 3 });
    expect(mine.said).toEqual(['0:rolled a 3']);
  });

  it('reveals the face at once when motion is off, with the announcement', () => {
    const { playback, said } = make(true);
    playback.handle([rolled(5)]);
    expect(playback.getSnapshot()).toEqual({ active: null, face: 5 });
    expect(said).toEqual(['0:rolled a 5']);
  });

  it('shows a settled face without a replay when it is seeded from a state', () => {
    const { playback, said } = make();
    playback.rest(2);
    expect(playback.getSnapshot()).toEqual({ active: null, face: 2 });
    expect(said).toEqual([]);
  });

  it('lets a newer roll settle the previous one at once, and shows the settled die for a hidden page', () => {
    const { playback, said } = make();
    playback.handle([rolled(2)]);
    playback.handle([rolled(6, 1, 9)]);
    expect(playback.getSnapshot().active).toMatchObject({ face: 6, seat: 1 });
    expect(said).toEqual(['0:rolled a 2']);
    playback.hide();
    expect(playback.getSnapshot()).toEqual({ active: null, face: 6 });
    playback.handle([rolled(1)], true);
    expect(playback.getSnapshot()).toEqual({ active: null, face: 1 });
  });

  it('ignores events that are not valid rolls', () => {
    const { playback } = make();
    playback.handle([{ kind: 'ROLLED', seat: 0, value: 9, seed: 1, durationMs: 2400 }, { kind: 'TURN', seat: 1 }, null, 'x', { kind: 'ROLLED', seat: 0, value: 3 }]);
    expect(playback.getSnapshot()).toEqual({ active: null, face: null });
  });
});

describe('useRollPlayback', () => {
  const state = createMatch([{ kind: 'HUMAN', label: 'Alex', participantId: 'a' }, { kind: 'HUMAN', label: 'Sam', participantId: 's' }], 0);
  const view = (dice: number | null): LudoMatchView => {
    const base = toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
    return { ...base, turn: { ...base.turn, dice } };
  };

  it('plays a live roll, and a snapshot during the roll shows the settled die with no replay', () => {
    const { result, rerender } = renderHook(({ v, seq, events }) => useRollPlayback(v, seq, events, false), { initialProps: { v: view(null), seq: 1, events: [] as unknown[] } });
    expect(result.current).toMatchObject({ rolling: false, face: null });
    rerender({ v: view(4), seq: 2, events: [rolled(4)] });
    expect(result.current.rolling).toBe(true);
    expect(result.current.face).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2400); });
    expect(result.current).toMatchObject({ rolling: false, face: 4 });
    expect(announce).toHaveBeenCalledWith('You rolled a 4.');

    // A snapshot (no events) in the middle of another roll: no replay, the die is simply settled.
    rerender({ v: view(2), seq: 3, events: [rolled(2)] });
    expect(result.current.rolling).toBe(true);
    rerender({ v: view(2), seq: 4, events: [] });
    expect(result.current).toMatchObject({ rolling: false, face: 2 });
  });

  it('reveals at once under reduced motion', () => {
    const { result, rerender } = renderHook(({ v, seq, events }) => useRollPlayback(v, seq, events, true), { initialProps: { v: view(null), seq: 1, events: [] as unknown[] } });
    rerender({ v: view(6), seq: 2, events: [rolled(6)] });
    expect(result.current).toMatchObject({ rolling: false, face: 6 });
  });
});

describe('data-die-face', () => {
  const state = createMatch([{ kind: 'HUMAN', label: 'Alex', participantId: 'a' }, { kind: 'HUMAN', label: 'Sam', participantId: 's' }], 0);
  const base = toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });

  it('is empty while the die rolls and holds the number after', () => {
    localStorage.setItem('myarena-ludo-quality', 'lite');
    const props = { view: base, settled: true, onChoose: () => undefined, throwing: null, events: [], seq: 1, instant: false };
    const { container, rerender } = render(<BoardView {...props} face={4} rolling />);
    expect(container.querySelector('.ludo-board')?.getAttribute('data-die-face')).toBe('');
    rerender(<BoardView {...props} face={4} rolling={false} />);
    expect(container.querySelector('.ludo-board')?.getAttribute('data-die-face')).toBe('4');
  });
});

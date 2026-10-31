import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, legalPawns, toMatchView, type LudoMatchView } from '@myarena/ludo';
import { useHops } from '../../src/features/ludo/match/useHops';
import { placePawns } from '../../src/features/ludo/view/placement';

const state = createMatch([{ kind: 'HUMAN', label: 'Alex', participantId: 'a' }, { kind: 'HUMAN', label: 'Sam', participantId: 's' }], 0);
const base = toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
const withPawn = (step: number): LudoMatchView => ({ ...base, seats: base.seats.map((seat, index) => (index === 0 ? { ...seat, pawns: [step, ...seat.pawns.slice(1)] } : seat)) });
const moved = (from: number, to: number) => [{ kind: 'MOVED', seat: 0, pawn: 0, from, to }];

describe('hop playback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const render = (instant = false) => renderHook(
    ({ view, seq, events }) => useHops(placePawns(view, new Set()), seq, events, instant),
    { initialProps: { view: withPawn(3), seq: 1, events: undefined as readonly unknown[] | undefined } },
  );

  it('plays a live move as hops and then rests', () => {
    const { result, rerender } = render();
    expect(result.current).toBeNull();
    rerender({ view: withPawn(6), seq: 2, events: moved(3, 6) });
    expect(result.current?.has('0:0')).toBe(true);
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current?.get('0:0')?.lift).toBeGreaterThan(0);
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current).toBeNull();
  });

  it('places pins at once for instant motion and for a snapshot without events', () => {
    const instant = render(true);
    instant.rerender({ view: withPawn(6), seq: 2, events: moved(3, 6) });
    expect(instant.result.current).toBeNull();
    const snapshot = render();
    snapshot.rerender({ view: withPawn(6), seq: 2, events: [] });
    expect(snapshot.result.current).toBeNull();
  });

  it('finishes a move in progress when a new live move arrives', () => {
    const { result, rerender } = render();
    rerender({ view: withPawn(6), seq: 2, events: moved(3, 6) });
    act(() => { vi.advanceTimersByTime(250); });
    rerender({ view: withPawn(8), seq: 3, events: moved(6, 8) });
    const first = result.current?.get('0:0');
    expect(first?.lift).toBe(0);
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBeNull();
  });
});

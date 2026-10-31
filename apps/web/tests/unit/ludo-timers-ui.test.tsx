import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, legalPawns, recordMiss, toMatchView, type LudoMatchView } from '@myarena/ludo';
import { MatchView } from '../../src/features/ludo/match/MatchView';
import { TIMEOUT_NOTICE, useRoomGame } from '../../src/features/ludo/match/useRoomGame';

const announce = vi.fn();
vi.mock('../../src/a11y/announcer', () => ({ useAnnouncer: () => announce }));

beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] }); announce.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const base = createMatch([{ kind: 'HUMAN', label: 'Alex', participantId: 'a' }, { kind: 'HUMAN', label: 'Sam', participantId: 's' }], 0);
const viewFor = (you: number, decisionMsLeft: number | null, state = base): LudoMatchView =>
  toMatchView(state, { theme: 'classic', turnLimitSeconds: 30, you, legalPawns: legalPawns(state), decisionMsLeft, settleMsLeft: 0 });
const noop = () => undefined;
const props = { error: null, onRoll: noop, onMove: noop };

describe('the countdown', () => {
  it('shows the time left, counted down from when the update arrived, and shows nothing without a limit', () => {
    const { rerender } = render(<MatchView view={viewFor(0, 30_000)} seq={1} {...props} />);
    expect(screen.getByText('Time left: 30 s')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4_100); });
    expect(screen.getByText('Time left: 26 s')).toBeInTheDocument();
    rerender(<MatchView view={viewFor(0, 12_000)} seq={2} {...props} />);
    expect(screen.getByText('Time left: 12 s')).toBeInTheDocument();
    rerender(<MatchView view={viewFor(0, null)} seq={3} {...props} />);
    expect(screen.queryByText(/Time left/)).toBeNull();
  });

  it('caps the server figure, which includes the roll animation, at the turn limit', () => {
    render(<MatchView view={viewFor(0, 32_400)} seq={1} {...props} />);
    expect(screen.getByText('Time left: 30 s')).toBeInTheDocument();
  });

  it('speaks only at 10 and 5 seconds, and only for the viewer', () => {
    render(<MatchView view={viewFor(0, 12_000)} seq={1} {...props} />);
    expect(announce).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2_100); });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('10 seconds left to roll.');
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith('5 seconds left to roll.');
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(announce).toHaveBeenCalledTimes(2);

    cleanup();
    announce.mockClear();
    render(<MatchView view={viewFor(1, 12_000)} seq={1} {...props} />);
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('the away banner', () => {
  const away = recordMiss(recordMiss(recordMiss(base, 0).state, 0).state, 0).state;

  it('is shown only to the viewer of an away seat and sends "I\'m back"', () => {
    const onResume = vi.fn();
    render(<MatchView view={viewFor(0, null, away)} seq={1} {...props} onResume={onResume} />);
    fireEvent.click(screen.getByRole('button', { name: "I'm back" }));
    expect(onResume).toHaveBeenCalledTimes(1);
    cleanup();
    render(<MatchView view={viewFor(1, null, away)} seq={1} {...props} onResume={onResume} />);
    expect(screen.queryByRole('button', { name: "I'm back" })).toBeNull();
  });

  it('is absent when the seat is not away and in solo matches', () => {
    render(<MatchView view={viewFor(0, null)} seq={1} {...props} onResume={noop} />);
    expect(screen.queryByRole('button', { name: "I'm back" })).toBeNull();
    cleanup();
    render(<MatchView view={viewFor(0, null, away)} seq={1} {...props} />);
    expect(screen.queryByRole('button', { name: "I'm back" })).toBeNull();
  });
});

describe('the timeout notice', () => {
  const game = (events: unknown[], seq: number) => ({ matchId: 'm', seq, state: viewFor(0, 30_000), events });

  it('appears when the game played for the viewer, is announced, and fades after a while', () => {
    const run = vi.fn(async () => null);
    const { result, rerender } = renderHook(({ state }) => useRoomGame(state, run), { initialProps: { state: game([], 1) } });
    expect(result.current.notice).toBeNull();
    rerender({ state: game([{ kind: 'AUTO_PLAYED', seat: 0, reason: 'TIMEOUT' }, { kind: 'ROLLED', seat: 0, value: 6, seed: 1, durationMs: 2400 }], 2) });
    expect(result.current.notice).toBe(TIMEOUT_NOTICE);
    expect(announce).toHaveBeenCalledWith(TIMEOUT_NOTICE);
    act(() => { vi.advanceTimersByTime(10_001); });
    expect(result.current.notice).toBeNull();
  });

  it('ignores automatic play for other seats, away play, and states without events', () => {
    const run = vi.fn(async () => null);
    const { result, rerender } = renderHook(({ state }) => useRoomGame(state, run), { initialProps: { state: game([{ kind: 'AUTO_PLAYED', seat: 1, reason: 'TIMEOUT' }], 1) } });
    expect(result.current.notice).toBeNull();
    rerender({ state: game([{ kind: 'AUTO_PLAYED', seat: 0, reason: 'AWAY' }], 2) });
    expect(result.current.notice).toBeNull();
    rerender({ state: game([], 3) });
    expect(result.current.notice).toBeNull();
  });
});

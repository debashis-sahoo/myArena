import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, legalPawns, recordMiss, removeSeat, roll, toMatchView, type LudoMatchView, type MatchState } from '@myarena/ludo';
import { announcementFor, describeBoard, describeSeat } from '../../src/features/ludo/a11y/describe';
import { useAnnouncements } from '../../src/features/ludo/match/useAnnouncements';

const announce = vi.fn();
vi.mock('../../src/a11y/announcer', () => ({ useAnnouncer: () => announce }));
beforeEach(() => announce.mockClear());

const people = (count: number) => Array.from({ length: count }, (_, index) => ({ kind: 'HUMAN' as const, label: ['Alex', 'Sam', 'Kim', 'Lee'][index]!, participantId: `p${index}` }));
const viewOf = (state: MatchState, you: number | null = 0): LudoMatchView =>
  toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
const put = (state: MatchState, seat: number, pawns: number[]): MatchState => { const next = structuredClone(state); next.seats[seat]!.pawns = pawns; return next; };

describe('the board description', () => {
  it('lists each seat in turn order with pawns in base, on the path and home', () => {
    let state = createMatch(people(3), 0);
    state = put(state, 0, [-1, -1, 14, 56]);
    state = put(state, 1, [0, 52, -1, -1]);
    const lines = describeBoard(viewOf(state, 0));
    expect(lines[0]).toBe('Red, Alex (you), 2 pawns in base, 1 pawn 14 steps from start, 1 pawn home');
    expect(lines[1]).toBe('Green, Sam, 2 pawns in base, 1 pawn on its start square, 1 pawn in its home lane, 2 of 5');
    expect(lines[2]).toBe('Yellow, Kim, 4 pawns in base');
    expect(lines).toHaveLength(4);
    expect(lines.at(-1)).toBe('Your turn: roll the die.');
  });

  it('marks away and left seats', () => {
    let state = createMatch(people(3), 0);
    state = recordMiss(recordMiss(recordMiss(state, 1).state, 1).state, 1).state;
    state = removeSeat(state, 2).state;
    const view = viewOf(state, 0);
    expect(describeSeat(view, 1)).toMatch(/, away$/);
    expect(describeSeat(view, 2)).toBe('Yellow, Kim, left the match');
  });

  it('follows the state: a roll changes the final line', () => {
    const state = createMatch(people(2), 0);
    expect(describeBoard(viewOf(state)).at(-1)).toBe('Your turn: roll the die.');
    expect(describeBoard(viewOf(roll(state, 3).state)).at(-1)).toBe('You rolled a 3. No pawn can move.');
  });
});

describe('announcements', () => {
  const view = viewOf(createMatch(people(2), 0), 0);

  it('has text for moves, captures, automatic play, away, return, departure and the result', () => {
    expect(announcementFor(view, [{ kind: 'MOVED', seat: 1, pawn: 1, from: 14, to: 18 }])).toBe('Sam moved pawn 2 from 14 steps to 18 steps.');
    expect(announcementFor(view, [{ kind: 'MOVED', seat: 0, pawn: 0, from: -1, to: 0 }])).toBe('You moved pawn 1 from base to 0 steps.');
    expect(announcementFor(view, [{ kind: 'MOVED', seat: 1, pawn: 1, from: 14, to: 18, captured: { seat: 0, pawn: 2 } }])).toBe('Sam moved pawn 2 from 14 steps to 18 steps and captured your pawn.');
    expect(announcementFor(viewOf(createMatch(people(3), 0), 0), [{ kind: 'MOVED', seat: 1, pawn: 1, from: 14, to: 18, captured: { seat: 2, pawn: 0 } }])).toBe("Sam moved pawn 2 from 14 steps to 18 steps and captured Kim's pawn.");
    expect(announcementFor(view, [{ kind: 'AUTO_PLAYED', seat: 1, reason: 'TIMEOUT' }])).toBe('Sam ran out of time, so the game played for them.');
    expect(announcementFor(view, [{ kind: 'AUTO_PLAYED', seat: 1, reason: 'AWAY' }])).toBe('Sam is away, so the game played for them.');
    expect(announcementFor(view, [{ kind: 'AWAY_SET', seat: 1 }])).toBe('Sam is away.');
    expect(announcementFor(view, [{ kind: 'AWAY_CLEARED', seat: 1 }])).toBe('Sam is back.');
    expect(announcementFor(view, [{ kind: 'SEAT_LEFT', seat: 1 }])).toBe('Sam left the match.');
    expect(announcementFor(view, [{ kind: 'WON', seat: 0 }])).toBe('You won the match.');
  });

  it('says nothing for turn changes and rolls, which the status line and the die announce', () => {
    expect(announcementFor(view, [{ kind: 'TURN', seat: 1 }, { kind: 'ROLLED', seat: 1, value: 4, seed: 1, durationMs: 2400 }, { kind: 'NO_MOVE', seat: 1, value: 3 }])).toBeNull();
  });

  it('speaks at most once per state change, with every event of that change in one message', () => {
    const { rerender } = renderHook(({ seq, events }) => useAnnouncements(view, seq, events), { initialProps: { seq: 1, events: [] as unknown[] } });
    expect(announce).not.toHaveBeenCalled();
    rerender({ seq: 2, events: [{ kind: 'AUTO_PLAYED', seat: 1, reason: 'TIMEOUT' }, { kind: 'MOVED', seat: 1, pawn: 0, from: 3, to: 7 }, { kind: 'AWAY_SET', seat: 1 }] });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Sam ran out of time, so the game played for them. Sam moved pawn 1 from 3 steps to 7 steps. Sam is away.');
    rerender({ seq: 2, events: [{ kind: 'WON', seat: 0 }] });
    expect(announce).toHaveBeenCalledTimes(1);
    rerender({ seq: 3, events: [] });
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('does not replay old events when the first state is a snapshot', () => {
    renderHook(() => useAnnouncements(view, 5, [{ kind: 'MOVED', seat: 1, pawn: 0, from: 3, to: 7 }]));
    expect(announce).not.toHaveBeenCalled();
  });
});

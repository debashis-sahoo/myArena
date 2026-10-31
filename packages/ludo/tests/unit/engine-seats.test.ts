import { describe, expect, it } from 'vitest';
import { autoChoice, createMatch, legalPawns, move, recordMiss, removeSeat, resume, roll, type MatchState } from '../../src/index.js';

const people = (count: number) => Array.from({ length: count }, (_, index) => ({ kind: 'HUMAN' as const, label: `P${index}`, participantId: `id-${index}` }));
const rolled = (state: MatchState, value: number): MatchState => roll(state, value).state;
const put = (state: MatchState, seat: number, pawns: number[]): MatchState => {
  const next = structuredClone(state);
  next.seats[seat]!.pawns = pawns;
  return next;
};

describe('removeSeat', () => {
  it('removes the seat pawns and keeps the others playing', () => {
    const state = createMatch(people(3), 1);
    const { state: next, events } = removeSeat(state, 0);
    expect(next.seats[0]).toMatchObject({ left: true, away: false, pawns: [] });
    expect(next.current).toBe(1);
    expect(events).toEqual([{ kind: 'SEAT_LEFT', seat: 0 }]);
    expect(next.log.at(-1)!.text).toBe('P0 left the match.');
  });

  it('passes the turn when it was theirs, skipping seats that already left', () => {
    let state = createMatch(people(4), 1);
    state = removeSeat(state, 2).state;
    const { state: next, events } = removeSeat(state, 1);
    expect(next.current).toBe(3);
    expect(next.phase).toBe('ROLL');
    expect(events).toEqual([{ kind: 'SEAT_LEFT', seat: 1 }, { kind: 'TURN', seat: 3 }]);
  });

  it('drops a pending roll when the seat to move leaves', () => {
    const state = rolled(createMatch(people(3), 0), 6);
    const { state: next } = removeSeat(state, 0);
    expect(next).toMatchObject({ current: 1, phase: 'ROLL', dice: null, sixesInRow: 0 });
  });

  it('declares the last remaining seat the winner', () => {
    const state = createMatch(people(2), 0);
    const { state: next, events } = removeSeat(state, 0);
    expect(next).toMatchObject({ winner: 1, phase: 'ENDED', current: null });
    expect(events).toEqual([{ kind: 'SEAT_LEFT', seat: 0 }, { kind: 'WON', seat: 1 }]);
    expect(removeSeat(next, 1).events).toEqual([]);
  });

  it('does nothing for a seat that already left', () => {
    const state = removeSeat(createMatch(people(3), 0), 2).state;
    expect(removeSeat(state, 2).events).toEqual([]);
  });
});

describe('missed turns and resume', () => {
  it('counts one miss per timeout and sets away on the third', () => {
    let state = createMatch(people(2), 0);
    let result = recordMiss(state, 0);
    expect([result.state.seats[0]!.missed, result.state.seats[0]!.away, result.away]).toEqual([1, false, false]);
    result = recordMiss(result.state, 0);
    expect([result.state.seats[0]!.missed, result.away]).toEqual([2, false]);
    result = recordMiss(result.state, 0);
    expect([result.state.seats[0]!.missed, result.state.seats[0]!.away, result.away]).toEqual([3, true, true]);
    state = result.state;
    expect(recordMiss(state, 0).away).toBe(false);
  });

  it('clears both counters on resume and says whether the seat was away', () => {
    let state = createMatch(people(2), 0);
    state = recordMiss(recordMiss(state, 0).state, 0).state;
    let result = resume(state, 0);
    expect(result).toMatchObject({ cleared: false });
    expect(result.state.seats[0]).toMatchObject({ missed: 0, away: false });
    state = recordMiss(recordMiss(recordMiss(state, 0).state, 0).state, 0).state;
    result = resume(state, 0);
    expect(result.cleared).toBe(true);
    expect(result.state.seats[0]).toMatchObject({ missed: 0, away: false });
    expect(resume(result.state, 0).state).toBe(result.state);
  });
});

describe('autoChoice', () => {
  it('returns null when nothing can move', () => {
    expect(autoChoice(rolled(createMatch(people(2), 0), 3))).toBeNull();
  });

  it('prefers a capture', () => {
    // Red pawn 2 moves 4 to ring 24... put a Yellow pawn there (Yellow start 26: step 50 is ring 24).
    let state = createMatch(people(2), 0);
    state = put(state, 0, [30, 20, -1, -1]);
    state = put(state, 1, [-1, 50, -1, -1]);
    const result = autoChoice(rolled(state, 4));
    expect(result).toBe(1);
    expect(move(rolled(state, 4), result!).events[0]).toMatchObject({ captured: { seat: 1, pawn: 1 } });
  });

  it('otherwise moves the pawn furthest along', () => {
    let state = createMatch(people(2), 0);
    state = put(state, 0, [5, 40, 12, -1]);
    expect(autoChoice(rolled(state, 2))).toBe(1);
  });

  it('otherwise takes the lowest pawn index when pawns are level, and brings a pawn out on a 6', () => {
    let state = createMatch(people(2), 0);
    state = put(state, 0, [10, 10, 10, 10]);
    expect(autoChoice(rolled(state, 3))).toBe(0);
    expect(autoChoice(rolled(createMatch(people(2), 0), 6))).toBe(0);
    expect(legalPawns(rolled(createMatch(people(2), 0), 6))).toEqual([0, 1, 2, 3]);
  });
});

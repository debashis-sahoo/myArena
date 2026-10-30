import { describe, expect, it } from 'vitest';
import {
  advance, createMatch, isProtectedRing, isStuck, legalPawns, move, ringIndexOf, roll,
  type MatchState,
} from '../../src/index.js';

const people = (count: number) => Array.from({ length: count }, (_, index) => ({ kind: 'HUMAN' as const, label: `P${index + 1}` }));
const start = (count = 4, first = 0): MatchState => createMatch(people(count), first);
const put = (state: MatchState, seat: number, pawns: number[]): MatchState => {
  const next = structuredClone(state);
  next.seats[seat]!.pawns = pawns;
  return next;
};
const rolled = (state: MatchState, value: number) => roll(state, value).state;

describe('leaving base and extra rolls', () => {
  it('lets a pawn leave base only on a 6, placing it on the start square, and then rolls again', () => {
    const six = rolled(start(), 6);
    expect(legalPawns(six)).toEqual([0, 1, 2, 3]);
    const moved = move(six, 2);
    expect(moved.state.seats[0]!.pawns).toEqual([-1, -1, 0, -1]);
    expect(moved.state.phase).toBe('ROLL');
    expect(moved.state.current).toBe(0);
  });

  it('passes the turn when nothing can move and the roll is not a 6', () => {
    const three = rolled(start(), 3);
    expect(legalPawns(three)).toEqual([]);
    expect(isStuck(three)).toBe(true);
    const result = advance(three);
    expect(result.state.current).toBe(1);
    expect(result.state.phase).toBe('ROLL');
    expect(result.events.map((event) => event.kind)).toEqual(['NO_MOVE', 'TURN']);
  });

  it('still gives the extra roll for a 6 that cannot be used', () => {
    const stuck = rolled(put(start(), 0, [56, 56, 56, 55]), 6);
    expect(isStuck(stuck)).toBe(true);
    const result = advance(stuck);
    expect(result.state.current).toBe(0);
    expect(result.state.phase).toBe('ROLL');
    expect(result.events.map((event) => event.kind)).toEqual(['NO_MOVE']);
  });

  it('refuses an action in the wrong phase', () => {
    const state = start();
    expect(() => move(state, 0)).toThrow();
    expect(() => advance(state)).toThrow();
    expect(() => roll(rolled(state, 3), 3)).toThrow();
    expect(() => roll(state, 7)).toThrow(RangeError);
  });
});

describe('moving and finishing', () => {
  it('moves a pawn exactly the rolled number of squares', () => {
    const result = move(rolled(put(start(), 0, [10, -1, -1, -1]), 4), 0);
    expect(result.state.seats[0]!.pawns[0]).toBe(14);
    expect(result.events[0]).toMatchObject({ kind: 'MOVED', pawn: 0, from: 10, to: 14 });
  });

  it('needs an exact roll to finish and does not give an extra roll for reaching home', () => {
    expect(legalPawns(rolled(put(start(), 0, [52, -1, -1, -1]), 5))).toEqual([]);
    const home = move(rolled(put(start(), 0, [52, -1, -1, -1]), 4), 0);
    expect(home.state.seats[0]!.pawns[0]).toBe(56);
    expect(home.state.phase).toBe('ROLL');
    expect(home.state.current).toBe(1);
  });

  it('never moves a pawn that is already home', () => {
    expect(legalPawns(rolled(put(start(), 0, [56, -1, -1, -1]), 2))).toEqual([]);
  });

  it('ends the match when the fourth pawn gets home', () => {
    const win = move(rolled(put(start(), 0, [56, 56, 56, 53]), 3), 3);
    expect(win.state.winner).toBe(0);
    expect(win.state.phase).toBe('ENDED');
    expect(win.state.current).toBeNull();
    expect(win.events.map((event) => event.kind)).toEqual(['MOVED', 'WON']);
  });
});

describe('captures, protected squares and blocks', () => {
  it('captures a lone opponent pawn on an unprotected square, sends it to base and rolls again', () => {
    const state = put(put(start(), 0, [3, -1, -1, -1]), 1, [45, -1, -1, -1]);
    expect(ringIndexOf('RED', 6)).toBe(ringIndexOf('GREEN', 45));
    const result = move(rolled(state, 3), 0);
    expect(result.state.seats[1]!.pawns[0]).toBe(-1);
    expect(result.state.phase).toBe('ROLL');
    expect(result.state.current).toBe(0);
    expect(result.events[0]).toMatchObject({ captured: { seat: 1, pawn: 0 } });
  });

  it('never captures on a start or star square, where pawns of different colours share the square', () => {
    const star = move(rolled(put(put(start(), 0, [5, -1, -1, -1]), 1, [47, -1, -1, -1]), 3), 0);
    expect(isProtectedRing(8)).toBe(true);
    expect(star.state.seats[1]!.pawns[0]).toBe(47);
    expect(star.state.seats[0]!.pawns[0]).toBe(8);
    const onStart = move(rolled(put(put(start(), 0, [10, -1, -1, -1]), 1, [0, -1, -1, -1]), 3), 0);
    expect(onStart.state.seats[1]!.pawns[0]).toBe(0);
    expect(onStart.state.seats[0]!.pawns[0]).toBe(13);
  });

  it('refuses a landing on an opponent block but allows passing over it', () => {
    const state = put(put(start(), 0, [3, -1, -1, -1]), 1, [45, 45, -1, -1]);
    expect(legalPawns(rolled(state, 3))).toEqual([]);
    expect(legalPawns(rolled(state, 4))).toEqual([0]);
    expect(legalPawns(rolled(state, 6))).toEqual([0, 1, 2, 3]);
  });

  it('lets a seat stack its own pawns, forming its own block', () => {
    const state = put(start(), 0, [6, 3, -1, -1]);
    expect(legalPawns(rolled(state, 3))).toEqual([0, 1]);
    const joined = move(rolled(state, 3), 1);
    expect(joined.state.seats[0]!.pawns.slice(0, 2)).toEqual([6, 6]);
  });

  it('forms no block on protected squares', () => {
    const state = put(put(start(), 0, [10, -1, -1, -1]), 1, [0, 0, -1, -1]);
    expect(legalPawns(rolled(state, 3))).toEqual([0]);
  });

  it('treats home-lane steps as private squares', () => {
    for (const step of [51, 52, 53, 54, 55, 56]) expect(ringIndexOf('RED', step)).toBeNull();
  });
});

describe('three sixes in a row', () => {
  it('ends the turn without moving a pawn on the third 6', () => {
    let state = move(rolled(start(), 6), 0).state;
    state = move(rolled(state, 6), 1).state;
    state = rolled(state, 6);
    expect(legalPawns(state)).toEqual([]);
    expect(isStuck(state)).toBe(true);
    const result = advance(state);
    expect(result.state.current).toBe(1);
    expect(result.state.sixesInRow).toBe(0);
    expect(result.state.seats[0]!.pawns).toEqual([0, 0, -1, -1]);
  });

  it('resets the count when the turn passes normally', () => {
    let state = move(rolled(start(), 6), 0).state;
    expect(state.sixesInRow).toBe(1);
    state = move(rolled(state, 3), 0).state;
    expect(state.current).toBe(1);
    expect(state.sixesInRow).toBe(0);
  });
});

function lcg(seed: number): () => number {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 2 ** 32; };
}

function assertInvariants(state: MatchState): void {
  for (const seat of state.seats) {
    if (seat.pawns.length !== 4) throw new Error('A seat must have four pawns.');
    for (const step of seat.pawns) if (step < -1 || step > 56) throw new Error(`Pawn step ${step} is out of range.`);
  }
  for (let ring = 0; ring < 52; ring += 1) {
    const owners = new Set<number>();
    state.seats.forEach((seat, index) => seat.pawns.forEach((step) => { if (ringIndexOf(seat.color, step) === ring) owners.add(index); }));
    if (!isProtectedRing(ring) && owners.size > 1) throw new Error(`Ring square ${ring} is shared by different seats.`);
  }
}

describe('random playouts', () => {
  it('keeps every invariant and always ends with a winner over 2,000 seeded matches', () => {
    for (let seed = 1; seed <= 2000; seed += 1) {
      const random = lcg(seed);
      const players = 2 + (seed % 3);
      let state = start(players, seed % players);
      for (let guard = 0; state.phase !== 'ENDED'; guard += 1) {
        if (guard > 200_000) throw new Error('A random match did not finish.');
        if (state.phase === 'ROLL') state = roll(state, 1 + Math.floor(random() * 6)).state;
        else if (isStuck(state)) state = advance(state).state;
        else {
          const options = legalPawns(state);
          state = move(state, options[Math.floor(random() * options.length)]!).state;
        }
        if (guard % 25 === 0) assertInvariants(state);
      }
      assertInvariants(state);
      expect(state.winner).not.toBeNull();
      expect(state.seats[state.winner!]!.pawns.every((step) => step === 56)).toBe(true);
    }
  }, 60_000);
});

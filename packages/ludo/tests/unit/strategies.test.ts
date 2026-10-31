import { describe, expect, it, vi } from 'vitest';
import { advance, createMatch, isStuck, legalPawns, move, roll, chooseMove, DIFFICULTIES, type Difficulty, type MatchState } from '../../src/index.js';

const seats = [{ kind: 'HUMAN' as const, label: 'A' }, { kind: 'COMPUTER' as const, label: 'B' }];

function position(pawns: number[][], dice: number, count = seats.length): MatchState {
  const base = createMatch(seats.slice(0, count), 0);
  return { ...base, seats: base.seats.map((seat, index) => ({ ...seat, pawns: pawns[index] ?? seat.pawns })), phase: 'MOVE', dice };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('easy', () => {
  it('chooses uniformly among the legal pawns using only the random source', () => {
    const state = position([[10, 20, -1, 30], [-1, -1, -1, -1]], 3);
    expect(legalPawns(state)).toEqual([0, 1, 3]);
    expect(chooseMove(state, 'easy', () => 0)).toBe(0);
    expect(chooseMove(state, 'easy', () => 0.5)).toBe(1);
    expect(chooseMove(state, 'easy', () => 0.99)).toBe(3);
  });
});

describe('normal', () => {
  it('prefers a capture', () => {
    // Red step 5 + 2 lands on ring 7, where Yellow (start 26) stands at step 33.
    const state = position([[5, 20, -1, -1], [33, -1, -1, -1]], 2);
    expect(chooseMove(state, 'normal', () => 0)).toBe(0);
  });

  it('prefers reaching home over ordinary progress', () => {
    expect(chooseMove(position([[54, 10, -1, -1], [-1, -1, -1, -1]], 2), 'normal', () => 0)).toBe(0);
  });

  it('prefers leaving base to landing on another seat start square', () => {
    expect(chooseMove(position([[-1, 20, -1, -1], [-1, -1, -1, -1]], 6), 'normal', () => 0)).toBe(0);
  });

  it('values entering a home lane and a protected square', () => {
    // 48 + 4 = 52 enters the lane (+40); the other pawn moves 10 + 4 to ring 14 with no bonus.
    expect(chooseMove(position([[48, 10, -1, -1], [-1, -1, -1, -1]], 4), 'normal', () => 0)).toBe(0);
    // Step 4 + 4 = ring 8 (a star, +25) against 30 + 4 = 34 (no bonus): 8 + 25 = 33 < 34, so progress wins here.
    expect(chooseMove(position([[4, 30, -1, -1], [-1, -1, -1, -1]], 4), 'normal', () => 0)).toBe(1);
  });

  it('breaks ties toward the lowest index', () => {
    expect(chooseMove(position([[10, 10, 10, 10], [-1, -1, -1, -1]], 3), 'normal', () => 0)).toBe(0);
  });

  it('never uses the random source', () => {
    const random = vi.fn(() => 0);
    chooseMove(position([[10, 20, 30, 40], [-1, -1, -1, -1]], 3), 'normal', random);
    chooseMove(position([[10, 20, 30, 40], [-1, -1, -1, -1]], 3), 'hard', random);
    expect(random).not.toHaveBeenCalled();
  });
});

describe('hard', () => {
  it('avoids landing in reach of an opponent and prefers to move a threatened pawn', () => {
    // Red pawn at step 20 (ring 20) is 2 squares ahead of Green... here a Yellow pawn at ring 18 (step 44) is behind it.
    const state = position([[20, 3, -1, -1], [44, -1, -1, -1]], 2);
    // Normal pushes the front pawn (22 > 5); Hard sees ring 22 is 4 squares ahead of the Yellow pawn and takes the safer move.
    expect(chooseMove(state, 'normal', () => 0)).toBe(0);
    expect(chooseMove(state, 'hard', () => 0)).toBe(1);
  });
});

describe('every strategy', () => {
  function playout(seed: number, red: Difficulty, yellow: Difficulty, onMove?: (state: MatchState, pawn: number | null) => void): number | null {
    const random = mulberry32(seed);
    let state = createMatch(seats, seed % 2);
    const level = [red, yellow];
    for (let turns = 0; turns < 6000 && state.phase !== 'ENDED'; turns += 1) {
      if (state.phase === 'ROLL') { state = roll(state, 1 + Math.floor(random() * 6)).state; continue; }
      if (isStuck(state)) { onMove?.(state, null); state = advance(state).state; continue; }
      const pawn = chooseMove(state, level[state.current!]!, random);
      onMove?.(state, pawn);
      state = move(state, pawn!).state;
    }
    return state.winner;
  }

  it('never returns an illegal pawn across thousands of positions', () => {
    let checked = 0;
    for (let seed = 1; seed <= 60 && checked < 5000; seed += 1) {
      const level = DIFFICULTIES[seed % 3]!;
      playout(seed, level, DIFFICULTIES[(seed + 1) % 3]!, (state, pawn) => {
        checked += 1;
        if (pawn === null) expect(legalPawns(state)).toEqual([]);
        else expect(legalPawns(state)).toContain(pawn);
      });
    }
    expect(checked).toBeGreaterThanOrEqual(5000);
  });

  it('lets hard beat easy in at least 60% of 400 seeded one-on-one matches', () => {
    let hardWins = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const hardIsRed = seed % 2 === 0;
      const winner = playout(seed, hardIsRed ? 'hard' : 'easy', hardIsRed ? 'easy' : 'hard');
      if (winner === (hardIsRed ? 0 : 1)) hardWins += 1;
    }
    expect(hardWins / 400).toBeGreaterThanOrEqual(0.6);
  });
});

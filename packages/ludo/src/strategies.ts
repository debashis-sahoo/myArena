import { BASE, FIRST_LANE_STEP, HOME_STEP, RING_LENGTH, isProtectedRing, ringIndexOf } from './board.js';
import { legalPawns } from './engine.js';
import type { MatchState } from './state.js';

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

const CAPTURE = 100;
const HOME = 80;
const LEAVE_BASE = 60;
const ENTER_LANE = 40;
const PROTECTED_SQUARE = 25;
const BLOCK = 10;
const EXPOSED = 60;
const ESCAPE = 30;

function ownOthersOn(state: MatchState, seatIndex: number, pawn: number, ring: number): number {
  const seat = state.seats[seatIndex]!;
  return seat.pawns.filter((step, index) => index !== pawn && ringIndexOf(seat.color, step) === ring).length;
}

/** An opponent pawn stands 1 to 6 squares behind `ring`, so it could capture there next turn. */
function threatened(state: MatchState, seatIndex: number, ring: number): boolean {
  return state.seats.some((other, index) => index !== seatIndex && !other.left && other.pawns.some((step) => {
    const at = ringIndexOf(other.color, step);
    if (at === null) return false;
    const gap = (ring - at + RING_LENGTH) % RING_LENGTH;
    return gap >= 1 && gap <= 6;
  }));
}

/** On the ring, unprotected, not covered by a block of the mover's own, and in reach of an opponent. */
function exposed(state: MatchState, seatIndex: number, pawn: number, ring: number | null): boolean {
  if (ring === null || isProtectedRing(ring)) return false;
  if (ownOthersOn(state, seatIndex, pawn, ring) > 0) return false;
  return threatened(state, seatIndex, ring);
}

function scoreMove(state: MatchState, seatIndex: number, pawn: number, difficulty: Difficulty): number {
  const seat = state.seats[seatIndex]!;
  const from = seat.pawns[pawn]!;
  const roll = state.dice!;
  const to = from === BASE ? 0 : from + roll;
  const ring = ringIndexOf(seat.color, to);
  let score = to;
  if (to === HOME_STEP) score += HOME;
  if (from === BASE) score += LEAVE_BASE;
  if (from < FIRST_LANE_STEP && to >= FIRST_LANE_STEP && to < HOME_STEP) score += ENTER_LANE;
  if (ring !== null) {
    if (isProtectedRing(ring)) score += PROTECTED_SQUARE;
    else {
      const rival = state.seats.some((other, index) => index !== seatIndex && other.pawns.some((step) => ringIndexOf(other.color, step) === ring));
      if (rival) score += CAPTURE;
      if (ownOthersOn(state, seatIndex, pawn, ring) > 0) score += BLOCK;
    }
  }
  if (difficulty === 'hard') {
    if (exposed(state, seatIndex, pawn, ring)) score -= EXPOSED;
    if (exposed(state, seatIndex, pawn, ringIndexOf(seat.color, from))) score += ESCAPE;
  }
  return score;
}

/**
 * The pawn a computer moves, or null when none can move. It sees only the position and the die already rolled,
 * never a future die: `random` is used by Easy alone.
 */
export function chooseMove(state: MatchState, difficulty: Difficulty, random: () => number): number | null {
  const legal = legalPawns(state);
  if (legal.length === 0 || state.current === null) return null;
  if (difficulty === 'easy') return legal[Math.min(legal.length - 1, Math.floor(random() * legal.length))]!;
  const seatIndex = state.current;
  const pawns = state.seats[seatIndex]!.pawns;
  let best = legal[0]!;
  let bestScore = -Infinity;
  for (const pawn of legal) {
    const score = scoreMove(state, seatIndex, pawn, difficulty);
    const better = score > bestScore || (score === bestScore && (pawns[pawn]! > pawns[best]! || (pawns[pawn] === pawns[best] && pawn < best)));
    if (better) { best = pawn; bestScore = score; }
  }
  return best;
}

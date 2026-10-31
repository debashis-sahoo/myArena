import { BASE, isProtectedRing, ringIndexOf } from './board.js';
import { legalPawns } from './engine.js';
import type { MatchState } from './state.js';

/**
 * The pawn played for a seat that did not decide in time: capture if possible, otherwise the pawn furthest along,
 * otherwise the lowest pawn index. It looks only at the position and the die already rolled.
 */
export function autoChoice(state: MatchState): number | null {
  const legal = legalPawns(state);
  if (legal.length === 0 || state.current === null || state.dice === null) return null;
  const mover = state.current;
  const seat = state.seats[mover]!;
  const roll = state.dice;
  const captures = legal.filter((pawn) => {
    const step = seat.pawns[pawn]!;
    const ring = ringIndexOf(seat.color, step === BASE ? 0 : step + roll);
    if (ring === null || isProtectedRing(ring)) return false;
    return state.seats.some((other, index) => index !== mover && other.pawns.some((at) => ringIndexOf(other.color, at) === ring));
  });
  const pool = captures.length > 0 ? captures : legal;
  return pool.reduce((best, pawn) => (seat.pawns[pawn]! > seat.pawns[best]! ? pawn : best), pool[0]!);
}

import {
  BASE, HOME_STEP, PAWNS_PER_SEAT, isProtectedRing, ringIndexOf,
} from './board.js';
import { colorsFor, nextSeat } from './seats.js';
import { LOG_LIMIT, type EngineEvent, type MatchState, type SeatKind, type StepResult } from './state.js';

export interface CreateSeat { kind: SeatKind; label: string; participantId?: string; }

// Log entries are never mutated after they are written, so they are shared between copies.
const clone = (state: MatchState): MatchState => ({
  ...state,
  seats: state.seats.map((seat) => ({ ...seat, pawns: [...seat.pawns] })),
  log: [...state.log],
});

function addLog(state: MatchState, text: string, seat?: number): void {
  state.log.push({ n: state.logCount, text, ...(seat !== undefined ? { seat } : {}) });
  state.logCount += 1;
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

/** A new match with 2 to 4 seats in turn order (colours follow `seats`), starting with seat `first`. */
export function createMatch(seats: readonly CreateSeat[], first: number): MatchState {
  const colors = colorsFor(seats.length);
  if (!Number.isInteger(first) || first < 0 || first >= seats.length) throw new RangeError('The first seat is out of range.');
  const state: MatchState = {
    seats: seats.map((seat, index) => ({
      color: colors[index]!, kind: seat.kind, label: seat.label,
      ...(seat.participantId !== undefined ? { participantId: seat.participantId } : {}),
      pawns: Array.from({ length: PAWNS_PER_SEAT }, () => BASE), away: false, missed: 0, left: false,
    })),
    current: first, phase: 'ROLL', dice: null, sixesInRow: 0, forfeit: false, winner: null, log: [], logCount: 0,
  };
  addLog(state, `The match starts. ${seats[first]!.label} goes first.`, first);
  return state;
}

interface Occupant { seat: number; pawn: number; }

function occupantsOf(state: MatchState, ringIndex: number): Occupant[] {
  const found: Occupant[] = [];
  state.seats.forEach((seat, index) => {
    seat.pawns.forEach((step, pawn) => {
      if (ringIndexOf(seat.color, step) === ringIndex) found.push({ seat: index, pawn });
    });
  });
  return found;
}

/** Two or more pawns of one seat on an unprotected ring square that the mover does not own. */
function blockedFor(state: MatchState, mover: number, ringIndex: number): boolean {
  if (isProtectedRing(ringIndex)) return false;
  const counts = new Map<number, number>();
  for (const { seat } of occupantsOf(state, ringIndex)) counts.set(seat, (counts.get(seat) ?? 0) + 1);
  return Array.from(counts.entries()).some(([seat, count]) => seat !== mover && count >= 2);
}

/** Pawns of the current seat that may move with the current roll. */
export function legalPawns(state: MatchState): number[] {
  if (state.phase !== 'MOVE' || state.dice === null || state.current === null || state.forfeit) return [];
  const mover = state.current;
  const seat = state.seats[mover]!;
  const roll = state.dice;
  const legal: number[] = [];
  seat.pawns.forEach((step, pawn) => {
    if (step === BASE) { if (roll === 6) legal.push(pawn); return; }
    const to = step + roll;
    if (to > HOME_STEP) return;
    const ring = ringIndexOf(seat.color, to);
    if (ring !== null && blockedFor(state, mover, ring)) return;
    legal.push(pawn);
  });
  return legal;
}

/** True when the roll cannot be used and the turn must be resolved with `advance`. */
export const isStuck = (state: MatchState): boolean => state.phase === 'MOVE' && legalPawns(state).length === 0;

function passTurn(state: MatchState, events: EngineEvent[]): void {
  const next = state.current === null ? null : nextSeat(state.seats, state.current);
  state.current = next;
  state.phase = next === null ? 'ENDED' : 'ROLL';
  state.dice = null;
  state.sixesInRow = 0;
  state.forfeit = false;
  if (next !== null) events.push({ kind: 'TURN', seat: next });
}

/** The current seat rolls `value` (1 to 6, supplied by the caller's fair source). */
export function roll(state: MatchState, value: number): StepResult {
  if (state.phase !== 'ROLL' || state.current === null) throw new Error('It is not time to roll.');
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new RangeError('A die shows 1 to 6.');
  const next = clone(state);
  const seat = next.current!;
  const label = next.seats[seat]!.label;
  const sixes = value === 6 ? next.sixesInRow + 1 : 0;
  next.phase = 'MOVE';
  next.dice = value;
  next.sixesInRow = sixes;
  next.forfeit = sixes >= 3;
  addLog(next, `${label} rolled a ${value}.`, seat);
  return { state: next, events: [{ kind: 'ROLLED', seat, value }] };
}

/** Resolves a roll that cannot be used: an extra roll after a 6, otherwise the turn passes. */
export function advance(state: MatchState): StepResult {
  if (!isStuck(state) || state.current === null || state.dice === null) throw new Error('The roll can still be used.');
  const next = clone(state);
  const seat = next.current!;
  const value = next.dice!;
  const label = next.seats[seat]!.label;
  const events: EngineEvent[] = [{ kind: 'NO_MOVE', seat, value }];
  if (next.forfeit) {
    addLog(next, `${label} rolled a third 6 in a row, so the turn ends.`, seat);
    passTurn(next, events);
  } else if (value === 6) {
    addLog(next, `${label} has no legal move but rolls again after the 6.`, seat);
    next.phase = 'ROLL';
    next.dice = null;
  } else {
    addLog(next, `${label} has no legal move.`, seat);
    passTurn(next, events);
  }
  return { state: next, events };
}

/** Moves one of the current seat's legal pawns by the current roll. */
export function move(state: MatchState, pawn: number): StepResult {
  if (!legalPawns(state).includes(pawn)) throw new Error('That pawn cannot move.');
  const next = clone(state);
  const mover = next.current!;
  const seat = next.seats[mover]!;
  const roll = next.dice!;
  const from = seat.pawns[pawn]!;
  const to = from === BASE ? 0 : from + roll;
  seat.pawns[pawn] = to;
  const events: EngineEvent[] = [];
  let captured: { seat: number; pawn: number } | undefined;

  const ring = ringIndexOf(seat.color, to);
  if (ring !== null && !isProtectedRing(ring)) {
    const victim = occupantsOf(next, ring).find((occupant) => occupant.seat !== mover);
    if (victim) {
      next.seats[victim.seat]!.pawns[victim.pawn] = BASE;
      captured = victim;
    }
  }

  const number = pawn + 1;
  let text = from === BASE ? `${seat.label} brought pawn ${number} onto the board.` : `${seat.label} moved pawn ${number} ${roll} steps.`;
  if (captured) text += ` It captured ${next.seats[captured.seat]!.label}'s pawn ${captured.pawn + 1}.`;
  if (to === HOME_STEP) text += ` Pawn ${number} is home.`;
  addLog(next, text, mover);
  events.push({ kind: 'MOVED', seat: mover, pawn, from, to, ...(captured ? { captured } : {}) });

  if (seat.pawns.every((step) => step === HOME_STEP)) {
    next.winner = mover;
    next.phase = 'ENDED';
    next.current = null;
    next.dice = null;
    next.sixesInRow = 0;
    addLog(next, `${seat.label} wins the match.`, mover);
    events.push({ kind: 'WON', seat: mover });
    return { state: next, events };
  }

  if (roll === 6 || captured) {
    next.phase = 'ROLL';
    next.dice = null;
    if (captured && roll !== 6) next.sixesInRow = 0;
  } else {
    passTurn(next, events);
  }
  return { state: next, events };
}

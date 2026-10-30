import type { Color } from './board.js';

export type SeatKind = 'HUMAN' | 'COMPUTER';
export type Phase = 'ROLL' | 'MOVE' | 'ENDED';

export interface SeatState {
  color: Color;
  kind: SeatKind;
  /** Display label shown to others; "Computer N" for computers. */
  label: string;
  /** Online human seats only: the key that matches an action to a seat. */
  participantId?: string;
  /** Four steps (see board.ts); empty once the seat has left. */
  pawns: number[];
  away: boolean;
  /** Consecutive timeouts, 0 to 3. */
  missed: number;
  left: boolean;
}

export interface LogEntry { n: number; text: string; seat?: number; }

export interface MatchState {
  seats: SeatState[];
  /** The seat that must act, or null once the match has ended. */
  current: number | null;
  phase: Phase;
  /** 1 to 6 in phase MOVE, otherwise null. */
  dice: number | null;
  /** Sixes rolled in a row this turn, 0 to 2. */
  sixesInRow: number;
  /** True after a third 6 in a row: the roll cannot be used and the turn ends. */
  forfeit: boolean;
  winner: number | null;
  /** The last 50 entries, oldest first. */
  log: LogEntry[];
  /** Entries written so far; becomes the next entry's `n`. */
  logCount: number;
}

export type EngineEvent =
  | { kind: 'ROLLED'; seat: number; value: number }
  | { kind: 'MOVED'; seat: number; pawn: number; from: number; to: number; captured?: { seat: number; pawn: number } }
  | { kind: 'NO_MOVE'; seat: number; value: number }
  | { kind: 'TURN'; seat: number }
  | { kind: 'SEAT_LEFT'; seat: number }
  | { kind: 'WON'; seat: number };

export interface StepResult { state: MatchState; events: EngineEvent[]; }

export const LOG_LIMIT = 50;

import { PAWNS_PER_SEAT, HOME_STEP, type Color } from './board.js';
import type { LogEntry, MatchState, Phase, SeatKind } from './state.js';

export type LudoAction = { type: 'roll' } | { type: 'move'; pawn: number } | { type: 'resume' };

/** Validates a game action from a client. Anything else, including extra fields, is null. */
export function parseLudoAction(action: unknown): LudoAction | null {
  if (typeof action !== 'object' || action === null || Array.isArray(action)) return null;
  const record = action as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'type' && key !== 'payload')) return null;
  if (record.type === 'roll' || record.type === 'resume') {
    return record.payload === undefined ? { type: record.type } : null;
  }
  if (record.type !== 'move') return null;
  const payload = record.payload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const fields = payload as Record<string, unknown>;
  const keys = Object.keys(fields);
  const pawn = fields.pawn;
  if (keys.length !== 1 || keys[0] !== 'pawn' || typeof pawn !== 'number' || !Number.isInteger(pawn) || pawn < 0 || pawn >= PAWNS_PER_SEAT) return null;
  return { type: 'move', pawn };
}

export interface LudoSeatView {
  index: number;
  color: Color;
  kind: SeatKind;
  label: string;
  participantId?: string;
  away: boolean;
  left: boolean;
  pawns: number[];
  /** Pawns on step 56. */
  home: number;
}

export interface LudoTurnView {
  seat: number | null;
  phase: Phase;
  dice: number | null;
  legalPawns: number[];
  sixesInRow: number;
  decisionMsLeft: number | null;
  settleMsLeft: number;
}

export interface LudoMatchView {
  kind: 'MATCH';
  theme: string;
  turnLimitSeconds: number;
  /** The recipient's seat index; a solo visitor is always seat 0. */
  you: number | null;
  seats: LudoSeatView[];
  turn: LudoTurnView;
  winner: number | null;
  log: LogEntry[];
}

export type LudoView = { kind: 'WAITING' } | LudoMatchView;

export type LudoEvent =
  | { kind: 'ROLLED'; seat: number; value: number; seed: number; durationMs: number }
  | { kind: 'MOVED'; seat: number; pawn: number; from: number; to: number; captured?: { seat: number; pawn: number } }
  | { kind: 'NO_MOVE'; seat: number; value: number }
  | { kind: 'AUTO_PLAYED'; seat: number; reason: 'TIMEOUT' | 'AWAY'; pawn?: number }
  | { kind: 'AWAY_SET'; seat: number }
  | { kind: 'AWAY_CLEARED'; seat: number }
  | { kind: 'SEAT_LEFT'; seat: number }
  | { kind: 'TURN'; seat: number }
  | { kind: 'WON'; seat: number };

export interface MatchViewOptions {
  theme: string;
  turnLimitSeconds: number;
  you: number | null;
  legalPawns: number[];
  decisionMsLeft: number | null;
  settleMsLeft: number;
}

/** The one place engine state becomes a view; the server and the solo runner both use it. */
export function toMatchView(state: MatchState, options: MatchViewOptions): LudoMatchView {
  return {
    kind: 'MATCH',
    theme: options.theme,
    turnLimitSeconds: options.turnLimitSeconds,
    you: options.you,
    seats: state.seats.map((seat, index) => ({
      index, color: seat.color, kind: seat.kind, label: seat.label,
      ...(seat.participantId !== undefined ? { participantId: seat.participantId } : {}),
      away: seat.away, left: seat.left, pawns: [...seat.pawns],
      home: seat.pawns.filter((step) => step === HOME_STEP).length,
    })),
    turn: {
      seat: state.current, phase: state.phase, dice: state.dice,
      legalPawns: state.phase === 'MOVE' ? options.legalPawns : [],
      sixesInRow: state.sixesInRow,
      decisionMsLeft: options.decisionMsLeft, settleMsLeft: options.settleMsLeft,
    },
    winner: state.winner,
    log: state.log.map((entry) => ({ ...entry })),
  };
}

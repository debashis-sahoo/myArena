/** Ludo state and events. Authoritative description: specs/002-ludo-game-module/contracts/ludo-protocol.md */
import type { LudoColor, SquareRef } from './board.js';

export type LudoPhase = 'waiting_roll' | 'rolling' | 'waiting_move' | 'moving' | 'finished';

export interface PlayerState {
  playerId: string;
  color: LudoColor;
  /** P1 to P4: the host first, then seat order. */
  slot: number;
  kind: 'human' | 'bot';
  /** Four progress values: -1 base, 0..50 ring, 51..55 lane, 56 HOME, -2 removed. */
  pawns: number[];
  home: number;
  status: 'active' | 'left';
}

export type ActivityKind =
  | 'turn'
  | 'roll'
  | 'move'
  | 'capture'
  | 'home'
  | 'bonus'
  | 'skip'
  | 'timeout'
  | 'warning'
  | 'released'
  | 'win';

export interface ActivityEntry {
  id: number;
  ts: number;
  kind: ActivityKind;
  playerId?: string;
  color?: LudoColor;
  text: string;
}

export interface StandingEntry {
  playerId: string;
  color: LudoColor;
  home: number;
  rank: number;
}

export interface LudoState {
  matchRev: number;
  phase: LudoPhase;
  players: PlayerState[];
  /** playerId whose turn it is; null once finished. */
  turn: string | null;
  bonus: boolean;
  roll: { value: number; by: string } | null;
  /** Pawn indexes of `turn` that can use `roll`; non-empty only while waiting_move. */
  eligible: number[];
  /** Time left on the countdown (a duration measured when the snapshot was taken); null when untimed. */
  remainingMs: number | null;
  sixStreak: number;
  winner: string | null;
  standings: StandingEntry[];
  /** playerId who missed 2 turns in a row. */
  warning: string | null;
  /** The only remaining human of an online match. */
  lastPlayer: string | null;
  activity: ActivityEntry[];
}

export type LudoAction = { type: 'roll' } | { type: 'move'; pawn: number };

export interface CapturedPawn {
  playerId: string;
  pawn: number;
  from: SquareRef;
}

interface EventBase {
  seq: number;
  state: LudoState;
  entry?: ActivityEntry;
}

export type LudoEvent =
  | (EventBase & { type: 'match_started' })
  | (EventBase & { type: 'turn'; reason: 'start' | 'next' | 'bonus' })
  | (EventBase & { type: 'rolled'; value: number; by: string; tumbleMs: number })
  | (EventBase & { type: 'choose' })
  | (EventBase & { type: 'no_move'; reason: 'blocked' | 'three_sixes' })
  | (EventBase & {
      type: 'moved';
      by: string;
      pawn: number;
      from: number;
      to: number;
      path: SquareRef[];
      captured: CapturedPawn[];
      reachedHome: boolean;
      bonus: boolean;
    })
  | (EventBase & { type: 'timeout'; by: string; action: 'roll' | 'move' })
  | (EventBase & { type: 'warning'; player: string })
  | (EventBase & { type: 'released'; player: string; reason: 'left' | 'timeout' | 'inactive' | 'removed' })
  | (EventBase & { type: 'finished'; winner: string; standings: StandingEntry[] });

export type LudoEventType = LudoEvent['type'];

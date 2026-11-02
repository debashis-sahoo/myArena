/** Housie state and events. Authoritative description: specs/003-housie-tambola-module/contracts/housie-protocol.md */
import type { Ticket } from './ticket.js';

export interface PlayerRef {
  playerId: string;
  name: string;
  color: string;
}

export interface CallerState {
  mode: 'manual' | 'auto';
  intervalMs: number;
  paused: boolean;
  nextInMs?: number;
}

export interface HousieLobby {
  ceiling: number;
  hostPlays: boolean;
  patterns: string[];
  caller: { mode: 'manual' | 'auto'; intervalMs?: number };
  /** Ticket count each player has chosen, by playerId. */
  choices: Record<string, number>;
}

export interface ComboState {
  id: string;
  status: 'open' | 'claimed';
  claimedBy?: PlayerRef;
  locked?: boolean;
  claimedAtCall?: number;
}

export interface ResultEntry {
  combo: string;
  winner?: PlayerRef;
}

export interface HousieView {
  seq: number;
  phase: 'running' | 'finished';
  settings: { patterns: string[]; ceiling: number };
  called: number[];
  caller: CallerState;
  combos: ComboState[];
  you: { playing: boolean; tickets: Ticket[]; marks: number[]; claimsLockedMs?: number };
  hostId: string;
  playing: number;
  results?: ResultEntry[];
}

export type HousieEvent =
  | { type: 'ball'; seq: number; n: number; index: number; nextInMs?: number }
  | { type: 'caller'; seq: number; mode: 'manual' | 'auto'; intervalMs: number; paused: boolean; nextInMs?: number }
  | { type: 'claimed'; seq: number; combo: string; by: PlayerRef; calledCount: number }
  | { type: 'finished'; seq: number; results: ResultEntry[]; calledCount: number }
  | { type: 'playerLeft'; seq: number; playerId: string }
  | { type: 'snapshot'; priv: true; view: HousieView }
  | { type: 'bogus'; priv: true; combo: string }
  | { type: 'justClaimed'; priv: true; combo: string }
  | { type: 'claimsPaused'; priv: true; untilMs: number };

export type HousieAction =
  | { type: 'setCeiling'; value: number }
  | { type: 'setHostPlays'; value: boolean }
  | { type: 'setPatterns'; ids: string[] }
  | { type: 'setCaller'; mode: 'manual' | 'auto'; intervalMs?: number }
  | { type: 'setTickets'; count: number }
  | { type: 'draw' }
  | { type: 'auto'; intervalMs: number }
  | { type: 'manual' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'marks'; changes: { t: number; c: number; on: boolean }[] }
  | { type: 'claim'; combo: string; ticket: number };

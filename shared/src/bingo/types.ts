/** Bingo state and events. Authoritative description: specs/005-bingo-75-ball-module/contracts/bingo-protocol.md */
import type { BingoCard } from './card.js';
import type { CallerState, PlayerRef } from '../housie/types.js';

export interface BingoLobby {
  ceiling: number;
  hostPlays: boolean;
  patterns: string[];
  caller: { mode: 'manual' | 'auto'; intervalMs?: number };
  /** Card count each player has chosen, by playerId (1..ceiling). */
  choices: Record<string, number>;
}

export interface BingoPatternState {
  id: string;
  status: 'open' | 'claimed';
  claimedBy?: PlayerRef;
  claimedAtCall?: number;
}

export interface BingoResultEntry {
  pattern: string;
  winner?: PlayerRef;
}

export interface BingoView {
  seq: number;
  phase: 'running' | 'finished';
  settings: { patterns: string[]; ceiling: number };
  called: number[];
  caller: CallerState;
  patterns: BingoPatternState[];
  you: {
    playing: boolean;
    cards: BingoCard[];
    /** One 25-bit mask per card (bit `row * 5 + col`). The FREE cell (bit 12) is never set; it always counts. */
    daubs: number[];
    claimsLockedMs?: number;
  };
  hostId: string;
  playing: number;
  results?: BingoResultEntry[];
}

export type BingoEvent =
  | { type: 'ball'; seq: number; n: number; index: number; nextInMs?: number }
  | { type: 'caller'; seq: number; mode: 'manual' | 'auto'; intervalMs: number; paused: boolean; nextInMs?: number }
  | { type: 'claimed'; seq: number; patterns: string[]; by: PlayerRef; calledCount: number }
  | { type: 'finished'; seq: number; results: BingoResultEntry[]; calledCount: number }
  | { type: 'playerLeft'; seq: number; playerId: string }
  | { type: 'snapshot'; priv: true; view: BingoView }
  | { type: 'bogus'; priv: true }
  | { type: 'tooLate'; priv: true }
  | { type: 'claimsPaused'; priv: true; untilMs: number };

export type BingoAction =
  | { type: 'setCeiling'; value: number }
  | { type: 'setHostPlays'; value: boolean }
  | { type: 'setPatterns'; ids: string[] }
  | { type: 'setCaller'; mode: 'manual' | 'auto'; intervalMs?: number }
  | { type: 'setCards'; count: number }
  | { type: 'draw' }
  | { type: 'auto'; intervalMs: number }
  | { type: 'manual' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'daubs'; changes: { card: number; cell: number; on: boolean }[] }
  | { type: 'bingo'; card: number };

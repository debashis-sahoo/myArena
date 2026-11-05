import type { BingoCard, BingoLobby, BingoResultEntry, PlayerRef } from '@myarena/shared';
import type { GameContext } from '../registry.js';

export interface PlayerEntry {
  playerId: string;
  name: string;
  color: string;
  cards: BingoCard[];
  /** One 25-bit mask per card: bit `row * 5 + col` is the player's daub (FREE is bit 12). Private. */
  daubs: number[];
  /** One flag per card: true once its FREE cell has received any toggle. Private. */
  freeTapped: boolean[];
  lastClaimAt: number;
  bogusStreak: number;
  lockedUntil: number;
  status: 'playing' | 'left';
}

export interface PatternState {
  id: string;
  claimedBy?: PlayerRef;
  claimedAtCall?: number;
}

export interface Match {
  ctx: GameContext;
  settings: { patterns: string[]; ceiling: number };
  /** The shuffled call order. Never sent to clients. */
  deck: number[];
  called: number[];
  caller: { mode: 'manual' | 'auto'; intervalMs: number; paused: boolean };
  nextDrawAt: number | null;
  cancelAuto: (() => void) | null;
  players: Map<string, PlayerEntry>;
  /** One entry per chosen pattern, in catalogue order. */
  patterns: PatternState[];
  phase: 'running' | 'finished';
  /** Increases with every public event. */
  seq: number;
  results?: BingoResultEntry[];
  lobby: BingoLobby;
}

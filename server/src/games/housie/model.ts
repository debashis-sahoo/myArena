import type { HousieLobby, PlayerRef, ResultEntry, Ticket } from '@myarena/shared';
import type { GameContext } from '../registry.js';

export interface PlayerEntry {
  playerId: string;
  name: string;
  color: string;
  tickets: Ticket[];
  /** One 27-bit mask per ticket: bit `row * 9 + col` is the player's cross. Private. */
  marks: number[];
  lastClaimAt: number;
  bogusStreak: number;
  lockedUntil: number;
  /** Tickets that already won a Full House (a ticket can win only one). */
  fullHouseTickets: Set<number>;
  status: 'playing' | 'left';
}

export interface Combo {
  id: string;
  claimedBy?: PlayerRef;
  claimedAtCall?: number;
  locked: boolean;
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
  combos: Combo[];
  phase: 'running' | 'finished';
  /** Increases with every public event. */
  seq: number;
  results?: ResultEntry[];
  lobby: HousieLobby;
}

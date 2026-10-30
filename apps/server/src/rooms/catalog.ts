import type { GameDescriptor, GameLifecycle } from '@myarena/game-sdk';

export interface GameSummary { id: string; name: string; minParticipants: number; maxParticipants: number; }

// The room module only sees games through this port; it never imports a game.
export interface GameCatalog {
  get(id: string): GameLifecycle | undefined;
  /** Games a room can select. */
  list(): GameSummary[];
  /** Every registered game, including solo-only ones. */
  descriptors(): GameDescriptor[];
}

export const emptyCatalog: GameCatalog = { get: () => undefined, list: () => [], descriptors: () => [] };

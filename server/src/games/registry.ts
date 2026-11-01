import { getGame } from '@myarena/shared';
import { placeholderEngine } from './placeholderEngine.js';

/** Seat info the platform hands to a game (contracts/game-module.md). */
export interface MatchSeat {
  playerId: string;
  displayName: string;
  color: string;
  kind: 'human' | 'bot';
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

/** Server half of the platform-to-game contract. The engine is the only authority for rules. */
export interface GameEngine {
  id: string;
  createMatch(seats: MatchSeat[]): unknown;
  getView(match: unknown, playerId: string): unknown;
  onAction(match: unknown, playerId: string, action: unknown): ActionResult;
  onSeatReleased(match: unknown, playerId: string): void;
  onBotTurn(match: unknown, botPlayerId: string): void;
  dispose(match: unknown): void;
}

const engines = new Map<string, GameEngine>([['ludo', placeholderEngine('ludo')]]);

export function getEngine(gameId: string): GameEngine {
  const engine = engines.get(gameId);
  if (engine) return engine;
  // Any other active game falls back to the placeholder until its own engine is registered.
  return placeholderEngine(getGame(gameId)?.id ?? gameId);
}

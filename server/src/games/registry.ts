import { getGame } from '@myarena/shared';
import { createHousieEngine } from './housie/engine.js';
import { createLudoEngine } from './ludo/engine.js';
import { placeholderEngine } from './placeholderEngine.js';

/** Seat info the platform hands to a game (contracts/platform-extensions.md). Seats arrive in slot order: host first, then seat order. */
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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Services the platform gives a match. Timers are owned by the room and cleared when it closes. */
export interface GameContext {
  schedule(ms: number, fn: () => void): () => void;
  /** Broadcast a game event to everyone in the room. */
  emit(event: unknown): void;
  /** Post a chat message as a participant (bots). Sanitised and rate limited by the platform. */
  say(playerId: string, text: string): void;
  /** Server-initiated release of a human or bot seat. */
  releaseSeat(playerId: string, reason: 'inactive'): void;
  now(): number;
  log(level: LogLevel, fields: Record<string, unknown>, message: string): void;
  /** One game:event to that person's current socket (no-op while they are offline). Private data only travels this way. */
  emitTo(playerId: string, event: unknown): void;
  /** The current host's playerId; it changes on host handover, so authorise callers with it at action time. */
  hostId(): string;
  /** One system chat line (code game_notice), sanitised and rate limited. The only way a game writes to chat. */
  notice(text: string): void;
}

/** Server half of the platform-to-game contract. The engine is the only authority for rules. */
export interface GameEngine {
  id: string;
  /** Returns playerId -> colour. `seated` is in slot order (host first). Optional. */
  assignColors?(seated: { playerId: string; seatIndex: number; kind: 'human' | 'bot' }[]): Record<string, string>;
  /** Lobby channel (all optional): settings and per-person choices kept before the match starts. */
  createLobby?(): unknown;
  /** Public, secret-free data attached to RoomState.gameLobby. */
  lobbyView?(lobby: unknown): unknown;
  onLobbyAction?(lobby: unknown, who: { playerId: string; isHost: boolean }, action: unknown): ActionResult;
  onLobbyLeave?(lobby: unknown, playerId: string): void;
  /** A returned message blocks Start (after the platform's own minimum-player check). */
  validateStart?(lobby: unknown, seated: MatchSeat[]): string | null;
  createMatch(seats: MatchSeat[], ctx: GameContext, lobby?: unknown): unknown;
  getView(match: unknown, playerId: string): unknown;
  onAction(match: unknown, playerId: string, action: unknown): ActionResult;
  onSeatReleased(match: unknown, playerId: string): void;
  onBotTurn(match: unknown, botPlayerId: string): void;
  dispose(match: unknown): void;
}

const engines = new Map<string, GameEngine>([
  ['ludo', createLudoEngine()],
  ['housie', createHousieEngine()],
]);

export function getEngine(gameId: string): GameEngine {
  const engine = engines.get(gameId);
  if (engine) return engine;
  // Any other active game falls back to the placeholder until its own engine is registered.
  return placeholderEngine(getGame(gameId)?.id ?? gameId);
}

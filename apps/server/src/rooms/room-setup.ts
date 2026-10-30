import type { FieldError } from '../errors.js';
import type { GameCatalog } from './catalog.js';

export interface RoomSetupInput { gameId?: string | undefined; maxParticipants?: number | undefined }
export interface RoomSetup { gameId: string; maxParticipants: number }

export type RoomSetupResult =
  | { ok: true; setup: RoomSetup | null }
  | { ok: false; code: 'VALIDATION_FAILED' | 'GAME_UNAVAILABLE'; fieldErrors?: FieldError[] };

const PLATFORM_MAX = 100;
const PRIVATE_ROOM_MIN = 2;

/** Allowed player counts for a private room: max(2, game min) to min(100, game max). */
export function allowedRange(game: { minParticipants: number; maxParticipants: number }): { lo: number; hi: number } {
  return { lo: Math.max(PRIVATE_ROOM_MIN, game.minParticipants), hi: Math.min(PLATFORM_MAX, game.maxParticipants) };
}

export function validateRoomSetup(games: GameCatalog, { gameId, maxParticipants }: RoomSetupInput): RoomSetupResult {
  if (gameId === undefined) {
    if (maxParticipants === undefined) return { ok: true, setup: null };
    return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'maxParticipants', message: 'Choose a game before choosing the number of players.' }] };
  }
  const descriptor = games.get(gameId)?.descriptor;
  if (!descriptor || !descriptor.modes.includes('ONLINE')) return { ok: false, code: 'GAME_UNAVAILABLE' };
  const { lo, hi } = allowedRange(descriptor);
  const count = maxParticipants ?? descriptor.defaultParticipants ?? hi;
  if (!Number.isInteger(count) || count < lo || count > hi) {
    return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'maxParticipants', message: `Choose a number of players from ${lo} to ${hi}.` }] };
  }
  return { ok: true, setup: { gameId, maxParticipants: count } };
}

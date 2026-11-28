/** Wire protocol. Authoritative description: specs/001-platform-hub-rooms/contracts/realtime-events.md */
import type { LudoState } from './ludo/types.js';
import { ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from './limits.js';

export const EVENTS = {
  // client -> server (all use acknowledgements)
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_SET_CAPACITY: 'room:setCapacity',
  ROOM_KICK: 'room:kick',
  ROOM_START: 'room:start',
  ROOM_RESET: 'room:reset',
  ROOM_FILL_AI: 'room:fillAi',
  CHAT_SEND: 'chat:send',
  // server -> client
  ROOM_STATE: 'room:state',
  CHAT_MESSAGE: 'chat:message',
  PLAYER_REMOVED: 'player:removed',
  ROOM_CLOSED: 'room:closed',
  ROOM_RECONNECT_HINT: 'room:reconnectHint',
  SERVER_RESTARTING: 'server:restarting',
  // game channel: actions up, events and snapshots down
  GAME_ACTION: 'game:action',
  GAME_EVENT: 'game:event',
  GAME_STATE: 'game:state',
} as const;

export type ErrorCode =
  | 'HOST_ENTRY_REQUIRED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'MATCH_IN_PROGRESS'
  | 'REMOVED_COOLDOWN'
  | 'GAME_UNAVAILABLE'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'INVALID_STATE'
  | 'CAPACITY_OUT_OF_RANGE'
  | 'CAPACITY_BELOW_PLAYERS'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'SERVER_BUSY';

export interface AckError {
  ok: false;
  error: { code: ErrorCode; message: string; retryAfterMs?: number };
}
export interface AckOk<T> {
  ok: true;
  data: T;
}
export type Ack<T> = AckOk<T> | AckError;

export interface GuestInfo {
  guestId: string;
  displayName: string;
  avatar: string;
}

export type RoomMode = 'online' | 'ai';
export type RoomPhase = 'lobby' | 'in_progress';
export type ConnectionState = 'connected' | 'disconnected';

export interface ParticipantView {
  playerId: string;
  kind: 'human' | 'bot';
  displayName: string;
  avatar: string;
  color: string;
  isHost: boolean;
  connection: ConnectionState;
  joinSeq: number;
}

export interface SeatView {
  index: number;
  color: string;
  occupant: ParticipantView | null;
}

export interface RoomState {
  roomId: string;
  gameId: string;
  mode: RoomMode;
  state: RoomPhase;
  capacity: number;
  minPlayers: number;
  maxPlayers: number;
  hostPlayerId: string;
  seats: SeatView[];
  rev: number;
  inviteEnabled: boolean;
  /** The game's public lobby settings while the room is in the lobby (game-defined plain data). */
  gameLobby?: unknown;
}

export type SystemCode =
  | 'joined'
  | 'left'
  | 'disconnected'
  | 'reconnected'
  | 'removed'
  | 'host_changed'
  | 'capacity_changed'
  | 'match_started'
  | 'seat_released'
  | 'game_notice'
  | 'humor';

export interface ChatMessage {
  id: number;
  kind: 'player' | 'system';
  playerId?: string;
  name: string;
  color: string;
  text: string;
  systemCode?: SystemCode;
  ts: number;
}

export type ClosedReason =
  | 'all_left'
  | 'all_disconnected'
  | 'ai_owner_left'
  | 'host_left'
  | 'server_restart'
  | 'taken_over';

// ----- payloads -----
export interface CreateRoomPayload {
  gameId: string;
  mode: RoomMode;
  botCount?: number;
  /** Online rooms only: the room capacity for games that ask for it. */
  capacity?: number;
  guest: GuestInfo;
}
export interface JoinRoomPayload {
  gameId?: string;
  roomId: string;
  guest: GuestInfo;
}

export type SlotIdentity = 'production' | 'staging';
export type ReleasePhase = 'candidate' | 'active' | 'draining' | 'stopped';

export interface RoomReconnectHint {
  gameId: string;
  roomId: string;
  origin: string;
  validUntilUtc: string;
}

export interface CandidateVerification {
  tokenHash: string;
  expiresUtc: string;
  usedBy: string;
}

export interface SafeOperationalEvent {
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  releaseId: string;
  slot: SlotIdentity;
  category: 'startup' | 'health' | 'routing' | 'swap' | 'capacity' | 'release' | 'error';
  event: string;
  safeCorrelationId: string;
  metric?: number;
  unit?: string;
}
export interface SetCapacityPayload {
  capacity: number;
}
export interface KickPayload {
  playerId: string;
}
export interface ChatSendPayload {
  text: string;
}

export interface JoinedData {
  room: RoomState;
  you: { playerId: string };
  chat: ChatMessage[];
  invitePath: string | null;
  resumed: boolean;
  /** Current game snapshot when a match is in progress. */
  game?: unknown;
  /** Short-lived, non-authoritative fallback origin for an existing room. */
  reconnectHint?: RoomReconnectHint;
}
export interface RoomData {
  room: RoomState;
}
export interface ChatSentData {
  message: ChatMessage;
}
export interface RemovedData {
  cooldownMs: number;
  reason?: 'host' | 'inactive';
}
export interface ClosedData {
  reason: ClosedReason;
}

export function invitePathFor(gameId: string, roomId: string): string {
  return `/room/${gameId}/${roomId}`;
}

/** Canonical display form of a room code. */
export function formatRoomCode(roomId: string): string {
  return normalizeRoomCode(roomId);
}

/** Accepts user-typed forms (lowercase, dashes, spaces). */
export function normalizeRoomCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function isRoomCode(input: string): boolean {
  const normalized = normalizeRoomCode(input);
  return (
    normalized.length === ROOM_ID_LENGTH &&
    [...normalized].every((character) => ROOM_ID_ALPHABET.includes(character))
  );
}

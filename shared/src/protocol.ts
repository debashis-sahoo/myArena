/** Wire protocol. Authoritative description: specs/001-platform-hub-rooms/contracts/realtime-events.md */
import type { LudoState } from './ludo/types.js';

export const EVENTS = {
  // client -> server (all use acknowledgements)
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_SET_CAPACITY: 'room:setCapacity',
  ROOM_KICK: 'room:kick',
  ROOM_START: 'room:start',
  CHAT_SEND: 'chat:send',
  // server -> client
  ROOM_STATE: 'room:state',
  CHAT_MESSAGE: 'chat:message',
  PLAYER_REMOVED: 'player:removed',
  ROOM_CLOSED: 'room:closed',
  SERVER_RESTARTING: 'server:restarting',
  // game channel: actions up, events and snapshots down
  GAME_ACTION: 'game:action',
  GAME_EVENT: 'game:event',
  GAME_STATE: 'game:state',
} as const;

export type ErrorCode =
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
  | 'seat_released';

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

export type ClosedReason = 'all_left' | 'all_disconnected' | 'ai_owner_left' | 'server_restart' | 'taken_over';

// ----- payloads -----
export interface CreateRoomPayload {
  gameId: string;
  mode: RoomMode;
  botCount?: number;
  guest: GuestInfo;
}
export interface JoinRoomPayload {
  gameId: string;
  roomId: string;
  guest: GuestInfo;
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
  game?: LudoState;
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

/** Display form of a room ID: XXXX-XXXX. */
export function formatRoomCode(roomId: string): string {
  return roomId.length === 8 ? `${roomId.slice(0, 4)}-${roomId.slice(4)}` : roomId;
}

/** Accepts user-typed forms (lowercase, dashes, spaces). */
export function normalizeRoomCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

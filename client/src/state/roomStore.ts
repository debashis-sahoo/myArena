import { useSyncExternalStore } from 'react';
import {
  EVENTS,
  type ChatMessage,
  type ChatSentData,
  type ClosedData,
  type ClosedReason,
  type JoinedData,
  type RemovedData,
  type RoomData,
  type RoomState,
} from '@myarena/shared';
import { sfx } from '../audio/sfx';
import { guestInfo } from './guest';
import { connectSocket, disconnectSocket, emitWithAck, socketInstance, type ClientAck, type ClientErrorCode } from './socket';

export type StatusKind = 'not_found' | 'full' | 'in_progress' | 'removed' | 'ended' | 'taken_over' | 'error';

export interface RoomStatus {
  kind: StatusKind;
  message?: string;
  /** For 'removed': when the player may try again (ms epoch). */
  retryUntil?: number;
}

export interface RoomView {
  phase: 'idle' | 'joining' | 'in_room' | 'status';
  room: RoomState | null;
  /** Public playerId of this participant. */
  you: string | null;
  invitePath: string | null;
  chat: ChatMessage[];
  unread: number;
  drawerOpen: boolean;
  status: RoomStatus | null;
}

const IDLE: RoomView = {
  phase: 'idle',
  room: null,
  you: null,
  invitePath: null,
  chat: [],
  unread: 0,
  drawerOpen: false,
  status: null,
};

let view: RoomView = IDLE;
let session: { gameId: string; roomId: string } | null = null;
let joinedOnce = false;
let wired = false;
const listeners = new Set<() => void>();

function set(patch: Partial<RoomView>): void {
  view = { ...view, ...patch };
  listeners.forEach((l) => l());
}

export function useRoom(): RoomView {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => view,
  );
}

export function getRoomView(): RoomView {
  return view;
}

// A refresh keeps the same guestId, so a page that was in this room can rejoin without the name gate.
const markKey = (roomId: string) => `myarena.room.${roomId}`;
export function wasInRoom(roomId: string): boolean {
  try {
    return sessionStorage.getItem(markKey(roomId)) === '1';
  } catch {
    return false;
  }
}
function markRoom(roomId: string, on: boolean): void {
  try {
    if (on) sessionStorage.setItem(markKey(roomId), '1');
    else sessionStorage.removeItem(markKey(roomId));
  } catch {
    /* ignore */
  }
}

function statusFor(code: ClientErrorCode, message: string, retryAfterMs?: number): RoomStatus {
  switch (code) {
    case 'ROOM_NOT_FOUND':
    case 'GAME_UNAVAILABLE':
      return { kind: 'not_found' };
    case 'ROOM_FULL':
      return { kind: 'full' };
    case 'MATCH_IN_PROGRESS':
      return { kind: 'in_progress' };
    case 'REMOVED_COOLDOWN':
      return { kind: 'removed', retryUntil: Date.now() + (retryAfterMs ?? 0) };
    default:
      return { kind: 'error', message };
  }
}

function endSession(status: RoomStatus): void {
  if (session) markRoom(session.roomId, false);
  session = null;
  joinedOnce = false;
  set({ phase: 'status', status, room: null, you: null, invitePath: null, chat: [], unread: 0, drawerOpen: false });
  disconnectSocket();
}

function applyJoined(gameId: string, data: JoinedData): void {
  session = { gameId, roomId: data.room.roomId };
  joinedOnce = true;
  markRoom(data.room.roomId, true);
  set({
    phase: 'in_room',
    status: null,
    room: data.room,
    you: data.you.playerId,
    invitePath: data.invitePath,
    chat: data.chat,
  });
}

function reasonStatus(reason: ClosedReason): RoomStatus {
  return reason === 'taken_over' ? { kind: 'taken_over' } : { kind: 'ended' };
}

function wire(): void {
  if (wired) return;
  wired = true;
  const s = socketInstance();

  s.on(EVENTS.ROOM_STATE, (state: RoomState) => {
    if (!view.room || state.roomId !== view.room.roomId || state.rev <= view.room.rev) return;
    set({ room: state });
  });

  s.on(EVENTS.CHAT_MESSAGE, (msg: ChatMessage) => {
    if (view.phase !== 'in_room' || view.chat.some((m) => m.id === msg.id)) return;
    const mine = msg.kind === 'player' && msg.playerId === view.you;
    if (msg.kind === 'player' && !mine) sfx.message();
    else if (msg.systemCode === 'joined') sfx.join();
    set({
      chat: [...view.chat, msg].slice(-200),
      unread: !view.drawerOpen && msg.kind === 'player' && !mine ? view.unread + 1 : view.unread,
    });
  });

  s.on(EVENTS.PLAYER_REMOVED, (d: RemovedData) => {
    sfx.error();
    endSession({ kind: 'removed', retryUntil: Date.now() + d.cooldownMs });
  });

  s.on(EVENTS.ROOM_CLOSED, (d: ClosedData) => {
    if (view.phase === 'in_room') endSession(reasonStatus(d.reason));
  });

  // After a drop, the server gives the seat back when the same guestId rejoins within the reconnect window.
  s.on('connect', () => {
    if (!session || !joinedOnce || view.phase !== 'in_room') return;
    const { gameId, roomId } = session;
    void emitWithAck<JoinedData>(EVENTS.ROOM_JOIN, { gameId, roomId, guest: guestInfo() }).then((res) => {
      if (res.ok) applyJoined(gameId, res.data);
      else endSession({ kind: 'ended' });
    });
  });
}

// ---------- actions ----------

export async function createRoom(
  mode: 'online' | 'ai',
  botCount?: number,
): Promise<{ ok: true; roomId: string } | { ok: false; message: string }> {
  wire();
  connectSocket();
  const res = await emitWithAck<JoinedData>(
    EVENTS.ROOM_CREATE,
    { gameId: 'ludo', mode, ...(mode === 'ai' ? { botCount } : {}), guest: guestInfo() },
    90_000,
  );
  if (!res.ok) {
    disconnectSocket();
    return { ok: false, message: res.error.message };
  }
  applyJoined('ludo', res.data);
  return { ok: true, roomId: res.data.room.roomId };
}

export async function joinRoom(gameId: string, roomId: string): Promise<void> {
  if (view.phase === 'in_room' && view.room?.roomId === roomId) return;
  wire();
  set({ ...IDLE, phase: 'joining' });
  const res = await emitWithAck<JoinedData>(EVENTS.ROOM_JOIN, { gameId, roomId, guest: guestInfo() }, 90_000);
  if (!res.ok) {
    if (res.error.code === 'REMOVED_COOLDOWN') sfx.error();
    endSession(statusFor(res.error.code, res.error.message, res.error.retryAfterMs));
    return;
  }
  applyJoined(gameId, res.data);
}

export function leaveRoom(): void {
  const wasIn = session !== null;
  if (session) markRoom(session.roomId, false);
  session = null;
  joinedOnce = false;
  set({ ...IDLE });
  if (!wasIn) {
    disconnectSocket();
    return;
  }
  // Tell the server this is deliberate (so the seat frees at once), then drop the connection.
  const s = socketInstance();
  if (s.connected) {
    s.emit(EVENTS.ROOM_LEAVE, {}, () => disconnectSocket());
    setTimeout(disconnectSocket, 1500);
  } else {
    disconnectSocket();
  }
}

type SimpleResult = { ok: true } | { ok: false; message: string; retryAfterMs?: number };

function simple<T>(res: ClientAck<T>, onOk?: (data: T) => void): SimpleResult {
  if (!res.ok) return { ok: false, message: res.error.message, retryAfterMs: res.error.retryAfterMs };
  onOk?.(res.data);
  return { ok: true };
}

export async function setCapacity(capacity: number): Promise<SimpleResult> {
  const res = await emitWithAck<RoomData>(EVENTS.ROOM_SET_CAPACITY, { capacity });
  return simple(res, (d) => {
    if (view.room && d.room.rev > view.room.rev) set({ room: d.room });
  });
}

export async function kickPlayer(playerId: string): Promise<SimpleResult> {
  return simple(await emitWithAck<object>(EVENTS.ROOM_KICK, { playerId }));
}

export async function startMatch(): Promise<SimpleResult> {
  const res = await emitWithAck<RoomData>(EVENTS.ROOM_START, {});
  if (res.ok) sfx.success();
  return simple(res, (d) => {
    if (view.room && d.room.rev > view.room.rev) set({ room: d.room });
  });
}

export async function sendChat(text: string): Promise<SimpleResult> {
  const res = await emitWithAck<ChatSentData>(EVENTS.CHAT_SEND, { text }, 8000);
  return simple(res, (d) => {
    if (!view.chat.some((m) => m.id === d.message.id)) set({ chat: [...view.chat, d.message].slice(-200) });
  });
}

export function setDrawerOpen(open: boolean): void {
  set({ drawerOpen: open, unread: open ? 0 : view.unread });
}

/** Leave the terminal status screen and clear it. */
export function clearStatus(): void {
  set({ ...IDLE });
}

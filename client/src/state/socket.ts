import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Ack, ErrorCode, RoomReconnectHint } from '@myarena/shared';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export interface ConnSnapshot {
  status: ConnStatus;
  /** Failed attempts since the last good connection. */
  attempts: number;
  /** When the current non-connected stretch began (ms epoch), 0 when connected or idle. */
  since: number;
  everConnected: boolean;
}

export type ClientErrorCode = ErrorCode | 'TIMEOUT';
export type ClientAck<T> = { ok: true; data: T } | { ok: false; error: { code: ClientErrorCode; message: string; retryAfterMs?: number } };

let socket: Socket | null = null;
let activeOrigin: string | undefined;
let reconnectHint: RoomReconnectHint | null = null;
let snap: ConnSnapshot = { status: 'idle', attempts: 0, since: 0, everConnected: false };
const listeners = new Set<() => void>();

function setSnap(patch: Partial<ConnSnapshot>): void {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

/** The shared socket, created on first use. Not connected until connectSocket(). */
export function socketInstance(): Socket {
  if (socket) return socket;
  // Same origin as the page (wss in production). Backoff handles genuine reconnects on the
  // always-on S1 service and the bounded staging fallback.
  socket = io(activeOrigin, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
  });
  socket.on('connect', () => setSnap({ status: 'connected', attempts: 0, since: 0, everConnected: true }));
  socket.on('disconnect', (reason) => {
    if (reason === 'io client disconnect') setSnap({ status: 'idle', attempts: 0, since: 0 });
    else setSnap({ status: 'reconnecting', since: Date.now() });
  });
  socket.on('connect_error', () => {
    setSnap({ status: snap.everConnected ? 'reconnecting' : 'connecting', since: snap.since || Date.now() });
  });
  socket.io.on('reconnect_attempt', (n: number) => setSnap({ attempts: n }));
  return socket;
}

/** Connect on first create or join. */
export function connectSocket(): Socket {
  const s = socketInstance();
  if (!s.active) {
    setSnap({ status: 'connecting', since: Date.now(), attempts: 0 });
    s.connect();
  }
  return s;
}

/** Drop the connection when no room needs it to avoid unnecessary metered idle traffic. */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
  activeOrigin = undefined;
}

export function retryNow(): void {
  const s = socketInstance();
  setSnap({ status: snap.everConnected ? 'reconnecting' : 'connecting', since: Date.now(), attempts: 0 });
  s.disconnect();
  s.connect();
}

export function emitWithAck<T>(event: string, payload: object, timeoutMs = 15_000): Promise<ClientAck<T>> {
  const s = connectSocket();
  return new Promise((resolve) => {
    s.timeout(timeoutMs).emit(event, payload, (err: Error | null, res: Ack<T>) => {
      if (err) resolve({ ok: false, error: { code: 'TIMEOUT', message: 'The server did not respond. Please try again.' } });
      else resolve(res);
    });
  });
}

export function rememberReconnectHint(hint: RoomReconnectHint | undefined): void {
  if (!hint) {
    reconnectHint = null;
    return;
  }
  try {
    const parsed = new URL(hint.origin);
    if (
      parsed.protocol !== 'https:' ||
      parsed.origin !== hint.origin ||
      !Number.isFinite(Date.parse(hint.validUntilUtc))
    ) {
      return;
    }
    reconnectHint = { ...hint };
  } catch {
    /* Ignore an invalid server hint; it is routing metadata, not authoritative state. */
  }
}

export function clearReconnectHint(): void {
  reconnectHint = null;
}

/** Switch to the exact server-issued draining origin only for an existing-room reconnect. */
export function prepareReconnectFallback(): boolean {
  if (
    !reconnectHint ||
    Date.now() >= Date.parse(reconnectHint.validUntilUtc) ||
    activeOrigin === reconnectHint.origin
  ) {
    return false;
  }
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
  activeOrigin = reconnectHint.origin;
  setSnap({ status: 'reconnecting', since: snap.since || Date.now(), attempts: 0 });
  return true;
}

export function useConnection(): ConnSnapshot {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snap,
  );
}

import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Ack, ErrorCode } from '@myarena/shared';

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
let snap: ConnSnapshot = { status: 'idle', attempts: 0, since: 0, everConnected: false };
const listeners = new Set<() => void>();

function setSnap(patch: Partial<ConnSnapshot>): void {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

/** The shared socket, created on first use. Not connected until connectSocket(). */
export function socketInstance(): Socket {
  if (socket) return socket;
  // Same origin as the page (wss in production). Backoff 1 s up to 10 s with jitter, retried indefinitely
  // so a Render cold start (about a minute) is survived (FR-042).
  socket = io({
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

/** Drop the connection when no room needs it, so an empty server can sleep (FR-041). */
export function disconnectSocket(): void {
  socket?.disconnect();
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

export function useConnection(): ConnSnapshot {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snap,
  );
}

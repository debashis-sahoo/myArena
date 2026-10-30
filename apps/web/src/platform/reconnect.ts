import type { ClientIntent, ServerMessage } from '@myarena/protocol';
import type { RoomState } from './room-state';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';
export type LostReason = 'unavailable' | 'expired' | 'removed' | 'closed' | 'left' | 'superseded';
export type SessionProbe = 'ok' | 'expired' | 'unauthenticated' | 'unknown';

// Close codes after which reconnecting would be wrong: another tab took over, the room ended, or the member left or was removed.
const TERMINAL_CODES: Record<number, LostReason> = { 4001: 'unavailable', 4009: 'superseded', 4010: 'closed', 4011: 'left', 4012: 'removed' };
export const MAX_BACKOFF_MS = 15_000;

export const backoffDelay = (attempt: number, random = Math.random()): number =>
  Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt) * (0.5 + random / 2);

export interface RoomLink { send(intent: ClientIntent): boolean; close(): void; isOpen(): boolean; }

export interface ReconnectOptions {
  roomId: string;
  connect(roomId: string, handlers: {
    onState(state: RoomState): void;
    onMessage(message: ServerMessage): void;
    onClose(event: { code: number }): void;
  }): RoomLink;
  probe(roomId: string): Promise<SessionProbe>;
  handlers: {
    onState(state: RoomState): void;
    onMessage(message: ServerMessage): void;
    onStatus(status: ConnectionStatus): void;
    onLost(reason: LostReason): void;
  };
  random?: () => number;
  isVisible?: () => boolean;
  aliveTimeoutMs?: number;
}

export function createReconnectingConnection(options: ReconnectOptions) {
  const { roomId, handlers } = options;
  const random = options.random ?? Math.random;
  const isVisible = options.isVisible ?? (() => document.visibilityState !== 'hidden');
  const aliveTimeoutMs = options.aliveTimeoutMs ?? 4000;
  let link: RoomLink | null = null;
  let generation = 0;
  let attempt = 0;
  let everConnected = false;
  let finished = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let aliveTimer: ReturnType<typeof setTimeout> | null = null;

  const stopAliveCheck = () => { if (aliveTimer) clearTimeout(aliveTimer); aliveTimer = null; };
  const stopRetry = () => { if (retryTimer) clearTimeout(retryTimer); retryTimer = null; };

  function finish(reason: LostReason): void {
    finished = true;
    stopRetry();
    stopAliveCheck();
    removeListeners();
    handlers.onLost(reason);
  }

  function open(): void {
    const mine = ++generation;
    handlers.onStatus(everConnected ? 'reconnecting' : 'connecting');
    link = options.connect(roomId, {
      onState: (state) => { if (mine === generation) handlers.onState(state); },
      onMessage: (message) => {
        if (mine !== generation) return;
        stopAliveCheck();
        if (message.type === 'snapshot') {
          attempt = 0;
          everConnected = true;
          handlers.onStatus('connected');
        }
        handlers.onMessage(message);
      },
      onClose: (event) => {
        if (mine !== generation || finished) return;
        link = null;
        stopAliveCheck();
        const reason = TERMINAL_CODES[event.code];
        if (reason) { finish(reason); return; }
        handlers.onStatus('reconnecting');
        scheduleReconnect(backoffDelay(attempt++, random()));
      },
    });
  }

  function scheduleReconnect(delay: number): void {
    if (retryTimer || finished) return;
    retryTimer = setTimeout(async () => {
      retryTimer = null;
      const session = await options.probe(roomId);
      if (finished) return;
      if (session === 'expired') finish('expired');
      else if (session === 'unauthenticated') finish('unavailable');
      else open();
    }, delay);
  }

  // A phone that slept can leave a socket that looks open but is dead, so a resumed page confirms it is alive.
  function resume(): void {
    if (finished || !isVisible()) return;
    if (!link) { stopRetry(); scheduleReconnect(0); return; }
    if (!link.isOpen() || aliveTimer) return;
    link.send({ v: 1, type: 'ping', clientActionId: crypto.randomUUID() });
    aliveTimer = setTimeout(() => {
      aliveTimer = null;
      generation += 1;
      link?.close();
      link = null;
      handlers.onStatus('reconnecting');
      stopRetry();
      scheduleReconnect(0);
    }, aliveTimeoutMs);
  }

  const onOnline = () => resume();
  const onPageShow = () => resume();
  const onVisibility = () => resume();
  window.addEventListener('online', onOnline);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibility);
  function removeListeners(): void {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibility);
  }

  open();
  return {
    send: (intent: ClientIntent): boolean => link?.send(intent) ?? false,
    dispose(): void {
      finished = true;
      stopRetry();
      stopAliveCheck();
      removeListeners();
      generation += 1;
      link?.close();
      link = null;
    },
  };
}
export type ReconnectingConnection = ReturnType<typeof createReconnectingConnection>;

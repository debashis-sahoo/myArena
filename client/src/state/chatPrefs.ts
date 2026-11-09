import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a game's chat is open or minimized, remembered on this device (specs/007 contracts/platform-extensions.md section 3).
 * `null` means the game's own default applies. A game reads the value and decides what "open" and "minimized" look like.
 */
export type ChatPref = 'open' | 'minimized' | null;

const PREFIX = 'myarena.chat.';
const memory = new Map<string, ChatPref>();
const listeners = new Set<() => void>();

function read(gameId: string): ChatPref {
  if (memory.has(gameId)) return memory.get(gameId) ?? null;
  let value: ChatPref = null;
  try {
    const raw = localStorage.getItem(PREFIX + gameId);
    value = raw === 'open' || raw === 'minimized' ? raw : null;
  } catch {
    /* storage unavailable: the choice lives in memory for the session */
  }
  memory.set(gameId, value);
  return value;
}

function write(gameId: string, value: 'open' | 'minimized'): void {
  if (read(gameId) === value) return;
  memory.set(gameId, value);
  try {
    localStorage.setItem(PREFIX + gameId, value);
  } catch {
    /* keep the in-memory value */
  }
  listeners.forEach((l) => l());
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useChatPref(gameId: string): [ChatPref, (p: 'open' | 'minimized') => void] {
  const pref = useSyncExternalStore(
    subscribe,
    () => read(gameId),
    () => null,
  );
  const set = useCallback((p: 'open' | 'minimized') => write(gameId, p), [gameId]);
  return [pref, set];
}

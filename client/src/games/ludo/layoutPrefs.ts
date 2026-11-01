import { useSyncExternalStore } from 'react';

export interface LayoutPrefs {
  /** null until the player chooses: short landscape phones then start with chat minimized, other screens with it open. */
  chatOpen: boolean | null;
  activityTab: 'chat' | 'activity';
}

const KEY = 'myarena.ludo.layout';

function read(): Partial<LayoutPrefs> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<LayoutPrefs>;
    return {
      ...(typeof p.chatOpen === 'boolean' ? { chatOpen: p.chatOpen } : {}),
      ...(p.activityTab === 'chat' || p.activityTab === 'activity' ? { activityTab: p.activityTab } : {}),
    };
  } catch {
    return {};
  }
}

let stored: Partial<LayoutPrefs> = read();
let resolved: LayoutPrefs = resolve();
const listeners = new Set<() => void>();

function resolve(): LayoutPrefs {
  return { chatOpen: stored.chatOpen ?? null, activityTab: stored.activityTab ?? 'chat' };
}

export function updateLayoutPrefs(patch: Partial<LayoutPrefs>): void {
  stored = { ...stored, ...patch };
  resolved = resolve();
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable: the preference lasts for this session only */
  }
  listeners.forEach((l) => l());
}

/** Per-device chat state (FR-006), remembered across reloads. */
export function useLayoutPrefs(): LayoutPrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => resolved,
  );
}

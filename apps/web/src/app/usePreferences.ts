import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getPreferences, onPreferencesChange, type Preferences } from '../platform/preferences';

const same = (a: Preferences, b: Preferences) => a.displayName === b.displayName && a.effects === b.effects && a.sound === b.sound;

/** Current preferences, re-rendering when any setter runs. */
export function usePreferences(): Preferences {
  const last = useRef<Preferences | null>(null);
  const getSnapshot = useCallback(() => {
    const next = getPreferences();
    if (last.current && same(last.current, next)) return last.current;
    last.current = next;
    return next;
  }, []);
  return useSyncExternalStore(onPreferencesChange, getSnapshot, getSnapshot);
}

import { useEffect, useRef } from 'react';

/**
 * How many of `keys` appeared since the list was last open. Whatever exists at mount counts as seen,
 * and while `open` is true everything is seen.
 */
export function useUnread(keys: readonly (string | number)[], open: boolean): number {
  const seen = useRef<Set<string | number> | null>(null);
  seen.current ??= new Set(keys);
  useEffect(() => {
    if (open) for (const key of keys) seen.current!.add(key);
  }, [open, keys]);
  if (open) return 0;
  return keys.reduce<number>((count, key) => count + (seen.current!.has(key) ? 0 : 1), 0);
}

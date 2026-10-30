import { useEffect, useRef, useState } from 'react';

/**
 * True once the roll in the latest game message has settled. The server refuses moves until then, so this only
 * keeps the controls honest; it counts down from when the message arrived, so no shared clock is needed.
 */
export function useSettled(key: unknown, settleMsLeft: number): boolean {
  const state = useRef({ key, deadline: performance.now() + settleMsLeft });
  if (state.current.key !== key) state.current = { key, deadline: performance.now() + settleMsLeft };
  const [, rerender] = useState(0);
  useEffect(() => {
    const wait = state.current.deadline - performance.now();
    if (wait <= 0) return undefined;
    const timer = window.setTimeout(() => rerender((count) => count + 1), wait + 5);
    return () => window.clearTimeout(timer);
  }, [key]);
  return performance.now() >= state.current.deadline;
}

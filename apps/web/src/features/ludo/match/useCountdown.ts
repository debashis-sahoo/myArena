import { useEffect, useRef, useState } from 'react';
import type { LudoMatchView } from '@myarena/ludo';

/**
 * Milliseconds left for the current decision, counted down from the moment this update arrived (so no shared clock
 * is needed), or null when there is no limit or nothing to decide. The server's figure includes the roll animation,
 * so it is capped at the turn limit.
 */
export function useCountdown(view: LudoMatchView, seq: number): number | null {
  const received = useRef({ seq, at: performance.now() });
  if (received.current.seq !== seq) received.current = { seq, at: performance.now() };
  const [, tick] = useState(0);
  const base = view.turn.decisionMsLeft;
  useEffect(() => {
    if (base === null) return undefined;
    const timer = window.setInterval(() => tick((count) => count + 1), 250);
    return () => window.clearInterval(timer);
  }, [base, seq]);
  if (base === null || view.turn.phase === 'ENDED') return null;
  const capped = Math.min(base, view.turnLimitSeconds * 1000);
  return Math.max(0, capped - (performance.now() - received.current.at));
}

import { useEffect, useRef } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import { useAnnouncer } from '../../../a11y/announcer';
import { statusText } from '../a11y/describe';

/** The points at which the viewer's own countdown is spoken; never every second. */
export const ANNOUNCE_AT_SECONDS = [10, 5] as const;

/** One plain-language line about what is happening now, announced politely; it also speaks the countdown at 10 and 5 seconds. */
export function StatusBar({ view, settled, rolling, seconds }: { view: LudoMatchView; settled: boolean; rolling: boolean; seconds: number | null }) {
  const announce = useAnnouncer();
  const spoken = useRef<{ turn: string; points: Set<number> }>({ turn: '', points: new Set() });
  const mine = view.turn.seat === view.you && view.you !== null;
  const turnKey = `${view.turn.seat}:${view.turn.phase}:${view.turn.dice}`;

  useEffect(() => {
    if (spoken.current.turn !== turnKey) spoken.current = { turn: turnKey, points: new Set() };
    if (!mine || seconds === null) return;
    const point = ANNOUNCE_AT_SECONDS.find((at) => seconds <= at && !spoken.current.points.has(at));
    if (point === undefined) return;
    for (const at of ANNOUNCE_AT_SECONDS) if (at >= point) spoken.current.points.add(at);
    announce(`${point} seconds left to ${view.turn.phase === 'ROLL' ? 'roll' : 'choose a pawn'}.`);
  }, [seconds, mine, turnKey, announce, view.turn.phase]);

  return <p className="ludo-status" role="status">{statusText(view, settled, !rolling)}</p>;
}

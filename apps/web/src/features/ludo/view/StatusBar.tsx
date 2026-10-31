import { useEffect, useRef } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import { useAnnouncer } from '../../../a11y/announcer';
import { statusText } from '../a11y/describe';
import { useCountdown } from '../match/useCountdown';
import { Die2D } from './Die2D';

/** The points at which the viewer's own countdown is spoken; never every second. */
export const ANNOUNCE_AT_SECONDS = [10, 5] as const;

/** One plain-language line about what is happening now, announced politely, and the time left to decide. */
export function StatusBar({ view, settled, seq, face, rolling, animate }: { view: LudoMatchView; settled: boolean; seq: number; face: number | null; rolling: boolean; animate: boolean }) {
  const left = useCountdown(view, seq);
  const announce = useAnnouncer();
  const spoken = useRef<{ turn: string; points: Set<number> }>({ turn: '', points: new Set() });
  const mine = view.turn.seat === view.you && view.you !== null;
  const turnKey = `${view.turn.seat}:${view.turn.phase}:${view.turn.dice}`;
  const seconds = left === null ? null : Math.ceil(left / 1000);

  useEffect(() => {
    if (spoken.current.turn !== turnKey) spoken.current = { turn: turnKey, points: new Set() };
    if (!mine || seconds === null) return;
    const point = ANNOUNCE_AT_SECONDS.find((at) => seconds <= at && !spoken.current.points.has(at));
    if (point === undefined) return;
    for (const at of ANNOUNCE_AT_SECONDS) if (at >= point) spoken.current.points.add(at);
    announce(`${point} seconds left to ${view.turn.phase === 'ROLL' ? 'roll' : 'choose a pawn'}.`);
  }, [seconds, mine, turnKey, announce, view.turn.phase]);

  return (
    <div className="ludo-status-row">
      <p className="ludo-status" role="status">{statusText(view, settled, !rolling)}</p>
      <Die2D face={face} rolling={rolling} animate={animate} />
      {seconds !== null ? <p className="ludo-countdown" aria-hidden="true">Time left: {seconds} s</p> : null}
    </div>
  );
}

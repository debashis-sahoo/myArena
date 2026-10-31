import { useLayoutEffect, useRef, useState } from 'react';
import { isMoved, planHop, posesAt, type HopPlan, type Pose } from '../view/hops';
import { pawnKey, type PlacedPawn } from '../view/placement';
import type { Point } from '../view/geometry';

const positionsOf = (placed: readonly PlacedPawn[]): Map<string, Point> =>
  new Map(placed.map((item) => [pawnKey(item.seat, item.pawn), { x: item.cx, y: item.cy }]));

/**
 * Plays the latest MOVED event as hops for one viewer and returns the poses of the pins that are moving, or null when
 * everything rests. A new live move finishes the one in progress at once; the first render, a snapshot (no events),
 * instant motion and a hidden page place pins directly, with no replay.
 */
export function useHops(placed: readonly PlacedPawn[], seq: number, events: readonly unknown[] | undefined, instant: boolean): ReadonlyMap<string, Pose> | null {
  const [poses, setPoses] = useState<ReadonlyMap<string, Pose> | null>(null);
  const latest = useRef(placed);
  latest.current = placed;
  const resting = useRef<Map<string, Point> | null>(null);
  const handled = useRef<number | null>(null);
  const frame = useRef(0);

  // Layout effect, so the first frame of a move is already the start pose and the final squares never flash.
  useLayoutEffect(() => {
    if (handled.current === seq) return;
    handled.current = seq;
    cancelAnimationFrame(frame.current);
    setPoses(null);
    const targets = positionsOf(latest.current);
    const before = resting.current;
    resting.current = targets;
    const move = [...(events ?? [])].reverse().find(isMoved);
    if (!move || !before || instant || document.hidden) return;
    const id = pawnKey(move.seat, move.pawn);
    const item = latest.current.find((candidate) => pawnKey(candidate.seat, candidate.pawn) === id);
    const start = before.get(id);
    const target = targets.get(id);
    if (!item || !start || !target) return;
    let captured: Parameters<typeof planHop>[0]['captured'];
    if (move.captured) {
      const capturedId = pawnKey(move.captured.seat, move.captured.pawn);
      const capturedStart = before.get(capturedId);
      const capturedTarget = targets.get(capturedId);
      if (capturedStart && capturedTarget) captured = { key: capturedId, start: capturedStart, target: capturedTarget };
    }
    const plan: HopPlan = planHop({ event: move, color: item.color, start, target, ...(captured ? { captured } : {}) });
    const began = performance.now();
    const step = (now: number): void => {
      const next = posesAt(plan, now - began);
      setPoses(next);
      if (next) frame.current = requestAnimationFrame(step);
    };
    setPoses(posesAt(plan, 0));
    frame.current = requestAnimationFrame(step);
  }, [seq, events, instant]);

  useLayoutEffect(() => {
    const finish = (): void => { if (document.hidden) { cancelAnimationFrame(frame.current); setPoses(null); } };
    document.addEventListener('visibilitychange', finish);
    return () => { document.removeEventListener('visibilitychange', finish); cancelAnimationFrame(frame.current); };
  }, []);

  return poses;
}

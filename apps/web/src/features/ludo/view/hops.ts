import type { Color } from '@myarena/ludo';
import { travelPath, type Point } from './geometry';

export const HOP_MS = 200;
export const MAX_MOVE_MS = 1500;
export const HOP_HEIGHT = 0.42;
export const KNOCK_MS = 500;
const KNOCK_HEIGHT = 1.1;
const SQUASH_FROM = 0.85;

/** A pin's drawn state: its centre, height above the square and the landing squash (1 is natural). */
export interface Pose { x: number; y: number; lift: number; squash: number; }

export interface Segment { from: Point; to: Point; startMs: number; durationMs: number; height: number; }

export interface MovedEvent { kind: 'MOVED'; seat: number; pawn: number; from: number; to: number; captured?: { seat: number; pawn: number }; }

export const isMoved = (event: unknown): event is MovedEvent => {
  const entry = event as Partial<MovedEvent> | null;
  return typeof entry === 'object' && entry !== null && entry.kind === 'MOVED' && Number.isInteger(entry.seat) && Number.isInteger(entry.pawn)
    && Number.isInteger(entry.from) && Number.isInteger(entry.to);
};

export interface HopInput {
  event: MovedEvent;
  color: Color;
  /** Where the pawn stands now on screen, and where the new state puts it (spread out if it shares a square). */
  start: Point;
  target: Point;
  /** Where the captured pawn stands now and where its yard slot is. */
  captured?: { key: string; start: Point; target: Point };
}

export interface HopPlan { segments: Map<string, Segment[]>; totalMs: number; }

const key = (seat: number, pawn: number): string => `${seat}:${pawn}`;

/** One hop per square, 200 ms each (shorter so a move never exceeds 1.5 s); a captured pawn is knocked back once the mover lands. */
export function planHop({ event, color, start, target, captured }: HopInput): HopPlan {
  const path = travelPath(color, event.pawn, event.from, event.to);
  path[path.length - 1] = target;
  const hop = Math.min(HOP_MS, MAX_MOVE_MS / path.length);
  const moverSegments: Segment[] = [];
  let from = start;
  path.forEach((to, index) => {
    moverSegments.push({ from, to, startMs: index * hop, durationMs: hop, height: HOP_HEIGHT });
    from = to;
  });
  const landed = path.length * hop;
  const segments = new Map<string, Segment[]>([[key(event.seat, event.pawn), moverSegments]]);
  let totalMs = landed;
  if (captured) {
    segments.set(captured.key, [{ from: captured.start, to: captured.target, startMs: landed, durationMs: KNOCK_MS, height: KNOCK_HEIGHT }]);
    totalMs = landed + KNOCK_MS;
  }
  return { segments, totalMs };
}

const ease = (t: number): number => t * t * (3 - 2 * t);

/** The pose of one pin `tMs` after the move starts: waiting at the start, mid-hop, or at rest on the end. */
export function poseAt(segments: readonly Segment[], tMs: number): Pose {
  const first = segments[0]!;
  if (tMs < first.startMs) return { x: first.from.x, y: first.from.y, lift: 0, squash: 1 };
  for (const segment of segments) {
    if (tMs >= segment.startMs + segment.durationMs) continue;
    const u = (tMs - segment.startMs) / segment.durationMs;
    const t = ease(u);
    const squash = u > SQUASH_FROM ? 1 - 0.14 * Math.sin((Math.PI * (u - SQUASH_FROM)) / (1 - SQUASH_FROM)) : 1;
    return {
      x: segment.from.x + (segment.to.x - segment.from.x) * t,
      y: segment.from.y + (segment.to.y - segment.from.y) * t,
      lift: Math.sin(u * Math.PI) * segment.height,
      squash,
    };
  }
  const last = segments.at(-1)!;
  return { x: last.to.x, y: last.to.y, lift: 0, squash: 1 };
}

/** The poses of every pin in a plan at one moment, or null once the whole plan is over. */
export function posesAt(plan: HopPlan, tMs: number): Map<string, Pose> | null {
  if (tMs >= plan.totalMs) return null;
  const poses = new Map<string, Pose>();
  for (const [id, segments] of plan.segments) poses.set(id, poseAt(segments, tMs));
  return poses;
}

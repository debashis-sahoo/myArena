import type { Group } from 'three';
import type { Ground } from './geometry';

interface Tween { duration: number; delay: number; elapsed: number; onUpdate: (progress: number) => void; onDone?: () => void; }

/** A small timeline: tweens start after their delay, run for their duration, and report progress from 0 to 1. */
export class Animator {
  private tweens: Tween[] = [];

  get busy(): boolean { return this.tweens.length > 0; }

  add(duration: number, onUpdate: (progress: number) => void, options: { delay?: number; onDone?: () => void } = {}): void {
    this.tweens.push({ duration, delay: options.delay ?? 0, elapsed: 0, onUpdate, ...(options.onDone ? { onDone: options.onDone } : {}) });
  }

  /** Advances every tween; returns true while any remain. */
  update(seconds: number): boolean {
    const finished: Tween[] = [];
    for (const tween of this.tweens) {
      tween.elapsed += seconds;
      if (tween.elapsed < tween.delay) continue;
      const progress = Math.min(1, (tween.elapsed - tween.delay) / tween.duration);
      tween.onUpdate(progress);
      if (progress >= 1) finished.push(tween);
    }
    if (finished.length > 0) {
      this.tweens = this.tweens.filter((tween) => !finished.includes(tween));
      for (const tween of finished) tween.onDone?.();
    }
    return this.busy;
  }

  /** Completes everything at once (reduced motion, a hidden page, or a new state arriving). */
  finishAll(): void {
    const pending = this.tweens;
    this.tweens = [];
    for (const tween of pending) { tween.onUpdate(1); tween.onDone?.(); }
  }
}

export const HOP_SECONDS = 0.2;
const MAX_HOPS_SECONDS = 1.5;
const ease = (t: number): number => t * t * (3 - 2 * t);

/** Hops a pawn square by square along `path`; returns the total time so that a capture can follow it. */
export function hopAlong(animator: Animator, group: Group, path: readonly Ground[], delay = 0): number {
  if (path.length === 0) return 0;
  const hop = Math.min(HOP_SECONDS, MAX_HOPS_SECONDS / path.length);
  let from = { x: group.position.x, z: group.position.z };
  path.forEach((to, index) => {
    const start = from;
    animator.add(hop, (progress) => {
      const t = ease(progress);
      group.position.x = start.x + (to.x - start.x) * t;
      group.position.z = start.z + (to.z - start.z) * t;
      group.position.y = Math.sin(progress * Math.PI) * 0.42;
    }, { delay: delay + index * hop });
    from = to;
  });
  return delay + path.length * hop;
}

/** A captured pawn is knocked up and over, back to its base slot. */
export function knockBack(animator: Animator, group: Group, to: Ground, delay: number): number {
  const start = { x: group.position.x, z: group.position.z };
  const duration = 0.6;
  animator.add(duration, (progress) => {
    const t = ease(progress);
    group.position.x = start.x + (to.x - start.x) * t;
    group.position.z = start.z + (to.z - start.z) * t;
    group.position.y = Math.sin(progress * Math.PI) * 1.6;
    group.rotation.z = Math.sin(progress * Math.PI) * 0.9;
  }, { delay, onDone: () => { group.rotation.z = 0; group.position.y = 0; } });
  return delay + duration;
}

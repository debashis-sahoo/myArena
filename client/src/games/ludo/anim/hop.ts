import { HOP_MS, LAND_PAUSE_MS } from '@myarena/shared';

export interface Point {
  x: number;
  y: number;
}

/** Reduced motion: a plain 120 ms step per square. */
export const REDUCED_STEP_MS = 120;

function finished(a: Animation): Promise<void> {
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

export interface PawnParts {
  /** Moves the pawn between squares (translate only). */
  outer: HTMLElement;
  /** Carries the hop arc and squash-and-stretch. */
  inner: HTMLElement;
  shadow: HTMLElement;
}

/** Translate that centres the pawn's hit box on a point. */
export function place(p: Point, anchor: number): string {
  return `translate(${p.x - anchor}px, ${p.y - anchor}px)`;
}

/**
 * One separate parabolic hop per square, in order, never sliding or teleporting (FR-020). `onLand` fires after each
 * landing so the caller can add the dust puff and the square flash.
 */
export async function hopAlong(
  parts: PawnParts,
  from: Point,
  squares: Point[],
  cell: number,
  anchor: number,
  reduced: boolean,
  onLand: (p: Point, index: number) => void,
): Promise<void> {
  let previous = from;
  for (let i = 0; i < squares.length; i++) {
    const target = squares[i] as Point;
    const move = parts.outer.animate([{ transform: place(previous, anchor) }, { transform: place(target, anchor) }], {
      duration: reduced ? REDUCED_STEP_MS : HOP_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    if (!reduced) {
      const h = cell * 0.9;
      parts.inner.animate(
        [
          { offset: 0, transform: 'translateY(0) scale(1.12, 0.86)', easing: 'ease-out' },
          { offset: 0.15, transform: `translateY(${-h * 0.4}px) scale(0.92, 1.12)`, easing: 'ease-out' },
          { offset: 0.5, transform: `translateY(${-h}px) scale(0.96, 1.07)`, easing: 'ease-in' },
          { offset: 0.85, transform: `translateY(${-h * 0.25}px) scale(0.98, 1.03)`, easing: 'ease-in' },
          { offset: 1, transform: 'translateY(0) scale(1.1, 0.88)' },
        ],
        { duration: HOP_MS, easing: 'linear' },
      );
      parts.shadow.animate(
        [
          { transform: 'scale(1)', opacity: 0.55 },
          { transform: 'scale(0.6)', opacity: 0.22, offset: 0.5 },
          { transform: 'scale(1)', opacity: 0.55 },
        ],
        { duration: HOP_MS, easing: 'ease-in-out' },
      );
    }
    await finished(move);
    onLand(target, i);
    previous = target;
  }
  if (!reduced) {
    // Settle out of the landing squash.
    await finished(
      parts.inner.animate([{ transform: 'scale(1.1, 0.88)' }, { transform: 'scale(1, 1)' }], {
        duration: Math.min(LAND_PAUSE_MS, 200),
        easing: 'ease-out',
      }),
    );
  }
}

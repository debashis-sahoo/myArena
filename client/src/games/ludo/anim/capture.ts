import { CAPTURE_MS, HOME_CELEBRATE_MS } from '@myarena/shared';
import { place, type PawnParts, type Point } from './hop';
import { spawnPuff } from './puff';

function finished(a: Animation): Promise<void> {
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** The captured pawn lifts, spins, and arcs back to its base spot with a burst (reduced motion: a quick fade). */
export async function bounceHome(
  parts: PawnParts,
  layer: HTMLElement,
  from: Point,
  to: Point,
  cell: number,
  anchor: number,
  reduced: boolean,
): Promise<void> {
  if (reduced) {
    const fade = parts.outer.animate(
      [
        { transform: place(from, anchor), opacity: 1 },
        { transform: place(from, anchor), opacity: 0, offset: 0.4 },
        { transform: place(to, anchor), opacity: 0, offset: 0.41 },
        { transform: place(to, anchor), opacity: 1 },
      ],
      { duration: 300, fill: 'forwards' },
    );
    await finished(fade);
    return;
  }
  spawnPuff(layer, from.x, from.y, cell, true);
  const mid: Point = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - cell * 2.4 };
  const move = parts.outer.animate(
    [
      { transform: place(from, anchor), easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      { transform: place(mid, anchor), offset: 0.5, easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
      { transform: place(to, anchor) },
    ],
    { duration: CAPTURE_MS, fill: 'forwards' },
  );
  parts.inner.animate(
    [
      { transform: 'rotate(0deg) scale(1.2)' },
      { transform: 'rotate(360deg) scale(1.1)', offset: 0.5 },
      { transform: 'rotate(720deg) scale(1.15, 0.85)', offset: 0.9 },
      { transform: 'rotate(720deg) scale(1)' },
    ],
    { duration: CAPTURE_MS, easing: 'ease-in-out' },
  );
  await finished(move);
  spawnPuff(layer, to.x, to.y, cell);
}

/** A sparkle burst on the HOME centre when a pawn arrives. */
export function celebrateHome(layer: HTMLElement, x: number, y: number, cell: number, reduced: boolean): void {
  if (reduced) return;
  const root = document.createElement('div');
  root.className = 'sparkle';
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  layer.appendChild(root);
  const animations: Animation[] = [];
  for (let i = 0; i < 8; i++) {
    const star = document.createElement('i');
    star.className = 'sparkle-star';
    star.style.fontSize = `${Math.max(10, cell * 0.5)}px`;
    star.textContent = '\u2726';
    root.appendChild(star);
    const angle = (Math.PI * 2 * i) / 8;
    animations.push(
      star.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * cell * 1.6}px), calc(-50% + ${Math.sin(angle) * cell * 1.6}px)) scale(1.1)`,
            opacity: 0,
          },
        ],
        { duration: HOME_CELEBRATE_MS, easing: 'ease-out', fill: 'forwards' },
      ),
    );
  }
  void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => root.remove());
}

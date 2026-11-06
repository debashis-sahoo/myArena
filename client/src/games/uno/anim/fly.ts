import { Fragment, createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { UNO_FLY_MAX_MS, UNO_FLY_MS, UNO_FLY_STAGGER_MS } from '@myarena/shared';
import { CardFace } from '../CardFace';
import { CARD_ASPECT } from '../useFit';

/** Reduced motion: every flight becomes this fade with a short slide. */
export const REDUCED_FADE_MS = 150;
const ABSORB_MS = 120;
const REDUCED_SLIDE_PX = 14;

/** A card-sized spot on screen (viewport pixels): where a flight starts or ends. */
export interface Box {
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Degrees of tilt the element had (a fanned hand card). */
  rotation: number;
}

function rotationOf(el: HTMLElement): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return 0;
  try {
    const m = new DOMMatrixReadOnly(t);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  } catch {
    return 0;
  }
}

/** Centre and layout size of an element (tilt does not inflate the size); `height` overrides the size, keeping the card ratio. */
export function boxOf(el: Element | null, height?: number): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  let width = r.width;
  let h = r.height;
  let rotation = 0;
  if (el instanceof HTMLElement) {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      width = el.offsetWidth;
      h = el.offsetHeight;
    }
    rotation = rotationOf(el);
  }
  if (height !== undefined) {
    h = height;
    width = height * CARD_ASPECT;
  }
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, width, height: h, rotation: height === undefined ? rotation : 0 };
}

let layer: HTMLElement | null = null;

/** The fixed, click-through layer all flying cards live in. */
export function ghostLayer(): HTMLElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'un-ghost-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

export interface Ghost {
  el: HTMLElement;
  width: number;
  height: number;
  back: HTMLElement | null;
  front: HTMLElement | null;
  remove(): void;
}

/** A card copy that moves above the page: a back, plus the face of `card` when it has one. Call from outside a React render. */
export function createGhost(card: number | null, height: number, faceUp: boolean): Ghost {
  const h = Math.max(8, Math.round(height));
  const w = Math.round(h * CARD_ASPECT);
  const el = document.createElement('div');
  el.className = 'un-ghost';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.transform = 'translate(-9999px, -9999px)';
  ghostLayer().appendChild(el);

  const root = createRoot(el);
  const faces = [createElement(CardFace, { key: 'back', card: null, height: h, className: 'un-ghost-back' })];
  if (card !== null) faces.push(createElement(CardFace, { key: 'front', card, height: h, className: 'un-ghost-front' }));
  flushSync(() => root.render(createElement(Fragment, null, ...faces)));

  const back = el.querySelector<HTMLElement>('.un-ghost-back');
  const front = el.querySelector<HTMLElement>('.un-ghost-front');
  if (faceUp && back && front) back.style.transform = 'scaleX(0)';
  else if (front) front.style.transform = 'scaleX(0)';

  let gone = false;
  return {
    el,
    width: w,
    height: h,
    back,
    front,
    remove() {
      if (gone) return;
      gone = true;
      el.remove();
      window.setTimeout(() => root.unmount(), 0);
    },
  };
}

/** Turns a back-first ghost over to its face (a squash of the back, then of the face), starting after `delayMs`. */
export function scheduleFlip(g: Ghost, delayMs: number, durationMs: number): void {
  const half = durationMs / 2;
  g.back?.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { delay: delayMs, duration: half, easing: 'ease-in', fill: 'both' });
  g.front?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { delay: delayMs + half, duration: half, easing: 'ease-out', fill: 'both' });
}

/** Transform that puts a ghost's centre on a box at a scale and tilt. */
export function placeGhost(g: Ghost, cx: number, cy: number, scale: number, rotation: number): string {
  return `translate(${(cx - g.width / 2).toFixed(1)}px, ${(cy - g.height / 2).toFixed(1)}px) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
}

export async function settled(a: Animation): Promise<void> {
  try {
    await a.finished;
  } catch {
    /* cancelled */
  }
}

/** Gap between consecutive cards of one draw: 110 ms, squeezed so the whole draw never runs past 1.2 s. */
export function flyStagger(count: number): number {
  return count > 1 ? Math.min(UNO_FLY_STAGGER_MS, (UNO_FLY_MAX_MS - UNO_FLY_MS) / (count - 1)) : 0;
}

export interface FlyItem {
  from: Box;
  to: Box;
  /** Face revealed by the flip; null for a card that stays a back. */
  card: number | null;
  /** Turn the back over to `card` on landing. */
  flip: boolean;
  delayMs?: number;
  /** Fade out on arrival instead of ending up on top of whatever is underneath (cards that vanish into a seat). */
  absorb?: boolean;
  /** Runs at landing, just before the ghost goes (reveal the real card here). */
  onLand?: () => void;
}

/**
 * Backs fly from `from` to `to` (a gentle arc, 400 ms each) and, with `flip`, turn to their face as they land. Resolves
 * when the last one has landed and its ghost is gone. Reduced motion: a 150 ms fade with a short slide, no arc.
 */
export async function flyCards(items: readonly FlyItem[], reduced: boolean): Promise<void> {
  const duration = reduced ? REDUCED_FADE_MS : UNO_FLY_MS;
  await Promise.all(
    items.map(async (it) => {
      const delay = reduced ? 0 : (it.delayMs ?? 0);
      const ghost = createGhost(it.card, Math.max(it.from.height, it.to.height), false);
      const safety = window.setTimeout(() => ghost.remove(), delay + duration + 2000);
      const s0 = it.from.height / ghost.height;
      const s1 = it.to.height / ghost.height;
      const dx = it.to.cx - it.from.cx;
      const dy = it.to.cy - it.from.cy;
      const dist = Math.hypot(dx, dy);

      let frames: Keyframe[];
      if (reduced) {
        const k = dist > 0 ? Math.min(REDUCED_SLIDE_PX, dist) / dist : 0;
        frames = [
          { transform: placeGhost(ghost, it.to.cx - dx * k, it.to.cy - dy * k, s1, 0), opacity: 0 },
          { transform: placeGhost(ghost, it.to.cx, it.to.cy, s1, 0), opacity: 1 },
        ];
        if (it.flip && ghost.back && ghost.front) {
          ghost.back.style.transform = 'scaleX(0)';
          ghost.front.style.transform = 'scaleX(1)';
        }
      } else {
        const arc = Math.min(36, 0.12 * dist);
        frames = [
          { transform: placeGhost(ghost, it.from.cx, it.from.cy, s0, it.from.rotation), offset: 0 },
          { transform: placeGhost(ghost, (it.from.cx + it.to.cx) / 2, (it.from.cy + it.to.cy) / 2 - arc, ((s0 + s1) / 2) * 1.06, 0), offset: 0.5 },
          { transform: placeGhost(ghost, it.to.cx, it.to.cy, s1, it.to.rotation), offset: 1 },
        ];
        if (it.flip && it.card !== null) scheduleFlip(ghost, delay + duration * 0.68, duration * 0.32);
      }

      const anim = ghost.el.animate(frames, { duration, delay, easing: 'cubic-bezier(0.25, 0.7, 0.3, 1)', fill: 'both' });
      await settled(anim);
      window.clearTimeout(safety);
      it.onLand?.();
      if (it.absorb && !reduced) {
        await settled(ghost.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ABSORB_MS, fill: 'forwards' }));
      }
      ghost.remove();
    }),
  );
}

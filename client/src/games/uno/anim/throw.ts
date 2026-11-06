import { UNO_THROW_MS } from '@myarena/shared';
import { REDUCED_FADE_MS, createGhost, ghostLayer, placeGhost, scheduleFlip, settled, type Box } from './fly';

export interface ThrowOptions {
  from: Box;
  /** The discard pile's top-card slot. */
  to: Box;
  card: number;
  /** An opponent's card: a back that turns over to its face near the end. */
  faceDown: boolean;
  reduced: boolean;
}

/** A card that has landed; it stays on top of the pile until `remove()` so the screen can commit underneath it. */
export interface Landed {
  remove(): void;
}

const SAMPLES = 16;
const REDUCED_SLIDE_PX = 14;

/**
 * Parabolic throw (450 ms): the arc peaks at min(120 px, 0.35 x distance), the card tilts a little, grows 8% at the peak and
 * lands with a shadow that follows it along the ground. Reduced motion: a 150 ms fade and short slide, no arc.
 */
export async function throwCard(opts: ThrowOptions): Promise<Landed> {
  const { from, to, card, faceDown, reduced } = opts;
  const ghost = createGhost(card, Math.max(from.height, to.height), !faceDown);
  const s0 = from.height / ghost.height;
  const s1 = to.height / ghost.height;
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const dist = Math.hypot(dx, dy);

  let shadow: HTMLElement | null = null;
  const safety = window.setTimeout(() => landed.remove(), UNO_THROW_MS + 2500);
  const landed: Landed = {
    remove() {
      window.clearTimeout(safety);
      ghost.remove();
      shadow?.remove();
    },
  };

  if (reduced) {
    if (faceDown && ghost.back && ghost.front) {
      ghost.back.style.transform = 'scaleX(0)';
      ghost.front.style.transform = 'scaleX(1)';
    }
    const k = dist > 0 ? Math.min(REDUCED_SLIDE_PX, dist) / dist : 0;
    await settled(
      ghost.el.animate(
        [
          { transform: placeGhost(ghost, to.cx - dx * k, to.cy - dy * k, s1, 0), opacity: 0 },
          { transform: placeGhost(ghost, to.cx, to.cy, s1, 0), opacity: 1 },
        ],
        { duration: REDUCED_FADE_MS, easing: 'ease-out', fill: 'forwards' },
      ),
    );
    return landed;
  }

  const peak = Math.min(120, 0.35 * dist);
  const tilt = dx >= 0 ? 8 : -8;
  const frames: Keyframe[] = [];
  const shadowFrames: Keyframe[] = [];
  shadow = document.createElement('div');
  shadow.className = 'un-ghost-shadow';
  shadow.style.width = `${ghost.width}px`;
  shadow.style.height = `${ghost.height}px`;
  shadow.style.transform = 'translate(-9999px, -9999px)';
  ghostLayer().insertBefore(shadow, ghost.el);

  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const p = 1 - (1 - t) * (1 - t); // fast off the hand, soft at the pile
    const hump = 4 * t * (1 - t);
    const cx = from.cx + dx * p;
    const base = from.cy + dy * p;
    const scale = (s0 + (s1 - s0) * p) * (1 + 0.08 * hump);
    frames.push({ transform: placeGhost(ghost, cx, base - peak * hump, scale, from.rotation * (1 - p) + tilt * hump), offset: t });
    shadowFrames.push({
      transform: placeGhost(ghost, cx, base + ghost.height * 0.04, scale * (1 - 0.14 * hump), 0),
      opacity: 0.55 * (1 - 0.65 * hump) * Math.min(1, t * 6),
      offset: t,
    });
  }

  if (faceDown) scheduleFlip(ghost, UNO_THROW_MS * 0.66, UNO_THROW_MS * 0.28);
  const timing = { duration: UNO_THROW_MS, easing: 'linear', fill: 'forwards' } as const;
  shadow.animate(shadowFrames, timing);
  await settled(ghost.el.animate(frames, timing));
  // The shadow only lingers a moment: the card itself stays until the caller removes it.
  const shadowEl = shadow;
  void settled(shadowEl.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })).then(() => shadowEl.remove());
  return landed;
}

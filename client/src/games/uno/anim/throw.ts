import { UNO_FINISH_THROW_MS, UNO_HOLD_FRACTION, UNO_HOLD_LIFT_MS, UNO_RETURN_MS, UNO_THROW_MS } from '@myarena/shared';
import { REDUCED_FADE_MS, createGhost, ghostLayer, placeGhost, scheduleFlip, settled, type Box, type Ghost } from './fly';

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
 * The arc itself: the ghost flies `from` -> `to` over `durationMs` on a parabola that peaks at min(120 px, 0.35 x distance), tilts a
 * little, grows 8% at the peak and lands with a shadow that follows it along the ground. The ghost stays until `remove()`.
 */
async function arcThrow(ghost: Ghost, from: Box, to: Box, durationMs: number, faceDown: boolean): Promise<Landed> {
  const s0 = from.height / ghost.height;
  const s1 = to.height / ghost.height;
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const dist = Math.hypot(dx, dy);

  let shadow: HTMLElement | null = null;
  const safety = window.setTimeout(() => landed.remove(), durationMs + 2500);
  const landed: Landed = {
    remove() {
      window.clearTimeout(safety);
      ghost.remove();
      shadow?.remove();
    },
  };

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

  if (faceDown) scheduleFlip(ghost, durationMs * 0.66, durationMs * 0.28);
  const timing = { duration: durationMs, easing: 'linear', fill: 'forwards' } as const;
  shadow.animate(shadowFrames, timing);
  await settled(ghost.el.animate(frames, timing));
  // The shadow only lingers a moment: the card itself stays until the caller removes it.
  const shadowEl = shadow;
  void settled(shadowEl.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })).then(() => shadowEl.remove());
  return landed;
}

/**
 * Parabolic throw (450 ms). Reduced motion: a 150 ms fade and short slide, no arc.
 */
export async function throwCard(opts: ThrowOptions): Promise<Landed> {
  const { from, to, card, faceDown, reduced } = opts;
  const ghost = createGhost(card, Math.max(from.height, to.height), !faceDown);

  if (reduced) {
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const dist = Math.hypot(dx, dy);
    const s1 = to.height / ghost.height;
    if (faceDown && ghost.back && ghost.front) {
      ghost.back.style.transform = 'scaleX(0)';
      ghost.front.style.transform = 'scaleX(1)';
    }
    const k = dist > 0 ? Math.min(REDUCED_SLIDE_PX, dist) / dist : 0;
    const safety = window.setTimeout(() => landed.remove(), UNO_THROW_MS + 2500);
    const landed: Landed = {
      remove() {
        window.clearTimeout(safety);
        ghost.remove();
      },
    };
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

  return arcThrow(ghost, from, to, UNO_THROW_MS, faceDown);
}

// ---------- staged play: hold, finish, return (specs/007 US2) ----------

export interface HoldOptions {
  /** The card's slot in the hand. */
  from: Box;
  /** The discard pile's top-card slot. */
  to: Box;
  card: number;
  reduced: boolean;
  /** The hand card element (carries `data-pending` under reduced motion). */
  handEl: HTMLElement | null;
}

/** A card that hovers part of the way to the pile while the server answers. It changes nothing on the table itself. */
export interface HeldCard {
  /** Plays the rest of the throw once the server confirmed the play (260 ms); resolves when the card has landed. */
  finish(pile: Box): Promise<Landed>;
  /** Flies back to the hand slot (220 ms) after a refusal or silence, then disappears. */
  returnTo(hand: Box | null): Promise<void>;
  remove(): void;
}

/** Where the ghost is right now (mid-animation included), read from its computed transform. */
function currentBox(ghost: Ghost): Box {
  const m = new DOMMatrixReadOnly(getComputedStyle(ghost.el).transform);
  const scale = Math.hypot(m.a, m.b) || 1;
  return {
    cx: m.e + ghost.width / 2,
    cy: m.f + ghost.height / 2,
    width: ghost.width * scale,
    height: ghost.height * scale,
    rotation: (Math.atan2(m.b, m.a) * 180) / Math.PI,
  };
}

/**
 * The card lifts to a hold pose `UNO_HOLD_FRACTION` of the way to the pile in `UNO_HOLD_LIFT_MS`, with a gold ring. Reduced motion: no
 * ghost; the hand card carries `data-pending` (a ring) and the confirmation uses the plain 150 ms fade.
 */
export function holdCard(opts: HoldOptions): HeldCard {
  const { from, to, card, reduced, handEl } = opts;

  if (reduced) {
    handEl?.setAttribute('data-pending', 'true');
    const clear = (): void => handEl?.removeAttribute('data-pending');
    return {
      async finish(pile) {
        clear();
        return throwCard({ from, to: pile, card, faceDown: false, reduced: true });
      },
      async returnTo() {
        clear();
      },
      remove: clear,
    };
  }

  const ghost = createGhost(card, Math.max(from.height, to.height), true);
  ghost.el.classList.add('un-ghost-held');
  const s0 = from.height / ghost.height;
  const s1 = to.height / ghost.height;
  const px = from.cx + (to.cx - from.cx) * UNO_HOLD_FRACTION;
  const py = from.cy + (to.cy - from.cy) * UNO_HOLD_FRACTION;
  const sHold = (s0 + (s1 - s0) * UNO_HOLD_FRACTION) * 1.08;
  ghost.el.animate([{ transform: placeGhost(ghost, from.cx, from.cy, s0, from.rotation) }, { transform: placeGhost(ghost, px, py, sHold, 0) }], {
    duration: UNO_HOLD_LIFT_MS,
    easing: 'ease-out',
    fill: 'forwards',
  });

  return {
    async finish(pile) {
      const at = currentBox(ghost);
      ghost.el.getAnimations().forEach((a) => a.cancel());
      ghost.el.classList.remove('un-ghost-held');
      return arcThrow(ghost, at, pile, UNO_FINISH_THROW_MS, false);
    },
    async returnTo(hand) {
      if (!hand) {
        ghost.remove();
        return;
      }
      const at = currentBox(ghost);
      ghost.el.getAnimations().forEach((a) => a.cancel());
      ghost.el.classList.remove('un-ghost-held');
      await settled(
        ghost.el.animate(
          [
            { transform: placeGhost(ghost, at.cx, at.cy, at.height / ghost.height, at.rotation) },
            { transform: placeGhost(ghost, hand.cx, hand.cy, hand.height / ghost.height, hand.rotation) },
          ],
          { duration: UNO_RETURN_MS, easing: 'ease-in-out', fill: 'forwards' },
        ),
      );
      ghost.remove();
    },
    remove: () => ghost.remove(),
  };
}

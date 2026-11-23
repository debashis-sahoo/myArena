import { ROLL_TUMBLE_MS } from '@myarena/shared';

/** Cube rotation [rotateX, rotateY] in degrees that brings each face toward the viewer (opposite faces sum to 7). */
const FACE_ROTATION: Record<number, readonly [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  2: [0, -90],
  5: [0, 90],
  3: [-90, 0],
  4: [90, 0],
};

function angles(value: number): readonly [number, number] {
  return FACE_ROTATION[value] ?? FACE_ROTATION[1]!;
}

/** The resting orientation that shows `value`. The tumble ends exactly here, so the shown face equals the server result. */
export function faceTransform(value: number): string {
  const [x, y] = angles(value);
  return `rotateX(${x}deg) rotateY(${y}deg) rotateZ(0deg)`;
}

export interface DiceParts {
  /** Moves the die through the throw arc. */
  throwEl: HTMLElement;
  /** The 3D cube that spins. */
  cubeEl: HTMLElement;
  shadowEl: HTMLElement;
  /** The console wrapper that shakes on each landing. */
  shakeEl: HTMLElement;
  trayWidth: number;
  trayHeight: number;
}

const OPTS: KeyframeAnimationOptions = { duration: ROLL_TUMBLE_MS, easing: 'linear', fill: 'forwards' };

function finished(a: Animation): Promise<void> {
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

/** Rolls along the tray: the main spin is about the vertical axis in the travel direction, with a smaller forward tumble. */
function tumbleKeyframes(from: number, to: number, dir: number, fwd: number): Keyframe[] {
  const [x0, y0] = angles(from);
  const [fx, fy] = angles(to);
  const rot = (x: number, y: number, z: number): string => `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
  return [
    { offset: 0, transform: rot(x0, y0, 0) },
    { offset: 0.1, transform: rot(x0 + fwd * 260, y0 + dir * 390, dir * 34), easing: 'cubic-bezier(.2,.7,.35,1)' },
    { offset: 0.28, transform: rot(fx + fwd * 570, fy + dir * 730, dir * 76) },
    { offset: 0.43, transform: rot(fx + fwd * 390, fy + dir * 520, dir * 48) },
    { offset: 0.56, transform: rot(fx + fwd * 245, fy + dir * 350, dir * 28) },
    { offset: 0.68, transform: rot(fx + fwd * 145, fy + dir * 230, dir * 16) },
    { offset: 0.78, transform: rot(fx + fwd * 58, fy + dir * 96, dir * 7) },
    { offset: 0.89, transform: rot(fx + fwd * 12, fy + dir * 24, dir * 2), easing: 'cubic-bezier(.25,.8,.25,1)' },
    { offset: 0.95, transform: rot(fx - fwd * 4, fy - dir * 6, -dir * 0.8) },
    { offset: 1, transform: rot(fx, fy, 0) },
  ];
}

/** Throw arc: lift, three decaying bounces (about 100%, 45% and 18% of the tray height), travel that slows to a stop, settle. */
function throwKeyframes(w: number, h: number, dir: number): Keyframe[] {
  const up = 'cubic-bezier(0.2, 0.7, 0.4, 1)';
  const down = 'cubic-bezier(0.6, 0, 0.9, 0.5)';
  const t = (x: number, y: number, s: number): string => `translate(${dir * x * w}px, ${y * h}px) scale(${s})`;
  return [
    { offset: 0, transform: t(-0.3, 0, 1), easing: up },
    { offset: 0.12, transform: t(-0.22, -0.58, 1.18), easing: down },
    { offset: 0.29, transform: t(-0.1, 0, 0.97), easing: up },
    { offset: 0.42, transform: t(-0.025, -0.26, 1.08), easing: down },
    { offset: 0.55, transform: t(0.03, 0, 0.985), easing: up },
    { offset: 0.66, transform: t(0.045, -0.09, 1.035), easing: down },
    { offset: 0.75, transform: t(0.025, 0, 0.995), easing: 'ease-out' },
    { offset: 0.84, transform: t(0.012, -0.025, 1.008), easing: 'ease-in' },
    { offset: 0.91, transform: t(0.003, 0, 1), easing: 'ease-out' },
    { offset: 1, transform: t(0, 0, 1) },
  ];
}

function shadowKeyframes(w: number, dir: number): Keyframe[] {
  const s = (x: number, sx: number, sy: number): string => `translateX(${dir * x * w}px) scale(${sx}, ${sy})`;
  return [
    { offset: 0, transform: s(-0.3, 1, 1), opacity: 0.52, filter: 'blur(2px)' },
    { offset: 0.12, transform: s(-0.22, 0.58, 0.52), opacity: 0.18, filter: 'blur(5px)' },
    { offset: 0.29, transform: s(-0.1, 1.08, 1.08), opacity: 0.64, filter: 'blur(1px)' },
    { offset: 0.42, transform: s(-0.025, 0.78, 0.72), opacity: 0.34, filter: 'blur(4px)' },
    { offset: 0.55, transform: s(0.03, 1.04, 1.03), opacity: 0.58, filter: 'blur(1.5px)' },
    { offset: 0.66, transform: s(0.045, 0.9, 0.84), opacity: 0.46, filter: 'blur(3px)' },
    { offset: 0.75, transform: s(0.025, 1.015, 1.01), opacity: 0.56, filter: 'blur(1.8px)' },
    { offset: 0.91, transform: s(0.003, 0.99, 0.99), opacity: 0.53, filter: 'blur(2.2px)' },
    { offset: 1, transform: s(0, 1, 1), opacity: 0.55, filter: 'blur(2px)' },
  ];
}

const BLUR_KEYFRAMES: Keyframe[] = [
  { offset: 0, filter: 'blur(0px)' },
  { offset: 0.15, filter: 'blur(3px)' },
  { offset: 0.55, filter: 'blur(2.5px)' },
  { offset: 0.8, filter: 'blur(0.6px)' },
  { offset: 1, filter: 'blur(0px)' },
];

/** A short decaying jolt at each of the three landings. */
function shakeKeyframes(): Keyframe[] {
  const hit = (offset: number, amp: number): Keyframe[] => [
    { offset: offset - 0.005, transform: 'translate(0, 0)' },
    { offset, transform: `translate(${-amp}px, ${amp * 1.2}px)` },
    { offset: offset + 0.03, transform: `translate(${amp * 0.7}px, ${-amp * 0.6}px)` },
    { offset: offset + 0.06, transform: 'translate(0, 0)' },
  ];
  return [{ offset: 0, transform: 'translate(0, 0)' }, ...hit(0.3, 4), ...hit(0.54, 2.5), ...hit(0.72, 1.4), { offset: 1, transform: 'translate(0, 0)' }];
}

/**
 * Plays the tumble and settles flat on `to`. The animation takes the server's result as input; it never decides it.
 * Reduced motion: no spin, blur, or shake; a short fade and scale pulse onto the result face.
 */
export async function playRoll(parts: DiceParts, from: number, to: number, reduced: boolean): Promise<void> {
  const { throwEl, cubeEl, shadowEl, shakeEl, trayWidth, trayHeight } = parts;
  cubeEl.style.transform = faceTransform(to);
  if (reduced) {
    const fade = cubeEl.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    const pulse = throwEl.animate(
      [{ transform: 'scale(0.9)' }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'scale(1)' }],
      { duration: 200, easing: 'ease-out' },
    );
    await Promise.all([finished(fade), finished(pulse)]);
    return;
  }
  const dir = Math.random() < 0.5 ? -1 : 1;
  const fwd = Math.random() < 0.5 ? -1 : 1;
  const animations = [
    cubeEl.animate(tumbleKeyframes(from, to, dir, fwd), OPTS),
    throwEl.animate(throwKeyframes(trayWidth, trayHeight, dir), OPTS),
    shadowEl.animate(shadowKeyframes(trayWidth, dir), OPTS),
    throwEl.animate(BLUR_KEYFRAMES, OPTS),
    shakeEl.animate(shakeKeyframes(), OPTS),
  ];
  await Promise.all(animations.map(finished));
  // Hand the final pose back to the stylesheet / React so no animation is left holding styles.
  animations.forEach((a) => a.cancel());
}

export async function playRollCancellable(
  parts: DiceParts,
  from: number,
  to: number,
  reduced: boolean,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    parts.cubeEl.style.transform = faceTransform(to);
    return;
  }
  const originalAnimate = parts.cubeEl.getAnimations.bind(parts.cubeEl);
  const started = new Set<Animation>();
  const collect = (): void => {
    for (const animation of originalAnimate()) started.add(animation);
    for (const animation of parts.throwEl.getAnimations()) started.add(animation);
    for (const animation of parts.shadowEl.getAnimations()) started.add(animation);
    for (const animation of parts.shakeEl.getAnimations()) started.add(animation);
  };
  const cancel = (): void => {
    collect();
    started.forEach((animation) => animation.cancel());
    parts.cubeEl.style.transform = faceTransform(to);
    parts.shadowEl.style.transform = '';
    parts.shadowEl.style.opacity = '';
    parts.shadowEl.style.filter = '';
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    await playRoll(parts, from, to, reduced);
  } finally {
    signal.removeEventListener('abort', cancel);
    if (signal.aborted) cancel();
  }
}

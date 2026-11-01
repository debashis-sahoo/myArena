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
    { offset: 0.12, transform: rot(x0 + fwd * 300, y0 + dir * 420, dir * 40) },
    { offset: 0.3, transform: rot(fx + fwd * 540, fy + dir * 700, dir * 70) },
    { offset: 0.42, transform: rot(fx + fwd * 380, fy + dir * 520, dir * 45) },
    { offset: 0.54, transform: rot(fx + fwd * 250, fy + dir * 360, dir * 22) },
    { offset: 0.62, transform: rot(fx + fwd * 160, fy + dir * 270, dir * 12) },
    { offset: 0.72, transform: rot(fx + fwd * 70, fy + dir * 140, dir * 6) },
    { offset: 0.85, transform: rot(fx + fwd * 18, fy + dir * 34, dir * 2) },
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
    { offset: 0.12, transform: t(-0.22, -1, 1.25), easing: down },
    { offset: 0.3, transform: t(-0.1, 0, 1.04), easing: up },
    { offset: 0.42, transform: t(-0.03, -0.45, 1.12), easing: down },
    { offset: 0.54, transform: t(0.03, 0, 1.02), easing: up },
    { offset: 0.62, transform: t(0.04, -0.18, 1.05), easing: down },
    { offset: 0.72, transform: t(0.025, 0, 1), easing: 'ease-out' },
    { offset: 0.85, transform: t(0.008, -0.03, 1), easing: 'ease-in' },
    { offset: 1, transform: t(0, 0, 1) },
  ];
}

function shadowKeyframes(w: number, dir: number): Keyframe[] {
  const s = (x: number, k: number): string => `translateX(${dir * x * w}px) scale(${k})`;
  return [
    { offset: 0, transform: s(-0.3, 1), opacity: 0.55 },
    { offset: 0.12, transform: s(-0.22, 0.55), opacity: 0.2 },
    { offset: 0.3, transform: s(-0.1, 1.05), opacity: 0.6 },
    { offset: 0.42, transform: s(-0.03, 0.8), opacity: 0.38 },
    { offset: 0.54, transform: s(0.03, 1.02), opacity: 0.58 },
    { offset: 0.62, transform: s(0.04, 0.92), opacity: 0.5 },
    { offset: 0.72, transform: s(0.025, 1), opacity: 0.55 },
    { offset: 1, transform: s(0, 1), opacity: 0.55 },
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

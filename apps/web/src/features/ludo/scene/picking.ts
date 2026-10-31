import { Vector3, type PerspectiveCamera } from 'three';

/** A pawn the viewer may choose right now, with where it stands in the world. */
export interface PickTarget { pawn: number; position: Vector3; }

/** Half of the smallest touch target: a pawn is hit when the pointer is within 22 CSS pixels (a 44 px circle) of it on screen. */
export const MIN_HIT_RADIUS_PX = 22;

/** The target nearest to the pointer within the hit radius, or null. Pure, so it can be tested without a canvas. */
export function pickNearest(
  targets: readonly PickTarget[], camera: PerspectiveCamera, rect: { left: number; top: number; width: number; height: number },
  pointer: { x: number; y: number }, radius = MIN_HIT_RADIUS_PX,
): number | null {
  let best: { pawn: number; distance: number } | null = null;
  const projected = new Vector3();
  for (const target of targets) {
    projected.copy(target.position).project(camera);
    const x = rect.left + ((projected.x + 1) / 2) * rect.width;
    const y = rect.top + ((1 - projected.y) / 2) * rect.height;
    const distance = Math.hypot(pointer.x - x, pointer.y - y);
    if (distance <= Math.max(radius, MIN_HIT_RADIUS_PX) && (best === null || distance < best.distance)) best = { pawn: target.pawn, distance };
  }
  return best?.pawn ?? null;
}

/** Wires pointer presses on the canvas to `onPick`; a class toggle (not a style) shows the pointer cursor over a pawn. */
export function attachPicking(
  canvas: HTMLCanvasElement, camera: PerspectiveCamera, targets: () => readonly PickTarget[], onPick: (pawn: number) => void,
): () => void {
  const hit = (event: PointerEvent): number | null => {
    const rect = canvas.getBoundingClientRect();
    return pickNearest(targets(), camera, rect, { x: event.clientX, y: event.clientY });
  };
  const press = (event: PointerEvent): void => {
    const pawn = hit(event);
    if (pawn !== null) { event.preventDefault(); onPick(pawn); }
  };
  const hover = (event: PointerEvent): void => { canvas.classList.toggle('ludo-canvas--pick', hit(event) !== null); };
  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointermove', hover);
  return () => { canvas.removeEventListener('pointerdown', press); canvas.removeEventListener('pointermove', hover); };
}

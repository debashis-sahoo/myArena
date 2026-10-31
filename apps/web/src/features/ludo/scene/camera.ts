import { PerspectiveCamera, Vector3 } from 'three';
import { BOARD_HALF } from './geometry';

export type CameraMode = 'angled' | 'top';

const FOV = 32;
/** Elevation above the table, in degrees: a three-quarter view, or looking straight down. */
const ELEVATION: Record<CameraMode, number> = { angled: 52, top: 89 };
const EASE_SECONDS = 0.7;
const TARGET = new Vector3(0, 0, 0.4);

/** The camera: always fits the whole board, and eases between the angled and the top-down view. */
export class CameraRig {
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  private from = ELEVATION.angled;
  private to = ELEVATION.angled;
  private progress = 1;
  private elevation = ELEVATION.angled;

  constructor() { this.place(); }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.place();
  }

  /** `animate` false jumps (reduced motion, first frame). */
  setMode(mode: CameraMode, animate: boolean): void {
    const target = ELEVATION[mode];
    if (target === this.to) return;
    this.from = this.elevation;
    this.to = target;
    this.progress = animate ? 0 : 1;
    if (!animate) { this.elevation = target; this.place(); }
  }

  /** Advances the easing; returns true while the camera is still moving. */
  update(seconds: number): boolean {
    if (this.progress >= 1) return false;
    this.progress = Math.min(1, this.progress + seconds / EASE_SECONDS);
    const eased = this.progress * this.progress * (3 - 2 * this.progress);
    this.elevation = this.from + (this.to - this.from) * eased;
    this.place();
    return this.progress < 1;
  }

  private distance(): number {
    const vertical = (FOV * Math.PI) / 360;
    const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect);
    const radius = BOARD_HALF * 1.28;
    return radius / Math.tan(Math.min(vertical, horizontal));
  }

  private place(): void {
    const radians = (this.elevation * Math.PI) / 180;
    const distance = this.distance();
    this.camera.position.set(TARGET.x, TARGET.y + distance * Math.sin(radians), TARGET.z + distance * Math.cos(radians));
    this.camera.lookAt(TARGET);
  }
}

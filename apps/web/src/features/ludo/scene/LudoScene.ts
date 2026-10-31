import {
  AmbientLight, BufferGeometry, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight, Points, PointsMaterial, Scene, Vector3, Color as ThreeColor,
} from 'three';
import { buildThrow, type DiceThrow, type LudoMatchView, type Color, type ThemeId } from '@myarena/ludo';
import type { Throw } from '../match/rollPlayback';
import { FrameMonitor } from '../quality/adaptive';
import { pixelRatioCap, type Quality } from '../quality/quality';
import { placePawns } from '../view/placement';
import { Animator, hopAlong, knockBack } from './animations';
import { createBoard, type BoardObject } from './board';
import { CameraRig, type CameraMode } from './camera';
import { createDie, type DieObject } from './die';
import { applyStudioEnvironment } from './environment';
import { BOARD_HALF, travelPath } from './geometry';
import type { ThemeLook } from './look';
import { RenderLoop } from './loop';
import { attachPicking, type PickTarget } from './picking';
import { createPawnKit, type PawnKit, type PawnObject } from './pawns';
import { createRenderer, type RendererHandle } from './renderer';
import { createLook } from './themes';
import { createTray, type TrayObject } from './tray';

/** The die is drawn at this fraction of a board square per die unit, so its tray covers about 6 squares. */
const DIE_SCALE = 0.75;
/** How long the settled die stays on the tray before it is put away. */
const REST_MS = 1300;
const CELEBRATION_SECONDS = 4;

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  quality: Exclude<Quality, 'lite'>;
  theme: ThemeId;
  onPick: (pawn: number) => void;
  onContextLost: () => void;
  onContextRestored: () => void;
  /** The device cannot keep 30 frames per second; the owner may lower the quality. */
  onSlow: () => void;
}

export interface SceneInput {
  view: LudoMatchView;
  /** Pawns of the viewer that may be chosen now. */
  movable: readonly number[];
  /** The live events of the latest update (empty for a snapshot). */
  events: readonly unknown[];
  seq: number;
  throwing: Throw | null;
  instant: boolean;
}

interface MovedEvent { kind: 'MOVED'; seat: number; pawn: number; from: number; to: number; captured?: { seat: number; pawn: number }; }
const isMoved = (event: unknown): event is MovedEvent => {
  const entry = event as Partial<MovedEvent> | null;
  return typeof entry === 'object' && entry !== null && entry.kind === 'MOVED' && Number.isInteger(entry.seat) && Number.isInteger(entry.pawn)
    && Number.isInteger(entry.from) && Number.isInteger(entry.to);
};

export class LudoScene {
  private readonly scene = new Scene();
  private readonly rig = new CameraRig();
  private readonly animator = new Animator();
  private readonly handle: RendererHandle;
  private readonly loop: RenderLoop;
  private readonly detachPicking: () => void;
  private readonly pawns = new Map<string, PawnObject>();
  private readonly shown = new Map<string, number>();
  private look!: ThemeLook;
  private board!: BoardObject;
  private kit!: PawnKit;
  private tray!: TrayObject;
  private die!: DieObject;
  private rollRoot = new Group();
  private disposeEnvironment: () => void = () => undefined;
  private lights: Group = new Group();
  private input: SceneInput | null = null;
  private lastSeq = -1;
  private currentThrow: { dice: DiceThrow; startedAt: number } | null = null;
  private hideAt: number | null = null;
  private celebration: { points: Points; velocities: Float32Array; age: number } | null = null;
  private celebratedWinner: number | null = null;
  private disposed = false;

  constructor(private readonly options: SceneOptions) {
    const monitor = new FrameMonitor(() => options.onSlow());
    this.loop = new RenderLoop((seconds) => this.frame(seconds), (milliseconds) => monitor.record(milliseconds));
    this.handle = createRenderer(options.canvas, {
      pixelRatioCap: pixelRatioCap(options.quality), antialias: true, shadows: true,
      onResize: (width, height) => { this.rig.setAspect(width / height); this.loop.invalidate(); },
      onContextLost: () => options.onContextLost(),
      onContextRestored: () => options.onContextRestored(),
    });
    this.buildTheme(options.theme);
    this.detachPicking = attachPicking(options.canvas, this.rig.camera, () => this.pickTargets(), options.onPick);
  }

  /** Brings the scene in line with the latest state: pawns hop for live moves, otherwise they are placed at once. */
  update(input: SceneInput): void {
    if (this.disposed) return;
    const first = this.input === null;
    this.input = input;
    if (first || input.instant) this.animator.finishAll();
    this.board.setActive(input.view.seats.map((seat) => seat.color));
    this.syncPawns(input, first);
    this.syncDie(input);
    this.syncWinner(input);
    this.lastSeq = input.seq;
    this.loop.invalidate();
  }

  setCameraMode(mode: CameraMode, animate = true): void {
    this.rig.setMode(mode, animate);
    this.loop.invalidate();
  }

  setTheme(theme: ThemeId): void {
    if (theme === this.look.id) return;
    this.teardownTheme();
    this.buildTheme(theme);
    if (this.input) this.update({ ...this.input, events: [], instant: true });
  }

  setQuality(quality: Exclude<Quality, 'lite'>): void {
    this.handle.setPixelRatioCap(pixelRatioCap(quality));
    this.loop.invalidate();
  }

  /** Redraws now (after the context was restored, for instance). */
  redraw(): void { this.loop.invalidate(); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachPicking();
    this.loop.dispose();
    this.animator.finishAll();
    this.teardownTheme();
    this.handle.dispose();
  }

  // --- building ---------------------------------------------------------------------------------------------------

  private buildTheme(theme: ThemeId): void {
    this.look = createLook(theme);
    this.scene.background = new ThreeColor(this.look.background);
    this.board = createBoard(this.look);
    this.scene.add(this.board.object);

    this.lights = new Group();
    const key = new DirectionalLight(this.look.lighting.key, this.look.lighting.keyIntensity);
    key.position.set(-5, 14, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(this.options.quality === 'high' ? 2048 : 1024, this.options.quality === 'high' ? 2048 : 1024);
    key.shadow.camera.left = -11;
    key.shadow.camera.right = 11;
    key.shadow.camera.top = 11;
    key.shadow.camera.bottom = -11;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.lights.add(key, key.target, new HemisphereLight(this.look.lighting.fill, 0x1a1410, this.look.lighting.fillIntensity), new AmbientLight(0xffffff, 0.18));
    this.scene.add(this.lights);
    this.disposeEnvironment = applyStudioEnvironment(this.handle.renderer, this.scene, this.look.lighting.environment);

    this.kit = createPawnKit(this.look);
    this.tray = createTray(this.look);
    this.die = createDie(this.look.die, 4242);
    this.rollRoot = new Group();
    this.rollRoot.scale.setScalar(DIE_SCALE);
    this.rollRoot.position.set(0, 0.14, 0);
    this.rollRoot.visible = false;
    this.rollRoot.add(this.tray.object, this.die.object);
    this.scene.add(this.rollRoot);
  }

  private teardownTheme(): void {
    for (const pawn of this.pawns.values()) this.scene.remove(pawn.group);
    this.pawns.clear();
    this.shown.clear();
    this.scene.remove(this.board.object, this.lights, this.rollRoot);
    this.disposeEnvironment();
    this.board.dispose();
    this.kit.dispose();
    this.tray.dispose();
    this.die.dispose();
    this.look.dispose();
    this.clearCelebration();
  }

  // --- pawns ------------------------------------------------------------------------------------------------------

  private pawnObject(seat: number, pawn: number, color: Color): PawnObject {
    const key = `${seat}:${pawn}`;
    let made = this.pawns.get(key);
    if (!made) {
      made = this.kit.create(seat, pawn, color);
      this.pawns.set(key, made);
      this.scene.add(made.group);
    }
    return made;
  }

  private syncPawns(input: SceneInput, first: boolean): void {
    const { view } = input;
    const placed = placePawns(view, new Set(input.movable));
    const moves = new Map<string, MovedEvent>();
    if (!first && !input.instant) for (const event of input.events) if (isMoved(event)) moves.set(`${event.seat}:${event.pawn}`, event);
    // A new live move completes whatever was still moving, so every pawn starts from where the last state left it.
    if (moves.size > 0) this.animator.finishAll();
    const knocked = new Map<string, number>();

    for (const item of placed) {
      const key = `${item.seat}:${item.pawn}`;
      const object = this.pawnObject(item.seat, item.pawn, item.color);
      const step = view.seats[item.seat]!.pawns[item.pawn]!;
      const target = { x: item.cx - BOARD_HALF, z: item.cy - BOARD_HALF };
      object.group.scale.setScalar(item.scale);
      object.setMovable(item.movable);
      const move = moves.get(key);
      if (move && move.to === step && this.shown.get(key) === move.from) {
        const path = travelPath(item.color, item.pawn, move.from, move.to);
        path[path.length - 1] = target;
        const end = hopAlong(this.animator, object.group, path);
        if (move.captured) knocked.set(`${move.captured.seat}:${move.captured.pawn}`, end);
      } else if (!moves.size || !this.isCaptured(moves, key)) {
        object.group.position.set(target.x, 0, target.z);
      }
      this.shown.set(key, step);
    }
    // A captured pawn is knocked back to its slot once the capturing pawn has landed.
    for (const [key, delay] of knocked) {
      const object = this.pawns.get(key);
      const item = placed.find((candidate) => `${candidate.seat}:${candidate.pawn}` === key);
      if (object && item) knockBack(this.animator, object.group, { x: item.cx - BOARD_HALF, z: item.cy - BOARD_HALF }, delay);
    }
  }

  private isCaptured(moves: ReadonlyMap<string, MovedEvent>, key: string): boolean {
    for (const move of moves.values()) if (move.captured && `${move.captured.seat}:${move.captured.pawn}` === key) return true;
    return false;
  }
  private pickTargets(): PickTarget[] {
    const input = this.input;
    if (!input || input.view.you === null) return [];
    return input.movable.flatMap((pawn) => {
      const object = this.pawns.get(`${input.view.you}:${pawn}`);
      return object ? [{ pawn, position: new Vector3(object.group.position.x, 0.5, object.group.position.z) }] : [];
    });
  }

  // --- the die ----------------------------------------------------------------------------------------------------

  private syncDie(input: SceneInput): void {
    const active = input.throwing;
    const current = this.currentThrow;
    if (active && !input.instant) {
      if (!current || current.startedAt !== active.startedAt) {
        this.currentThrow = { dice: buildThrow(active.seed, active.face, active.durationMs), startedAt: active.startedAt };
        this.hideAt = null;
        this.rollRoot.visible = true;
        this.die.object.visible = true;
      }
    } else if (current) {
      // The throw ended (it settled, or this viewer skipped it): the die rests face up, then is put away.
      const pose = current.dice.sample(current.dice.durationMs);
      this.applyPose(pose.position, pose.orientation);
      this.currentThrow = null;
      this.hideAt = performance.now() + (input.instant ? 0 : REST_MS);
    }
  }

  private applyPose(position: readonly [number, number, number], orientation: readonly [number, number, number, number]): void {
    this.die.object.position.set(position[0], position[1], position[2]);
    this.die.object.quaternion.set(orientation[0], orientation[1], orientation[2], orientation[3]);
  }

  // --- the win ----------------------------------------------------------------------------------------------------

  private syncWinner(input: SceneInput): void {
    const winner = input.view.winner;
    if (winner === null) { this.celebratedWinner = null; return; }
    if (this.celebratedWinner === winner || input.instant || this.input === null) return;
    this.celebratedWinner = winner;
    this.clearCelebration();
    const count = 160;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const palette = this.look.celebration.colors.map((value) => new ThreeColor(value));
    for (let index = 0; index < count; index += 1) {
      positions.set([0, 1.2, 0], index * 3);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * this.look.celebration.spread * 0.5;
      velocities.set([Math.cos(angle) * speed, 4 + Math.random() * 6, Math.sin(angle) * speed], index * 3);
      const tint = palette[index % palette.length]!;
      colors.set([tint.r, tint.g, tint.b], index * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const points = new Points(geometry, new PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false }));
    this.scene.add(points);
    this.celebration = { points, velocities, age: 0 };
  }

  private clearCelebration(): void {
    if (!this.celebration) return;
    this.scene.remove(this.celebration.points);
    this.celebration.points.geometry.dispose();
    (this.celebration.points.material as PointsMaterial).dispose();
    this.celebration = null;
  }

  private stepCelebration(seconds: number): boolean {
    const celebration = this.celebration;
    if (!celebration) return false;
    celebration.age += seconds;
    const attribute = celebration.points.geometry.getAttribute('position');
    for (let index = 0; index < attribute.count; index += 1) {
      celebration.velocities[index * 3 + 1]! -= this.look.celebration.gravity * seconds * 2;
      attribute.setXYZ(
        index,
        attribute.getX(index) + celebration.velocities[index * 3]! * seconds,
        Math.max(0.05, attribute.getY(index) + celebration.velocities[index * 3 + 1]! * seconds),
        attribute.getZ(index) + celebration.velocities[index * 3 + 2]! * seconds,
      );
    }
    attribute.needsUpdate = true;
    (celebration.points.material as PointsMaterial).opacity = Math.max(0, 1 - celebration.age / CELEBRATION_SECONDS);
    if (celebration.age >= CELEBRATION_SECONDS) { this.clearCelebration(); return false; }
    return true;
  }

  // --- the frame --------------------------------------------------------------------------------------------------

  private frame(seconds: number): boolean {
    if (this.disposed) return false;
    let more = this.animator.update(seconds);
    more = this.rig.update(seconds) || more;
    if (this.currentThrow) {
      const elapsed = performance.now() - this.currentThrow.startedAt;
      const pose = this.currentThrow.dice.sample(elapsed);
      this.applyPose(pose.position, pose.orientation);
      more = true;
    } else if (this.hideAt !== null) {
      if (performance.now() >= this.hideAt) { this.rollRoot.visible = false; this.hideAt = null; } else more = true;
    }
    for (const pawn of this.pawns.values()) more = pawn.tick(seconds) || more;
    more = this.stepCelebration(seconds) || more;
    this.handle.renderer.render(this.scene, this.rig.camera);
    return more;
  }
}

/** Creates the scene on a canvas. The owner calls `update` with each new state and `dispose` when it goes away. */
export function createLudoScene(options: SceneOptions): LudoScene {
  return new LudoScene(options);
}

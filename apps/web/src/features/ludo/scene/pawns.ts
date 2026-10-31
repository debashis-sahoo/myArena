import {
  BoxGeometry, ConeGeometry, Group, LatheGeometry, Mesh, MeshBasicMaterial, OctahedronGeometry, Sprite, SpriteMaterial, SphereGeometry, TorusGeometry, Vector2,
  type BufferGeometry, type Material,
} from 'three';
import type { Color } from '@myarena/ludo';
import type { ThemeLook } from './look';
import { numberLabel } from './textures';

export interface PawnObject {
  group: Group;
  seat: number;
  pawn: number;
  /** Shows the pulsing ring that says "you can move this pawn". */
  setMovable: (movable: boolean) => void;
  /** Advances the ring's pulse; returns true while there is something to animate. */
  tick: (seconds: number) => boolean;
}

export interface PawnKit {
  create: (seat: number, pawn: number, color: Color) => PawnObject;
  dispose: () => void;
}

/** The topper shape matches the mark on the flat board: circle, triangle, square, diamond. */
function topperGeometry(color: Color): { geometry: BufferGeometry; lift: number } {
  switch (color) {
    case 'RED': return { geometry: new SphereGeometry(0.2, 20, 14), lift: 0.84 };
    case 'GREEN': return { geometry: new ConeGeometry(0.24, 0.4, 3), lift: 0.88 };
    case 'YELLOW': return { geometry: new BoxGeometry(0.3, 0.3, 0.3), lift: 0.84 };
    case 'BLUE': return { geometry: new OctahedronGeometry(0.24), lift: 0.86 };
  }
}

/** Lathe-turned pawns sharing one body shape, one ring and one label style; a pawn is body, topper, ring and number. */
export function createPawnKit(look: ThemeLook): PawnKit {
  const profile = [
    [0, 0], [0.34, 0], [0.37, 0.04], [0.33, 0.1], [0.24, 0.2], [0.17, 0.36], [0.15, 0.5], [0.2, 0.58], [0.15, 0.64], [0, 0.66],
  ].map(([radius, height]) => new Vector2(radius, height));
  const bodyGeometry = new LatheGeometry(profile, 28);
  const ringGeometry = new TorusGeometry(0.52, 0.045, 8, 40);
  const ringMaterial = new MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.95 });
  const toppers = new Map<Color, { geometry: BufferGeometry; lift: number }>();
  const labels = new Map<number, { texture: ReturnType<typeof numberLabel>; material: SpriteMaterial }>();
  const owned: { dispose: () => void }[] = [bodyGeometry, ringGeometry, ringMaterial];
  const topperFor = (color: Color) => {
    let made = toppers.get(color);
    if (!made) { made = topperGeometry(color); toppers.set(color, made); owned.push(made.geometry); }
    return made;
  };
  const labelFor = (value: number) => {
    let made = labels.get(value);
    if (!made) {
      const texture = numberLabel(value, '#ffffff', '#101010');
      made = { texture, material: new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }) };
      labels.set(value, made);
      owned.push(texture, made.material);
    }
    return made.material;
  };

  return {
    create(seat, pawn, color) {
      const { body, topper } = look.pawn(color) as { body: Material; topper: Material };
      const group = new Group();
      const inner = new Group();
      inner.position.y = 0.06;
      const shaft = new Mesh(bodyGeometry, body);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      const { geometry, lift } = topperFor(color);
      const head = new Mesh(geometry, topper);
      head.position.y = lift;
      head.castShadow = true;
      const ring = new Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      ring.visible = false;
      const label = new Sprite(labelFor(pawn + 1));
      label.position.y = 1.32;
      label.scale.setScalar(0.42);
      inner.add(shaft, head, ring, label);
      group.add(inner);
      let movable = false;
      let phase = pawn * 0.9;
      return {
        group, seat, pawn,
        setMovable(next) { movable = next; ring.visible = next; if (!next) { ring.scale.setScalar(1); head.position.y = lift; } },
        tick(seconds) {
          if (!movable) return false;
          phase += seconds * 4;
          const pulse = 1 + Math.sin(phase) * 0.1;
          ring.scale.setScalar(pulse);
          head.position.y = lift + Math.max(0, Math.sin(phase)) * 0.05;
          return true;
        },
      };
    },
    dispose() { for (const item of owned) item.dispose(); },
  };
}

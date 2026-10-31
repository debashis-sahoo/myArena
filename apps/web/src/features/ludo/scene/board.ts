import {
  BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Shape, ShapeGeometry,
  type Material,
} from 'three';
import { BASE_SLOTS, GRID, LANES, RING, STAR_INDEXES, START_INDEX, type Color } from '@myarena/ludo';
import { BOARD_HALF, groundOf } from './geometry';
import type { ThemeLook } from './look';

const COLORS: readonly Color[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
const YARD_CENTRE: Record<Color, { x: number; z: number }> = {
  RED: { x: -4.5, z: -4.5 }, GREEN: { x: 4.5, z: -4.5 }, YELLOW: { x: 4.5, z: 4.5 }, BLUE: { x: -4.5, z: 4.5 },
};
const TRIANGLES: Record<Color, [number, number][]> = {
  RED: [[6, 6], [7.5, 7.5], [6, 9]], GREEN: [[6, 6], [9, 6], [7.5, 7.5]], YELLOW: [[9, 6], [9, 9], [7.5, 7.5]], BLUE: [[6, 9], [9, 9], [7.5, 7.5]],
};

export interface BoardObject {
  object: Group;
  /** Colours without a player are dimmed. */
  setActive: (colors: readonly Color[]) => void;
  dispose: () => void;
}

function star(points = 5, outer = 0.3, inner = 0.13): Shape {
  const shape = new Shape();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * index - Math.PI / 2;
    if (index === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return shape;
}

/** The board: a framed slab with inlaid squares, four yards, the home-lane squares, the centre and the markers. World units are squares. */
export function createBoard(look: ThemeLook): BoardObject {
  const object = new Group();
  const geometries: BufferGeometry[] = [];
  const materials: MeshStandardMaterial[] = [];
  const own = <T extends BufferGeometry>(geometry: T): T => { geometries.push(geometry); return geometry; };
  const paint = (color: number, options: { roughness?: number; metalness?: number; emissive?: number } = {}): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ color, roughness: options.roughness ?? 0.5, metalness: options.metalness ?? 0, emissive: options.emissive ?? 0, emissiveIntensity: options.emissive ? 0.25 : 0 });
    materials.push(material);
    return material;
  };
  const add = (geometry: BufferGeometry, material: Material, x: number, y: number, z: number, shadow = true): Mesh => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = shadow;
    object.add(mesh);
    return mesh;
  };

  // The table, the slab and its frame.
  const table = new Mesh(own(new PlaneGeometry(70, 70)), look.table);
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.3;
  table.receiveShadow = true;
  object.add(table);
  add(own(new BoxGeometry(GRID, 0.3, GRID)), look.board, 0, -0.15, 0);
  const side = GRID + 1.3;
  for (const [x, z, width, depth] of [[0, -(BOARD_HALF + 0.325), side, 0.65], [0, BOARD_HALF + 0.325, side, 0.65], [-(BOARD_HALF + 0.325), 0, 0.65, GRID], [BOARD_HALF + 0.325, 0, 0.65, GRID]] as const) {
    const frame = add(own(new BoxGeometry(width, 0.5, depth)), look.frame, x, -0.05, z);
    frame.castShadow = true;
  }

  // The yards: a colour square with a lighter inner plate and four slots.
  const yardMaterials = new Map<Color, { ground: MeshStandardMaterial; slot: MeshStandardMaterial; active: number }>();
  const yardGeometry = own(new BoxGeometry(6, 0.05, 6));
  const plateGeometry = own(new BoxGeometry(4.2, 0.04, 4.2));
  const slotGeometry = own(new CylinderGeometry(0.44, 0.44, 0.03, 28));
  for (const color of COLORS) {
    const tint = look.palette[color];
    const ground = paint(tint, { roughness: 0.4 });
    const slot = paint(tint, { roughness: 0.35 });
    yardMaterials.set(color, { ground, slot, active: tint });
    add(yardGeometry, ground, YARD_CENTRE[color].x, 0.025, YARD_CENTRE[color].z);
    add(plateGeometry, look.yard, YARD_CENTRE[color].x, 0.07, YARD_CENTRE[color].z);
    for (const cell of BASE_SLOTS[color]) {
      const at = groundOf(cell);
      add(slotGeometry, slot, at.x, 0.1, at.z);
    }
  }

  // The ring, the home lanes and the markers.
  const squareGeometry = own(new BoxGeometry(0.94, 0.05, 0.94));
  const startOwner = new Map<number, Color>(COLORS.map((color) => [START_INDEX[color], color]));
  RING.forEach((cell, index) => {
    const owner = startOwner.get(index);
    const at = groundOf(cell);
    add(squareGeometry, owner ? paint(look.palette[owner], { roughness: 0.35 }) : look.cell, at.x, 0.03, at.z);
  });
  for (const color of COLORS) {
    const lane = paint(look.palette[color], { roughness: 0.4 });
    for (const cell of LANES[color]) {
      const at = groundOf(cell);
      add(squareGeometry, lane, at.x, 0.035, at.z);
    }
  }
  const gold = paint(0xd8a93a, { roughness: 0.25, metalness: 0.9 });
  const starGeometry = own(new ExtrudeGeometry(star(), { depth: 0.04, bevelEnabled: false }));
  for (const index of STAR_INDEXES) {
    const at = groundOf(RING[index]!);
    const marker = add(starGeometry, gold, at.x, 0.07, at.z, false);
    marker.rotation.x = -Math.PI / 2;
  }
  const arrow = own(new CylinderGeometry(0.2, 0.2, 0.03, 18));
  for (const color of COLORS) {
    const at = groundOf(RING[START_INDEX[color]]!);
    add(arrow, gold, at.x, 0.075, at.z, false);
  }

  // The centre: four triangles meeting in the middle.
  for (const color of COLORS) {
    const shape = new Shape();
    TRIANGLES[color].forEach(([col, row], index) => {
      const x = col - BOARD_HALF;
      const z = row - BOARD_HALF;
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const geometry = own(new ShapeGeometry(shape));
    geometry.rotateX(-Math.PI / 2);
    add(geometry, paint(look.palette[color], { roughness: 0.3, metalness: 0.2 }), 0, 0.06, 0, false);
  }

  for (const prop of look.props()) object.add(prop);

  return {
    object,
    setActive(colors) {
      for (const color of COLORS) {
        const entry = yardMaterials.get(color)!;
        const active = colors.includes(color);
        for (const material of [entry.ground, entry.slot]) {
          material.color.setHex(entry.active);
          if (!active) material.color.lerp(material.color.clone().setHex(0x7a7a7a), 0.72);
        }
      }
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}

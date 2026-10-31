import { FACE_NORMALS, buildThrow, rotateVector, type DiceSample, type Quat, type Vec3 } from '@myarena/ludo';

/** Edge of the cube in CSS pixels before the whole die is scaled to fit its place on the screen. */
export const CUBE = 100;
/** Pixels per tray unit across, in depth, and per unit of bounce height; the tray is compressed so the die stays in a small stage. */
export const PX_X = 38;
export const PX_Z = 28;
export const PX_LIFT = 40;
/** The floor sits half a cube below the centre of a die that rests flat. */
export const FLOOR_Y = CUBE / 2;
/** Size of the soft shadow before it is scaled by height. */
export const SHADOW = 90;

/** The simulation is y up; the page is y down, so every pose is mirrored in y (a reflection keeps rotations proper). */
const mirror = (v: Vec3): Vec3 => [v[0], -v[1], v[2]];

/** The face's outward direction on the page, which is where the face sits on the cube. */
export const faceDirection = (face: number): Vec3 => mirror(FACE_NORMALS[face]!);

/** The rotation of an orientation as a row-major 3 by 3 matrix in page axes. */
export function pageRotation(q: Quat): number[] {
  const [x, y, z, w] = q;
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
  // Conjugating by the y mirror flips the sign of the entries that mix y with x or z.
  for (const index of [1, 3, 5, 7]) r[index] = -r[index]!;
  return r;
}

/** How high the centre must be, in cube edges, for the cube to rest on the floor in this orientation. */
function supportHeight(q: Quat): number {
  const conjugate: Quat = [-q[0], -q[1], -q[2], q[3]];
  const local = rotateVector(conjugate, [0, 1, 0]);
  return 0.5 * (Math.abs(local[0]) + Math.abs(local[1]) + Math.abs(local[2]));
}

export interface DiePose {
  /** `matrix3d(...)` for the cube. */
  cube: string;
  /** The 16 values of that matrix, column by column. */
  matrix: number[];
  /** Transform for the flat shadow on the floor. */
  shadow: string;
  shadowOpacity: number;
  /** Height of the bounce above the floor in tray units (0 when resting). */
  hop: number;
}

/** Turns one sample of the shared seeded throw into the cube's transform, the shadow and the bounce height. */
export function diePose(sample: DiceSample): DiePose {
  const [px, py, pz] = sample.position;
  const rotation = pageRotation(sample.orientation);
  const support = supportHeight(sample.orientation);
  const hop = Math.max(0, py - support);
  const x = px * PX_X;
  const z = pz * PX_Z;
  const y = FLOOR_Y - (support * CUBE + hop * PX_LIFT);
  const matrix = [
    rotation[0]!, rotation[3]!, rotation[6]!, 0,
    rotation[1]!, rotation[4]!, rotation[7]!, 0,
    rotation[2]!, rotation[5]!, rotation[8]!, 0,
    x, y, z, 1,
  ];
  const scale = 1 / (1 + hop * 0.45);
  return {
    cube: `matrix3d(${matrix.map((value) => value.toFixed(5)).join(',')})`,
    matrix,
    shadow: `translate3d(${x.toFixed(2)}px,${FLOOR_Y}px,${z.toFixed(2)}px) rotateX(90deg) scale(${scale.toFixed(4)})`,
    shadowOpacity: 0.34 / (1 + hop * 0.9),
    hop,
  };
}

/** A die at rest showing `face`, in the middle of the tray, turned by a fixed angle so it looks like a die and not a diagram. */
export function idleSample(face: number): DiceSample {
  const rest = buildThrow(face * 7919 + 1, face, 1000).sample(1000);
  return { position: [0, rest.position[1], 0], orientation: rest.orientation };
}

/** Places each of the six sides on the cube; the side for face `n` faces `faceDirection(n)`. */
export const FACE_PLACEMENT: Readonly<Record<number, string>> = {
  1: `rotateX(90deg) translateZ(${CUBE / 2}px)`,
  6: `rotateX(-90deg) translateZ(${CUBE / 2}px)`,
  2: `translateZ(${CUBE / 2}px)`,
  5: `rotateY(180deg) translateZ(${CUBE / 2}px)`,
  3: `rotateY(90deg) translateZ(${CUBE / 2}px)`,
  4: `rotateY(-90deg) translateZ(${CUBE / 2}px)`,
};

/** The 3 by 3 pip cells that are filled for each face, numbered row by row. */
export const PIP_CELLS: Readonly<Record<number, readonly number[]>> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

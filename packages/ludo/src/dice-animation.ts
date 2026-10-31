/**
 * A dice throw built from a seed, with no physics at run time. The final resting orientation is fixed first (the decided
 * face up, turned about the vertical by a seeded angle); the path is a ballistic fall and two to four damped bounces that
 * end exactly at rest, and a seeded spin about a slowly drifting axis decays to nothing at the last bounce. Every device
 * computes the same throw from the same seed, and it always ends on the decided face.
 *
 * Units: the die is a cube of edge 1; the floor is y = 0; the tray spans x and z in [-TRAY_HALF, TRAY_HALF].
 */
export const TRAY_HALF = 4;
/** The furthest the centre of the die travels from the middle in x or z, so it never leaves the tray. */
export const TRAY_LIMIT = TRAY_HALF - 0.9;
/** The share of the duration spent moving; the remainder the die sits still, face up. */
export const MOTION_SHARE = 0.94;

export type Vec3 = readonly [number, number, number];
/** A unit quaternion as [x, y, z, w]. */
export type Quat = readonly [number, number, number, number];

export interface DiceSample { position: Vec3; orientation: Quat; }

export interface DiceThrow {
  durationMs: number;
  /** Number of times the die leaves the floor again after landing (2 to 4). */
  bounces: number;
  /** When the die touches the floor, in ms: the first landing, each bounce's landing, and the final rest. */
  contactsMs: readonly number[];
  /** Where the die comes to rest (centre). */
  rest: Vec3;
  /** Position and orientation `tMs` after the throw starts; before 0 or after the end it is the first or final pose. */
  sample(tMs: number): DiceSample;
}

/** The outward normal of each face in the die's own frame; opposite faces add up to 7. */
export const FACE_NORMALS: Readonly<Record<number, Vec3>> = {
  1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0],
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const normalize = (v: Vec3): Vec3 => { const length = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / length, v[1] / length, v[2] / length]; };

export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const [x, y, z] = normalize(axis);
  const s = Math.sin(angle / 2);
  return [x * s, y * s, z * s, Math.cos(angle / 2)];
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function rotateVector(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [v[0] + qw * tx + (qy * tz - qz * ty), v[1] + qw * ty + (qz * tx - qx * tz), v[2] + qw * tz + (qx * ty - qy * tx)];
}

/** The rotation that takes unit vector `from` onto unit vector `to`. */
function rotationBetween(from: Vec3, to: Vec3): Quat {
  const dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  if (dot > 1 - 1e-12) return [0, 0, 0, 1];
  if (dot < -1 + 1e-12) {
    const axis: Vec3 = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
    const cross: Vec3 = [from[1] * axis[2] - from[2] * axis[1], from[2] * axis[0] - from[0] * axis[2], from[0] * axis[1] - from[1] * axis[0]];
    return quatFromAxisAngle(cross, Math.PI);
  }
  const cross: Vec3 = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]];
  const q: Quat = [cross[0], cross[1], cross[2], 1 + dot];
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

/** Which face (1 to 6) points most nearly up for a given orientation. */
export function topFace(orientation: Quat): number {
  let best = 1;
  let height = -Infinity;
  for (const [face, normal] of Object.entries(FACE_NORMALS)) {
    const up = rotateVector(orientation, normal)[1];
    if (up > height) { height = up; best = Number(face); }
  }
  return best;
}

/** How high the centre must be for the cube to rest on the floor at this orientation: 0.5 flat, up to about 0.87 on a corner. */
function supportHeight(q: Quat): number {
  const up: Vec3 = [0, 1, 0];
  const conjugate: Quat = [-q[0], -q[1], -q[2], q[3]];
  const local = rotateVector(conjugate, up);
  return 0.5 * (Math.abs(local[0]) + Math.abs(local[1]) + Math.abs(local[2]));
}

/** Folds an unbounded coordinate into [-limit, limit] by reflecting at the walls. */
function fold(value: number, limit: number): number {
  const period = 4 * limit;
  const m = (((value + limit) % period) + period) % period;
  return m <= 2 * limit ? m - limit : 3 * limit - m;
}

export function buildThrow(seed: number, face: number, durationMs: number): DiceThrow {
  const normal = FACE_NORMALS[face];
  if (!normal) throw new RangeError('A die shows 1 to 6.');
  const random = mulberry32(seed);
  const between = (low: number, high: number) => low + (high - low) * random();

  // 1. The final pose: the decided face up, then turned about the vertical by a seeded angle.
  const final = quatMultiply(quatFromAxisAngle([0, 1, 0], between(0, 2 * Math.PI)), rotationBetween(normal, [0, 1, 0]));

  // 2. The fall and the bounces. Apex heights shrink by a seeded factor; gravity is set so they fit the duration.
  const bounces = 2 + Math.floor(random() * 3);
  const drop = between(2.4, 3.4);
  const restitution = between(0.34, 0.46);
  const apexes = Array.from({ length: bounces }, (_, index) => drop * restitution ** (index + 1));
  const scale = Math.sqrt(drop) + 2 * apexes.reduce((sum, apex) => sum + Math.sqrt(apex), 0);
  const motionSeconds = (durationMs / 1000) * MOTION_SHARE;
  const gravity = (2 * scale * scale) / (motionSeconds * motionSeconds);
  const fallSeconds = Math.sqrt((2 * drop) / gravity);
  const hopSeconds = apexes.map((apex) => 2 * Math.sqrt((2 * apex) / gravity));
  const contacts: number[] = [fallSeconds];
  for (const hop of hopSeconds) contacts.push(contacts.at(-1)! + hop);
  contacts[contacts.length - 1] = motionSeconds;

  // 3. Horizontal travel eases to a stop; one throw in three crosses a wall and bounces back.
  const edge = () => (random() < 0.5 ? -1 : 1) * between(0.55, 0.9) * TRAY_LIMIT;
  const startX = edge();
  const startZ = edge();
  const restX = between(-0.6, 0.6) * TRAY_LIMIT;
  const restZ = between(-0.6, 0.6) * TRAY_LIMIT;
  const wall = random();
  const endUnfoldedX = wall < 0.33 ? 2 * TRAY_LIMIT - restX : wall < 0.66 ? -2 * TRAY_LIMIT - restX : restX;
  const wallZ = random();
  const endUnfoldedZ = wallZ < 0.33 ? 2 * TRAY_LIMIT - restZ : wallZ < 0.66 ? -2 * TRAY_LIMIT - restZ : restZ;

  // 4. The spin: several turns about an axis that drifts slowly, fading to nothing with zero angular speed at the end.
  const unitVector = (): Vec3 => normalize([between(-1, 1), between(-1, 1), between(-1, 1)]);
  const axisFrom = unitVector();
  const axisTo = unitVector();
  const turns = between(2, 4) * 2 * Math.PI * (random() < 0.5 ? -1 : 1);

  const heightAt = (seconds: number): number => {
    if (seconds >= motionSeconds) return 0.5;
    if (seconds < contacts[0]!) return 0.5 + drop - 0.5 * gravity * seconds * seconds;
    for (let hop = 0; hop < hopSeconds.length; hop += 1) {
      const begin = contacts[hop]!;
      if (seconds < contacts[hop + 1]!) {
        const local = seconds - begin;
        return 0.5 + 0.5 * gravity * local * (hopSeconds[hop]! - local);
      }
    }
    return 0.5;
  };

  const sample = (tMs: number): DiceSample => {
    const seconds = Math.min(Math.max(tMs, 0), durationMs) / 1000;
    const u = Math.min(1, seconds / motionSeconds);
    const ease = 1 - (1 - u) * (1 - u);
    const x = fold(startX + (endUnfoldedX - startX) * ease, TRAY_LIMIT);
    const z = fold(startZ + (endUnfoldedZ - startZ) * ease, TRAY_LIMIT);
    const axis = normalize([axisFrom[0] + (axisTo[0] - axisFrom[0]) * u, axisFrom[1] + (axisTo[1] - axisFrom[1]) * u, axisFrom[2] + (axisTo[2] - axisFrom[2]) * u]);
    const spin = quatFromAxisAngle(axis, turns * (1 - u) ** 3);
    const orientation = u >= 1 ? final : quatMultiply(spin, final);
    const lift = u >= 1 ? 0 : supportHeight(orientation) - 0.5;
    return { position: [x, heightAt(seconds) + lift, z], orientation };
  };

  return {
    durationMs, bounces, contactsMs: contacts.map((value) => value * 1000), rest: [restX, 0.5, restZ], sample,
  };
}

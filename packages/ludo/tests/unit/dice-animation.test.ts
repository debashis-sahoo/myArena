import { describe, expect, it } from 'vitest';
import { FACE_NORMALS, MOTION_SHARE, TRAY_LIMIT, buildThrow, rotateVector, topFace, type Quat } from '../../src/index.js';

const DURATION = 2400;
const SEEDS = 10_000;
const angleBetween = (a: Quat, b: Quat): number => {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, dot));
};
const seedOf = (index: number) => (Math.imul(index + 1, 2654435761) >>> 0);

describe('buildThrow', () => {
  it('always ends with the decided face up and the die at rest, for 10,000 seeds and every face', () => {
    for (let index = 0; index < SEEDS; index += 1) {
      for (let face = 1; face <= 6; face += 1) {
        const dieThrow = buildThrow(seedOf(index), face, DURATION);
        const end = dieThrow.sample(DURATION);
        const up = rotateVector(end.orientation, FACE_NORMALS[face]!)[1];
        expect(1 - up).toBeLessThan(1e-6);
        expect(topFace(end.orientation)).toBe(face);
        const nearEnd = dieThrow.sample(DURATION - 20);
        expect(angleBetween(nearEnd.orientation, end.orientation) / 0.02).toBeLessThan(0.05);
        expect(end.position[1]).toBeCloseTo(0.5, 9);
      }
    }
  });

  it('keeps the die on the tray, above the floor, with no jumps between frames', () => {
    for (let index = 0; index < 600; index += 1) {
      const dieThrow = buildThrow(seedOf(index), 1 + (index % 6), DURATION);
      let previous = dieThrow.sample(0);
      for (let t = 16; t <= DURATION; t += 16) {
        const current = dieThrow.sample(t);
        const [x, y, z] = current.position;
        expect(Math.abs(x)).toBeLessThanOrEqual(TRAY_LIMIT + 1e-9);
        expect(Math.abs(z)).toBeLessThanOrEqual(TRAY_LIMIT + 1e-9);
        expect(y).toBeGreaterThanOrEqual(0.5 - 1e-9);
        expect(y).toBeLessThan(5);
        expect(Math.hypot(x - previous.position[0], y - previous.position[1], z - previous.position[2])).toBeLessThan(1.2);
        expect(angleBetween(current.orientation, previous.orientation)).toBeLessThan(0.9);
        previous = current;
      }
    }
  });

  it('has two to four bounces, spread across seeds, ending when the motion ends', () => {
    const counts = new Map<number, number>();
    for (let index = 0; index < 2000; index += 1) {
      const dieThrow = buildThrow(seedOf(index), 3, DURATION);
      expect(dieThrow.bounces).toBeGreaterThanOrEqual(2);
      expect(dieThrow.bounces).toBeLessThanOrEqual(4);
      expect(dieThrow.contactsMs).toHaveLength(dieThrow.bounces + 1);
      expect([...dieThrow.contactsMs].sort((a, b) => a - b)).toEqual([...dieThrow.contactsMs]);
      expect(dieThrow.contactsMs.at(-1)).toBeCloseTo(DURATION * MOTION_SHARE, 6);
      counts.set(dieThrow.bounces, (counts.get(dieThrow.bounces) ?? 0) + 1);
    }
    for (const bounces of [2, 3, 4]) expect(counts.get(bounces) ?? 0).toBeGreaterThan(400);
  });

  it('lasts exactly the requested duration, whatever it is', () => {
    for (const duration of [800, 2400, 3000]) {
      const dieThrow = buildThrow(77, 5, duration);
      expect(dieThrow.durationMs).toBe(duration);
      expect(dieThrow.contactsMs.at(-1)!).toBeLessThanOrEqual(duration * MOTION_SHARE + 1e-6);
      expect(dieThrow.sample(duration + 5000)).toEqual(dieThrow.sample(duration));
      expect(dieThrow.sample(-50)).toEqual(dieThrow.sample(0));
      expect(topFace(dieThrow.sample(duration).orientation)).toBe(5);
    }
  });

  it('gives the same path for the same seed and different paths for different seeds', () => {
    const a = buildThrow(1234, 4, DURATION);
    const b = buildThrow(1234, 4, DURATION);
    for (const t of [0, 300, 900, 1500, 2100, 2400]) expect(a.sample(t)).toEqual(b.sample(t));
    let identical = 0;
    for (let index = 0; index < 200; index += 1) {
      const first = buildThrow(seedOf(index), 4, DURATION).sample(900);
      const second = buildThrow(seedOf(index + 1), 4, DURATION).sample(900);
      if (JSON.stringify(first) === JSON.stringify(second)) identical += 1;
    }
    expect(identical).toBe(0);
  });

  it('rejects a face that is not on a die', () => {
    expect(() => buildThrow(1, 7, DURATION)).toThrow(RangeError);
    expect(() => buildThrow(1, 0, DURATION)).toThrow(RangeError);
  });
});

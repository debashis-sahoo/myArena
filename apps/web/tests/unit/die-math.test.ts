import { describe, expect, it } from 'vitest';
import { buildThrow } from '@myarena/ludo';
import { FACE_PLACEMENT, PIP_CELLS, diePose, faceDirection, idleSample } from '../../src/features/ludo/view/dieMath';

type V = [number, number, number];
const apply = (m: number[], v: V): V => [
  m[0]! * v[0] + m[4]! * v[1] + m[8]! * v[2],
  m[1]! * v[0] + m[5]! * v[1] + m[9]! * v[2],
  m[2]! * v[0] + m[6]! * v[1] + m[10]! * v[2],
];
const det = (m: number[]): number =>
  m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);

describe('the die on the page', () => {
  it('ends every throw with the decided face up, for every face and many seeds', () => {
    for (let face = 1; face <= 6; face += 1) {
      for (let seed = 1; seed <= 200; seed += 1) {
        const final = diePose(buildThrow(seed * 31 + face, face, 2000).sample(2000));
        const up = apply(final.matrix, [...faceDirection(face)] as V);
        expect(up[0]).toBeCloseTo(0, 5);
        expect(up[1]).toBeCloseTo(-1, 5);
        expect(up[2]).toBeCloseTo(0, 5);
        expect(final.hop).toBeCloseTo(0, 6);
      }
    }
  });

  it('is a proper rotation with a translation, never mirrored or squashed, at every moment of a throw', () => {
    const throwing = buildThrow(42, 4, 2400);
    for (let t = 0; t <= 2400; t += 100) {
      const { matrix } = diePose(throwing.sample(t));
      expect(det(matrix)).toBeCloseTo(1, 5);
      expect(matrix[3]).toBe(0);
      expect(matrix[15]).toBe(1);
    }
  });

  it('shows a smaller, fainter shadow while the die is in the air', () => {
    const throwing = buildThrow(7, 3, 2400);
    const poses = Array.from({ length: 25 }, (_, index) => diePose(throwing.sample(index * 100)));
    const high = poses.reduce((best, pose) => (pose.hop > best.hop ? pose : best));
    expect(high.hop).toBeGreaterThan(0.5);
    expect(high.shadowOpacity).toBeLessThan(diePose(throwing.sample(2400)).shadowOpacity);
  });

  it('rests the idle die in the middle with the right face up', () => {
    for (let face = 1; face <= 6; face += 1) {
      const pose = diePose(idleSample(face));
      const up = apply(pose.matrix, [...faceDirection(face)] as V);
      expect(up[1]).toBeCloseTo(-1, 5);
      expect(pose.matrix[12]).toBe(0);
      expect(pose.matrix[14]).toBe(0);
    }
  });

  it('has a side and the right number of pips for each of the six faces', () => {
    expect(Object.keys(FACE_PLACEMENT)).toHaveLength(6);
    for (let face = 1; face <= 6; face += 1) expect(PIP_CELLS[face]).toHaveLength(face);
    for (let face = 1; face <= 6; face += 1) {
      const a = faceDirection(face);
      const b = faceDirection(7 - face);
      expect(a[0] + b[0]).toBeCloseTo(0);
      expect(a[1] + b[1]).toBeCloseTo(0);
      expect(a[2] + b[2]).toBeCloseTo(0);
    }
  });
});

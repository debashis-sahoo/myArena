import { describe, expect, it } from 'vitest';
import { cellOf, type Color } from '@myarena/ludo';
import { centreOf, slotCentres, travelPath } from '../../src/features/ludo/view/geometry';
import { HOP_MS, MAX_MOVE_MS, planHop, poseAt, posesAt, type MovedEvent } from '../../src/features/ludo/view/hops';

const COLORS: Color[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
const move = (from: number, to: number, captured?: MovedEvent['captured']): MovedEvent => ({ kind: 'MOVED', seat: 0, pawn: 0, from, to, ...(captured ? { captured } : {}) });
const at = (color: Color, step: number) => centreOf(cellOf(color, 0, step));

describe('the pawn travel path', () => {
  it('has one hop per step, ending on the square the pawn lands on', () => {
    for (const color of COLORS) {
      for (const [from, to] of [[0, 1], [3, 8], [48, 53], [50, 56], [55, 56]] as const) {
        const path = travelPath(color, 0, from, to);
        expect(path).toHaveLength(to - from);
        expect(path.at(-1)).toEqual(at(color, to));
      }
    }
  });

  it('moves between neighbouring squares, even across the four diagonal corner steps', () => {
    for (const color of COLORS) {
      let previous = at(color, 0);
      for (const point of travelPath(color, 0, 0, 56)) {
        expect(Math.hypot(point.x - previous.x, point.y - previous.y)).toBeLessThanOrEqual(Math.SQRT2 + 1e-9);
        previous = point;
      }
    }
  });

  it('goes straight from base onto the start square, and straight back to the base slot after a capture', () => {
    expect(travelPath('GREEN', 2, -1, 0)).toEqual([centreOf(cellOf('GREEN', 2, 0))]);
    expect(travelPath('BLUE', 3, 17, -1)).toEqual([slotCentres('BLUE')[3]]);
  });
});

describe('planning the hops of a move', () => {
  const plan = (from: number, to: number, captured?: { key: string; start: { x: number; y: number }; target: { x: number; y: number } }) =>
    planHop({ event: move(from, to), color: 'RED', start: at('RED', from), target: at('RED', to), ...(captured ? { captured } : {}) });

  it('hops once per square, in order, ending on the destination, 200 ms each', () => {
    for (const squares of [1, 4, 6]) {
      const { segments, totalMs } = plan(10, 10 + squares);
      const mover = segments.get('0:0')!;
      expect(mover).toHaveLength(squares);
      mover.forEach((segment, index) => {
        expect(segment.startMs).toBe(index * HOP_MS);
        expect(segment.durationMs).toBe(HOP_MS);
        if (index > 0) expect(segment.from).toEqual(mover[index - 1]!.to);
      });
      expect(mover.at(-1)!.to).toEqual(at('RED', 10 + squares));
      expect(totalMs).toBe(squares * HOP_MS);
    }
  });

  it('leaves the yard with a single hop and ends a move into home in the centre', () => {
    expect(plan(-1, 0).segments.get('0:0')).toHaveLength(1);
    expect(plan(51, 56).segments.get('0:0')!.at(-1)!.to).toEqual(at('RED', 56));
  });

  it('never lasts longer than a move limit, even for a very long path', () => {
    expect(plan(0, 40).totalMs).toBeLessThanOrEqual(MAX_MOVE_MS);
  });

  it('knocks a captured pawn back only after the capturing pawn has landed', () => {
    const slot = slotCentres('GREEN')[1]!;
    const { segments, totalMs } = plan(10, 14, { key: '1:1', start: at('RED', 14), target: slot });
    const knock = segments.get('1:1')![0]!;
    expect(knock.startMs).toBe(4 * HOP_MS);
    expect(knock.to).toEqual(slot);
    expect(totalMs).toBe(knock.startMs + knock.durationMs);
    expect(poseAt(segments.get('1:1')!, 100)).toMatchObject({ x: at('RED', 14).x, y: at('RED', 14).y, lift: 0 });
  });
});

describe('the pose of a hopping pin', () => {
  const { segments, totalMs } = planHop({ event: move(10, 12), color: 'RED', start: at('RED', 10), target: at('RED', 12) });
  const mover = segments.get('0:0')!;

  it('starts on its square, rises mid-hop, and lands on the next square', () => {
    expect(poseAt(mover, 0)).toMatchObject({ x: at('RED', 10).x, lift: 0, squash: 1 });
    expect(poseAt(mover, HOP_MS / 2).lift).toBeGreaterThan(0.3);
    expect(poseAt(mover, HOP_MS - 1).lift).toBeLessThan(0.05);
    expect(poseAt(mover, HOP_MS)).toMatchObject(at('RED', 11));
  });

  it('squashes a little as it lands and rests exactly on the destination at the end', () => {
    expect(poseAt(mover, HOP_MS * 0.93).squash).toBeLessThan(1);
    expect(posesAt({ segments, totalMs }, totalMs)).toBeNull();
    expect(poseAt(mover, totalMs + 50)).toEqual({ ...at('RED', 12), lift: 0, squash: 1 });
  });
});

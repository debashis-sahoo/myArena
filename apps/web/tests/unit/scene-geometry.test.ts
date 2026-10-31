import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { BASE_SLOTS, GRID, LANES, RING, cellOf, type Color } from '@myarena/ludo';
import { allSquares, cellAt, groundOf, travelPath } from '../../src/features/ludo/scene/geometry';
import { MIN_HIT_RADIUS_PX, pickNearest } from '../../src/features/ludo/scene/picking';

const COLORS: Color[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

describe('the layout-to-world mapping', () => {
  it('is one-to-one for every square a pawn can stand on', () => {
    const squares = allSquares();
    expect(squares).toHaveLength(RING.length + 4 * LANES.RED.length + 4 * BASE_SLOTS.RED.length + 4);
    expect(new Set(squares.map((cell) => `${cell.col},${cell.row}`)).size).toBe(squares.length);
    const grounds = squares.map((cell) => groundOf(cell));
    expect(new Set(grounds.map((ground) => `${ground.x},${ground.z}`)).size).toBe(squares.length);
    for (const cell of squares) {
      const { x, z } = groundOf(cell);
      expect(cellAt(x, z)).toEqual(cell);
    }
  });

  it('puts the board square on the origin, one world unit per square, and nothing off the board', () => {
    expect(groundOf({ col: 7, row: 7 })).toEqual({ x: 0, z: 0 });
    expect(groundOf({ col: 0, row: 0 })).toEqual({ x: -7, z: -7 });
    expect(groundOf({ col: GRID - 1, row: GRID - 1 })).toEqual({ x: 7, z: 7 });
    expect(cellAt(-7.6, 0)).toBeNull();
    expect(cellAt(0, 7.6)).toBeNull();
  });
});

describe('the pawn travel path', () => {
  it('has one hop per step, ending on the square the pawn lands on', () => {
    for (const color of COLORS) {
      for (const [from, to] of [[0, 1], [3, 8], [48, 53], [50, 56], [55, 56]] as const) {
        const path = travelPath(color, 0, from, to);
        expect(path).toHaveLength(to - from);
        expect(path.at(-1)).toEqual(groundOf(cellOf(color, 0, to)));
      }
    }
  });

  it('moves between neighbouring squares, even across the four diagonal corner steps', () => {
    for (const color of COLORS) {
      const path = travelPath(color, 0, 0, 56);
      let previous = groundOf(cellOf(color, 0, 0));
      for (const ground of path) {
        expect(Math.hypot(ground.x - previous.x, ground.z - previous.z)).toBeLessThanOrEqual(Math.SQRT2 + 1e-9);
        previous = ground;
      }
    }
  });

  it('goes straight from base onto the start square, and straight back to the base slot after a capture', () => {
    expect(travelPath('GREEN', 2, -1, 0)).toEqual([groundOf(cellOf('GREEN', 2, 0))]);
    expect(travelPath('BLUE', 3, 17, -1)).toEqual([groundOf(BASE_SLOTS.BLUE[3]!)]);
  });
});

describe('picking a pawn', () => {
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 20, 12);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const rect = { left: 0, top: 0, width: 600, height: 600 };
  const screenOf = (position: Vector3) => {
    const projected = position.clone().project(camera);
    return { x: ((projected.x + 1) / 2) * rect.width, y: ((1 - projected.y) / 2) * rect.height };
  };

  it('hits a pawn within 22 CSS pixels, so the target is at least 44 pixels wide, and nothing beyond', () => {
    expect(MIN_HIT_RADIUS_PX).toBeGreaterThanOrEqual(22);
    const target = { pawn: 1, position: new Vector3(2, 0.5, 1) };
    const at = screenOf(target.position);
    expect(pickNearest([target], camera, rect, { x: at.x + 21, y: at.y })).toBe(1);
    expect(pickNearest([target], camera, rect, { x: at.x, y: at.y - 22 })).toBe(1);
    expect(pickNearest([target], camera, rect, { x: at.x + 40, y: at.y })).toBeNull();
  });

  it('picks the nearest of several pawns, and ignores a hit radius below the minimum', () => {
    const near = { pawn: 0, position: new Vector3(0, 0.5, 0) };
    const far = { pawn: 3, position: new Vector3(0.4, 0.5, 0) };
    const point = screenOf(near.position);
    expect(pickNearest([far, near], camera, rect, point)).toBe(0);
    expect(pickNearest([near], camera, rect, { x: point.x + 20, y: point.y }, 4)).toBe(0);
    expect(pickNearest([], camera, rect, point)).toBeNull();
  });
});

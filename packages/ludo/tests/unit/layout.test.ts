import { describe, expect, it } from 'vitest';
import { BASE_SLOTS, COLORS, GRID, HOME_CELL, LANES, RING, START_INDEX, STAR_INDEXES, cellOf, ringIndexOf } from '../../src/index.js';

const key = (cell: { col: number; row: number }) => `${cell.col},${cell.row}`;

describe('board layout', () => {
  it('has 52 distinct ring squares inside the 15 by 15 grid', () => {
    expect(RING).toHaveLength(52);
    expect(new Set(RING.map(key)).size).toBe(52);
    for (const cell of RING) {
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(GRID);
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(GRID);
    }
  });

  it('keeps consecutive ring squares adjacent, crossing each inner corner with one diagonal step', () => {
    let diagonal = 0;
    for (let index = 0; index < RING.length; index += 1) {
      const from = RING[index]!;
      const to = RING[(index + 1) % RING.length]!;
      const dx = Math.abs(from.col - to.col);
      const dy = Math.abs(from.row - to.row);
      expect(Math.max(dx, dy)).toBe(1);
      if (dx === 1 && dy === 1) diagonal += 1;
    }
    expect(diagonal).toBe(4);
  });

  it('places the start and star squares at the documented ring indexes', () => {
    expect(START_INDEX).toEqual({ RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 });
    expect(STAR_INDEXES).toEqual([8, 21, 34, 47]);
  });

  it('gives each colour five lane squares that end next to the centre and never touch the ring', () => {
    const ring = new Set(RING.map(key));
    for (const color of COLORS) {
      const lane = LANES[color];
      expect(lane).toHaveLength(5);
      for (const cell of lane) expect(ring.has(key(cell))).toBe(false);
      const last = lane[4]!;
      const home = HOME_CELL[color];
      expect(Math.abs(last.col - home.col) + Math.abs(last.row - home.row)).toBe(1);
    }
  });

  it('gives each colour four distinct base slots', () => {
    const all = COLORS.flatMap((color) => BASE_SLOTS[color].map(key));
    expect(all).toHaveLength(16);
    expect(new Set(all).size).toBe(16);
  });

  it('maps every step of a colour to a cell, ending the ring one square before its own start', () => {
    for (const color of COLORS) {
      expect(cellOf(color, 0, 0)).toEqual(RING[START_INDEX[color]]);
      expect(cellOf(color, 2, -1)).toEqual(BASE_SLOTS[color][2]);
      expect(cellOf(color, 0, 51)).toEqual(LANES[color][0]);
      expect(cellOf(color, 0, 56)).toEqual(HOME_CELL[color]);
      expect(ringIndexOf(color, 50)).toBe((START_INDEX[color] + 50) % 52);
      expect(ringIndexOf(color, 51)).toBeNull();
    }
    expect(() => cellOf('RED', 0, 57)).toThrow(RangeError);
  });
});

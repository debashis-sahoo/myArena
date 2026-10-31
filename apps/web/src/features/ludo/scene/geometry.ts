import { BASE, BASE_SLOTS, GRID, HOME_CELL, LANES, RING, cellOf, type Cell, type Color } from '@myarena/ludo';

/** The board is GRID squares wide and one world unit per square, centred on the origin; the table surface is y = 0. */
export const BOARD_HALF = GRID / 2;

export interface Ground { x: number; z: number; }

/** The middle of a square in world units (x grows to the right, z towards the viewer). */
export const groundOf = (cell: Cell): Ground => ({ x: cell.col + 0.5 - BOARD_HALF, z: cell.row + 0.5 - BOARD_HALF });

/** The square under a world position, or null when it is off the board. */
export function cellAt(x: number, z: number): Cell | null {
  const col = Math.floor(x + BOARD_HALF);
  const row = Math.floor(z + BOARD_HALF);
  return col >= 0 && col < GRID && row >= 0 && row < GRID ? { col, row } : null;
}

/** Every square a pawn can stand on, each once. */
export function allSquares(): Cell[] {
  const colors = Object.keys(LANES) as Color[];
  return [...RING, ...colors.flatMap((color) => [...LANES[color]]), ...colors.flatMap((color) => [...BASE_SLOTS[color]]), ...colors.map((color) => HOME_CELL[color])];
}

/**
 * The squares a pawn visits, one hop each, when it goes from step `from` to step `to`: out of base onto the start
 * square, along the ring and lane, or (for a captured pawn) straight back to its base slot.
 */
export function travelPath(color: Color, pawn: number, from: number, to: number): Ground[] {
  if (to === BASE || from === BASE) return [groundOf(cellOf(color, pawn, to))];
  const path: Ground[] = [];
  for (let step = from + 1; step <= to; step += 1) path.push(groundOf(cellOf(color, pawn, step)));
  return path;
}

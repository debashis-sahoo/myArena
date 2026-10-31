import { BASE, HOME_STEP, FIRST_LANE_STEP, LAST_RING_STEP, ringIndexOf, type Color } from './board.js';

export interface Cell { col: number; row: number; }
export const GRID = 15;

const cells = (...pairs: [number, number][]): Cell[] => pairs.map(([col, row]) => ({ col, row }));

// The 52 shared squares, clockwise, starting at Red's start square. Each of the four inner corners is crossed
// by one diagonal step, as on a real board.
export const RING: readonly Cell[] = cells(
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0],
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7],
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14],
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7],
  [0, 6],
);

/** Each colour's five home-lane squares, from the ring towards the centre. */
export const LANES: Readonly<Record<Color, readonly Cell[]>> = {
  RED: cells([1, 7], [2, 7], [3, 7], [4, 7], [5, 7]),
  GREEN: cells([7, 1], [7, 2], [7, 3], [7, 4], [7, 5]),
  YELLOW: cells([13, 7], [12, 7], [11, 7], [10, 7], [9, 7]),
  BLUE: cells([7, 13], [7, 12], [7, 11], [7, 10], [7, 9]),
};

export const BASE_SLOTS: Readonly<Record<Color, readonly Cell[]>> = {
  RED: cells([1, 1], [4, 1], [1, 4], [4, 4]),
  GREEN: cells([10, 1], [13, 1], [10, 4], [13, 4]),
  YELLOW: cells([10, 10], [13, 10], [10, 13], [13, 13]),
  BLUE: cells([1, 10], [4, 10], [1, 13], [4, 13]),
};

export const HOME_CELL: Readonly<Record<Color, Cell>> = {
  RED: { col: 6, row: 7 }, GREEN: { col: 7, row: 6 }, YELLOW: { col: 8, row: 7 }, BLUE: { col: 7, row: 8 },
};

/** The grid cell a pawn occupies at a step. */
export function cellOf(color: Color, pawn: number, step: number): Cell {
  if (step === BASE) return BASE_SLOTS[color][pawn]!;
  if (step >= 0 && step <= LAST_RING_STEP) return RING[ringIndexOf(color, step)!]!;
  if (step >= FIRST_LANE_STEP && step < HOME_STEP) return LANES[color][step - FIRST_LANE_STEP]!;
  if (step === HOME_STEP) return HOME_CELL[color];
  throw new RangeError(`Invalid pawn step ${step}.`);
}

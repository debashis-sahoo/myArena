import { BASE, GRID, cellOf, type Cell, type Color } from '@myarena/ludo';

export interface Point { x: number; y: number; }

/** The board fills its square edge to edge. */
export const VIEWBOX = `0 0 ${GRID} ${GRID}`;

/** The middle of a square on the 15 by 15 grid, where one square is one unit. */
export const centreOf = (cell: Cell): Point => ({ x: cell.col + 0.5, y: cell.row + 0.5 });

export interface Frame { x: number; y: number; size: number; yard: { x: number; y: number; size: number }; }

/** Each colour's 6 by 6 corner block, with its white 4 by 4 yard inset by one square. */
export const FRAMES: Readonly<Record<Color, Frame>> = {
  RED: { x: 0, y: 0, size: 6, yard: { x: 1, y: 1, size: 4 } },
  GREEN: { x: 9, y: 0, size: 6, yard: { x: 10, y: 1, size: 4 } },
  YELLOW: { x: 9, y: 9, size: 6, yard: { x: 10, y: 10, size: 4 } },
  BLUE: { x: 0, y: 9, size: 6, yard: { x: 1, y: 10, size: 4 } },
};

/** The yard's four slot centres, one per pawn: the middle of each quarter of the yard. */
export const slotCentres = (color: Color): Point[] => {
  const { x, y } = FRAMES[color].yard;
  return [{ x: x + 1, y: y + 1 }, { x: x + 3, y: y + 1 }, { x: x + 1, y: y + 3 }, { x: x + 3, y: y + 3 }];
};

/** A thin arrow on the edge square in front of each colour's home lane, pointing in towards the centre. */
export const ENTRY_ARROWS: Readonly<Record<Color, { cell: Cell; dx: number; dy: number }>> = {
  RED: { cell: { col: 0, row: 7 }, dx: 1, dy: 0 },
  GREEN: { cell: { col: 7, row: 0 }, dx: 0, dy: 1 },
  YELLOW: { cell: { col: 14, row: 7 }, dx: -1, dy: 0 },
  BLUE: { cell: { col: 7, row: 14 }, dx: 0, dy: -1 },
};

/** A player's name sits in the thick outer edge of their corner block: the top edge for the top corners, the bottom edge for the bottom ones. */
export const NAME_BARS: Readonly<Record<Color, { x: number; y: number; width: number; height: number }>> = {
  RED: { x: 0.45, y: 0.14, width: 5.1, height: 0.72 },
  GREEN: { x: 9.45, y: 0.14, width: 5.1, height: 0.72 },
  YELLOW: { x: 9.45, y: 14.14, width: 5.1, height: 0.72 },
  BLUE: { x: 0.45, y: 14.14, width: 5.1, height: 0.72 },
};

/**
 * The squares a pawn visits, one hop each, when it goes from step `from` to step `to`: out of base onto the start
 * square, along the ring and lane, or (for a captured pawn) straight back to its base slot.
 */
export function travelPath(color: Color, pawn: number, from: number, to: number): Point[] {
  if (to === BASE || from === BASE) return [to === BASE ? slotCentres(color)[pawn]! : centreOf(cellOf(color, pawn, to))];
  const path: Point[] = [];
  for (let step = from + 1; step <= to; step += 1) path.push(centreOf(cellOf(color, pawn, step)));
  return path;
}

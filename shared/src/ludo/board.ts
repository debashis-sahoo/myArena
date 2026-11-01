/** Authoritative Ludo geometry (specs/002-ludo-game-module/research.md R2). Shared by server rules and client drawing. */

export type LudoColor = 'yellow' | 'green' | 'blue' | 'red';
export type Cell = readonly [row: number, col: number];

/** Clockwise from the top-left corner. */
export const COLOR_ORDER: readonly LudoColor[] = ['yellow', 'green', 'blue', 'red'];

export const BOARD_SIZE = 15;
export const RING_LENGTH = 52;
export const HOME_PROGRESS = 56;
export const BASE_PROGRESS = -1;
export const REMOVED_PROGRESS = -2;
export const PAWNS_PER_PLAYER = 4;

/** The shared 52-square track, clockwise, index 0 = Yellow's start square. */
export const RING: readonly Cell[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

export const START_INDEX: Record<LudoColor, number> = { yellow: 0, green: 13, blue: 26, red: 39 };

/** Ring indexes where nothing can be captured: the four starts plus the star squares. */
export const SAFE_RING: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

/** Five home-lane squares per colour, the last one adjacent to HOME. */
export const LANES: Record<LudoColor, readonly Cell[]> = {
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

/** Pawn spots in each base as grid-line centres [x, y] = [column, row]. */
export const BASE_SPOTS: Record<LudoColor, readonly (readonly [x: number, y: number])[]> = {
  yellow: [[2, 2], [4, 2], [2, 4], [4, 4]],
  green: [[11, 2], [13, 2], [11, 4], [13, 4]],
  red: [[2, 11], [4, 11], [2, 13], [4, 13]],
  blue: [[11, 11], [13, 11], [11, 13], [13, 13]],
};

/** Corner base rectangles (top row, left column, size in squares). */
export const BASE_RECT: Record<LudoColor, { row: number; col: number; size: number }> = {
  yellow: { row: 0, col: 0, size: 6 },
  green: { row: 0, col: 9, size: 6 },
  red: { row: 9, col: 0, size: 6 },
  blue: { row: 9, col: 9, size: 6 },
};

export const HOME_RECT = { row: 6, col: 6, size: 3 } as const;

export type SquareKind = 'ring' | 'lane' | 'home';
export interface SquareRef {
  kind: SquareKind;
  /** [row, col] for ring and lane squares; the HOME centre for 'home'. */
  cell: Cell;
}

export const HOME_CENTER: Cell = [7, 7];

export function isSafeRingIndex(index: number): boolean {
  return SAFE_RING.includes(index);
}

/** Ring index for a pawn at progress 0 to 50. */
export function ringIndexOf(color: LudoColor, progress: number): number {
  return (START_INDEX[color] + progress) % RING_LENGTH;
}

/** The square a pawn occupies at progress 0 to 56. */
export function cellOf(color: LudoColor, progress: number): SquareRef {
  if (progress >= HOME_PROGRESS) return { kind: 'home', cell: HOME_CENTER };
  if (progress > 50) return { kind: 'lane', cell: LANES[color][progress - 51] as Cell };
  return { kind: 'ring', cell: RING[ringIndexOf(color, progress)] as Cell };
}

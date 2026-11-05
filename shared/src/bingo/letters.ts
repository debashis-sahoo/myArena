/** Bingo letters and number ranges. Spec: specs/005-bingo-75-ball-module/data-model.md */
export const BINGO_BALLS = 75;

export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;
export type BingoLetter = (typeof BINGO_LETTERS)[number];

/** Inclusive [min, max] per column: B 1-15, I 16-30, N 31-45, G 46-60, O 61-75. */
export const BINGO_COLUMN_RANGES: ReadonlyArray<readonly [number, number]> = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];

/** Column 0 to 4 of a ball number (clamped for numbers outside 1 to 75). */
export function columnOfNumber(n: number): number {
  return Math.min(4, Math.max(0, Math.floor((n - 1) / 15)));
}

export function ballLetter(n: number): BingoLetter {
  return BINGO_LETTERS[columnOfNumber(n)] ?? 'B';
}

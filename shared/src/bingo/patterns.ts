/** Bingo winning-pattern catalogue (specs/005-bingo-75-ball-module/research.md R3). Cell index = row * 5 + col; the centre is 12. */

export type BingoPatternGroup = 'standard' | 'custom';

export interface BingoPatternDef {
  id: string;
  name: string;
  group: BingoPatternGroup;
  description: string;
  /** Cells drawn in the picture: the first variant. */
  illustration: readonly number[];
  /** Short note under the picture for "any of" patterns. */
  caption?: string;
  /** A card completes the pattern when at least one variant has every cell satisfied. */
  variants: readonly (readonly number[])[];
}

const def = (
  id: string,
  name: string,
  group: BingoPatternGroup,
  description: string,
  variants: readonly (readonly number[])[],
  caption?: string,
): BingoPatternDef => ({
  id,
  name,
  group,
  description,
  illustration: variants[0] ?? [],
  ...(caption ? { caption } : {}),
  variants,
});

export const BINGO_PATTERNS: readonly BingoPatternDef[] = [
  def(
    'single-line',
    'Single Line',
    'standard',
    'Any one complete row, column or diagonal.',
    [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ],
    'any line',
  ),
  def('four-corners', 'Four Corners', 'standard', 'The four corner cells.', [[0, 4, 20, 24]]),
  def('letter-x', 'Letter X', 'standard', 'Both diagonals, making an X.', [[0, 4, 6, 8, 12, 16, 18, 20, 24]]),
  def('letter-l', 'Letter L', 'standard', 'The whole B column and the bottom row.', [[0, 5, 10, 15, 20, 21, 22, 23, 24]]),
  def(
    'blackout',
    'Blackout',
    'standard',
    'Every cell on the card (Full House).',
    [Array.from({ length: 25 }, (_, i) => i)],
  ),
  def(
    'postage-stamp',
    'Postage Stamp',
    'custom',
    'A 2 by 2 block in any corner of the card.',
    [
      [0, 1, 5, 6],
      [3, 4, 8, 9],
      [15, 16, 20, 21],
      [18, 19, 23, 24],
    ],
    'any corner',
  ),
  def('diamond', 'Diamond', 'custom', 'A diamond outline around the centre.', [[2, 6, 8, 10, 14, 16, 18, 22]]),
  def('kite', 'Kite', 'custom', 'A kite with its tail running to the bottom-left corner.', [[3, 4, 8, 9, 12, 16, 20]]),
  def('inner-square', 'Inner Square', 'custom', 'The inner 3 by 3 block.', [[6, 7, 8, 11, 12, 13, 16, 17, 18]]),
];

const GROUP_LABELS: readonly { id: BingoPatternGroup; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'custom', label: 'Custom/Thematic' },
];

export const BINGO_PATTERN_GROUPS: readonly { id: BingoPatternGroup; label: string; ids: string[] }[] = GROUP_LABELS.map((g) => ({
  id: g.id,
  label: g.label,
  ids: BINGO_PATTERNS.filter((p) => p.group === g.id).map((p) => p.id),
}));

const BY_ID: ReadonlyMap<string, BingoPatternDef> = new Map(BINGO_PATTERNS.map((p) => [p.id, p]));

export function getBingoPattern(id: string): BingoPatternDef | undefined {
  return BY_ID.get(id);
}

/** Bingo winning-pattern catalogue (specs/005-bingo-75-ball-module/research.md R3). Cell index = row * 5 + col; the centre is 12. */

export type BingoPatternGroup = 'standard' | 'letters' | 'shapes' | 'multi';

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

/** The 12 lines of a card: five rows, five columns and the two diagonals. */
const LINES: readonly (readonly number[])[] = [
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
];

/** Every way to pick two different lines, as the sorted union of their cells (66 variants). */
const LINE_PAIRS: readonly (readonly number[])[] = LINES.flatMap((a, i) =>
  LINES.slice(i + 1).map((b) => [...new Set([...a, ...b])].sort((x, y) => x - y)),
);

export const BINGO_PATTERNS: readonly BingoPatternDef[] = [
  def('single-line', 'Single Line', 'standard', 'Any one complete row, column or diagonal.', LINES, 'any line'),
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
  def('letter-t', 'Letter T', 'letters', 'The top row and the N column, making a T.', [[0, 1, 2, 3, 4, 7, 12, 17, 22]]),
  def('letter-h', 'Letter H', 'letters', 'The B and O columns joined by the middle row.', [[0, 4, 5, 9, 10, 11, 12, 13, 14, 15, 19, 20, 24]]),
  def('letter-z', 'Letter Z', 'letters', 'The top row, the bottom row and the diagonal between them.', [[0, 1, 2, 3, 4, 8, 12, 16, 20, 21, 22, 23, 24]]),
  def('letter-n', 'Letter N', 'letters', 'The B and O columns joined by the diagonal.', [[0, 4, 5, 6, 9, 10, 12, 14, 15, 18, 19, 20, 24]]),
  def('letter-c', 'Letter C', 'letters', 'The top row, the bottom row and the B column.', [[0, 1, 2, 3, 4, 5, 10, 15, 20, 21, 22, 23, 24]]),
  def('letter-u', 'Letter U', 'letters', 'The B and O columns and the bottom row.', [[0, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]]),
  def('letter-i', 'Letter I', 'letters', 'The top row, the bottom row and the N column.', [[0, 1, 2, 3, 4, 7, 12, 17, 20, 21, 22, 23, 24]]),
  def('letter-y', 'Letter Y', 'letters', 'The two upper diagonals meeting in the centre, then the N column down.', [[0, 4, 6, 8, 12, 17, 22]]),
  def(
    'postage-stamp',
    'Postage Stamp',
    'shapes',
    'A 2 by 2 block in any corner of the card.',
    [
      [0, 1, 5, 6],
      [3, 4, 8, 9],
      [15, 16, 20, 21],
      [18, 19, 23, 24],
    ],
    'any corner',
  ),
  def('diamond', 'Diamond', 'shapes', 'A diamond outline around the centre.', [[2, 6, 8, 10, 14, 16, 18, 22]]),
  def('kite', 'Kite', 'shapes', 'A kite with its tail running to the bottom-left corner.', [[3, 4, 8, 9, 12, 16, 20]]),
  def('inner-square', 'Inner Square', 'shapes', 'The inner 3 by 3 block.', [[6, 7, 8, 11, 12, 13, 16, 17, 18]]),
  def('plus-sign', 'Plus Sign', 'shapes', 'The N column crossed by the middle row.', [[2, 7, 10, 11, 12, 13, 14, 17, 22]]),
  def('picture-frame', 'Picture Frame', 'shapes', 'The whole outer ring of 16 cells.', [[0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]]),
  def('heart', 'Heart', 'shapes', 'A heart shape.', [[1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 22]]),
  def('pyramid', 'Pyramid', 'shapes', 'The bottom row, the three cells above it and the centre.', [[12, 16, 17, 18, 20, 21, 22, 23, 24]]),
  def('checkers', 'Checkers', 'shapes', 'Every other cell, starting from the top-left corner.', [[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]]),
  def('railroad-tracks', 'Railroad Tracks', 'shapes', 'The second and fourth rows.', [[5, 6, 7, 8, 9, 15, 16, 17, 18, 19]]),
  def('sandwich', 'Sandwich', 'shapes', 'The top row and the bottom row.', [[0, 1, 2, 3, 4, 20, 21, 22, 23, 24]]),
  def('four-stamps', 'Four Stamps', 'shapes', 'All four 2 by 2 corner blocks.', [[0, 1, 3, 4, 5, 6, 8, 9, 15, 16, 18, 19, 20, 21, 23, 24]]),
  def('dice-five', 'Dice Five', 'shapes', 'The four corners and the centre, like the five on a die.', [[0, 4, 12, 20, 24]]),
  def('two-lines', 'Two Lines', 'multi', 'Any two complete rows, columns or diagonals.', LINE_PAIRS, 'any two lines'),
];

const GROUP_LABELS: readonly { id: BingoPatternGroup; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'letters', label: 'Letters' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'multi', label: 'Multi-line' },
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

/** Housie winning-pattern catalogue (specs/003-housie-tambola-module/spec.md Appendix, research.md R3). Shared by server rules and client pickers. */

export type PatternGroup = 'early' | 'lines' | 'shapes' | 'numbers' | 'house';
/** Row 0..2, position 1..5 counted left to right among the five numbers of that row. */
export type PatternCell = [row: number, position: number];
export type NumberFilter = 'any' | 'odd' | 'even' | '1-45' | '46-90';

export type PatternRule =
  | { kind: 'cells'; cells: PatternCell[] }
  | { kind: 'rows' }
  | { kind: 'count'; parts: { n: number; filter: NumberFilter }[] }
  | { kind: 'full'; order: 1 | 2 | 3; need: number };

export interface PatternDef {
  id: string;
  name: string;
  group: PatternGroup;
  description: string;
  illustration: PatternCell[];
  rule: PatternRule;
}

/** Column indexes of the five numbers in each row of the sample ticket used to draw pattern pictures. */
export const ILLUSTRATION_SLOTS: readonly (readonly number[])[] = [
  [0, 1, 3, 5, 7],
  [1, 2, 4, 6, 8],
  [0, 2, 3, 5, 8],
];

const ALL_POSITIONS = [1, 2, 3, 4, 5];

const row = (r: number): PatternCell[] => ALL_POSITIONS.map((p): PatternCell => [r, p]);
const at = (r: number, ...positions: number[]): PatternCell[] => positions.map((p): PatternCell => [r, p]);
const column = (...positions: number[]): PatternCell[] => [0, 1, 2].flatMap((r) => at(r, ...positions));

const CORNERS: PatternCell[] = [...at(0, 1, 5), ...at(2, 1, 5)];

/** Spread over all three rows so the first n cells make a believable "any n numbers" picture. */
const SCATTER: PatternCell[] = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 1],
  [0, 2], [1, 3], [2, 4], [0, 5], [1, 1], [2, 2],
];
const scatter = (n: number): PatternCell[] => SCATTER.slice(0, n);

const FULL_CELLS: PatternCell[] = [...row(0), ...row(1), ...row(2)];

const cellsDef = (
  id: string,
  name: string,
  group: PatternGroup,
  description: string,
  cells: PatternCell[],
): PatternDef => ({ id, name, group, description, illustration: cells, rule: { kind: 'cells', cells } });

const countDef = (
  id: string,
  name: string,
  group: PatternGroup,
  description: string,
  parts: { n: number; filter: NumberFilter }[],
  illustration: PatternCell[],
): PatternDef => ({ id, name, group, description, illustration, rule: { kind: 'count', parts } });

const fullDef = (order: 1 | 2 | 3, name: string, description: string): PatternDef => ({
  id: `full-house-${order}`,
  name,
  group: 'house',
  description,
  illustration: FULL_CELLS,
  rule: { kind: 'full', order, need: 15 },
});

export const PATTERNS: readonly PatternDef[] = [
  // Early (4)
  countDef('early-five', 'Early Five', 'early', 'Mark any 5 numbers on your ticket.', [{ n: 5, filter: 'any' }], scatter(5)),
  countDef('early-seven', 'Early Seven', 'early', 'Mark any 7 numbers on your ticket.', [{ n: 7, filter: 'any' }], scatter(7)),
  countDef('early-ten', 'Early Ten', 'early', 'Mark any 10 numbers on your ticket.', [{ n: 10, filter: 'any' }], scatter(10)),
  countDef('early-twelve', 'Early Twelve', 'early', 'Mark any 12 numbers on your ticket.', [{ n: 12, filter: 'any' }], scatter(12)),

  // Lines (7)
  {
    id: 'any-line',
    name: 'Any Line',
    group: 'lines',
    description: 'Complete any one row of your ticket.',
    illustration: row(1),
    rule: { kind: 'rows' },
  },
  cellsDef('top-line', 'Top Line', 'lines', 'Complete all 5 numbers of the top row.', row(0)),
  cellsDef('middle-line', 'Middle Line', 'lines', 'Complete all 5 numbers of the middle row.', row(1)),
  cellsDef('bottom-line', 'Bottom Line', 'lines', 'Complete all 5 numbers of the bottom row.', row(2)),
  cellsDef('top-and-middle', 'Top and Middle', 'lines', 'Complete the top row and the middle row.', [...row(0), ...row(1)]),
  cellsDef('middle-and-bottom', 'Middle and Bottom', 'lines', 'Complete the middle row and the bottom row.', [...row(1), ...row(2)]),
  cellsDef('top-and-bottom', 'Top and Bottom', 'lines', 'Complete the top row and the bottom row.', [...row(0), ...row(2)]),

  // Shapes (20)
  cellsDef('four-corners', 'Four Corners', 'shapes', 'Mark the first and last number of the top and bottom rows.', CORNERS),
  cellsDef('star', 'Star', 'shapes', 'Four corners plus the centre number of the middle row.', [...CORNERS, ...at(1, 3)]),
  cellsDef(
    'pyramid',
    'Pyramid',
    'shapes',
    'Top centre, the middle three, and the whole bottom row.',
    [...at(0, 3), ...at(1, 2, 3, 4), ...row(2)],
  ),
  cellsDef(
    'reverse-pyramid',
    'Reverse Pyramid',
    'shapes',
    'The whole top row, the middle three, and the bottom centre.',
    [...row(0), ...at(1, 2, 3, 4), ...at(2, 3)],
  ),
  cellsDef(
    'diamond',
    'Diamond',
    'shapes',
    'Top centre, the second and fourth of the middle row, and the bottom centre.',
    [...at(0, 3), ...at(1, 2, 4), ...at(2, 3)],
  ),
  cellsDef('left-edge', 'Left Edge', 'shapes', 'The first number of every row.', column(1)),
  cellsDef('right-edge', 'Right Edge', 'shapes', 'The last number of every row.', column(5)),
  cellsDef('both-edges', 'Both Edges', 'shapes', 'The first and last number of every row.', column(1, 5)),
  cellsDef('middle-column', 'Middle Column', 'shapes', 'The centre number of every row.', column(3)),
  cellsDef('plus', 'Plus', 'shapes', 'The whole middle row plus the top and bottom centres.', [...at(0, 3), ...row(1), ...at(2, 3)]),
  cellsDef(
    'letter-h',
    'Letter H',
    'shapes',
    'First and last of every row, plus the middle three of the middle row.',
    [...at(0, 1, 5), ...at(1, 1, 2, 3, 4, 5), ...at(2, 1, 5)],
  ),
  cellsDef(
    'letter-u',
    'Letter U',
    'shapes',
    'First and last of the top and middle rows, plus the whole bottom row.',
    [...at(0, 1, 5), ...at(1, 1, 5), ...row(2)],
  ),
  cellsDef(
    'letter-t',
    'Letter T',
    'shapes',
    'The whole top row plus the centre of the middle and bottom rows.',
    [...row(0), ...at(1, 3), ...at(2, 3)],
  ),
  cellsDef(
    'frame',
    'Frame',
    'shapes',
    'The whole top and bottom rows plus the first and last of the middle row.',
    [...row(0), ...at(1, 1, 5), ...row(2)],
  ),
  cellsDef(
    'letter-l',
    'Letter L',
    'shapes',
    'The first number of the top and middle rows, plus the whole bottom row.',
    [...at(0, 1), ...at(1, 1), ...row(2)],
  ),
  cellsDef(
    'letter-z',
    'Letter Z',
    'shapes',
    'The whole top and bottom rows plus the centre of the middle row.',
    [...row(0), ...at(1, 3), ...row(2)],
  ),
  cellsDef(
    'checkerboard',
    'Checkerboard',
    'shapes',
    'Alternating numbers: 1st, 3rd, 5th of top and bottom, 2nd and 4th of middle.',
    [...at(0, 1, 3, 5), ...at(1, 2, 4), ...at(2, 1, 3, 5)],
  ),
  cellsDef(
    'diagonal-down',
    'Diagonal Down',
    'shapes',
    'Top first, middle centre, bottom last.',
    [...at(0, 1), ...at(1, 3), ...at(2, 5)],
  ),
  cellsDef(
    'diagonal-up',
    'Diagonal Up',
    'shapes',
    'Top last, middle centre, bottom first.',
    [...at(0, 5), ...at(1, 3), ...at(2, 1)],
  ),
  cellsDef(
    'corners-and-middle-line',
    'Corners and Middle Line',
    'shapes',
    'Four corners plus the whole middle row.',
    [...at(0, 1, 5), ...row(1), ...at(2, 1, 5)],
  ),

  // Number types (5)
  countDef('five-odds', 'Five Odds', 'numbers', 'Mark any 5 odd numbers.', [{ n: 5, filter: 'odd' }], scatter(5)),
  countDef('five-evens', 'Five Evens', 'numbers', 'Mark any 5 even numbers.', [{ n: 5, filter: 'even' }], scatter(5)),
  countDef('young-five', 'Young Five', 'numbers', 'Mark any 5 numbers from 1 to 45.', [{ n: 5, filter: '1-45' }], scatter(5)),
  countDef('old-five', 'Old Five', 'numbers', 'Mark any 5 numbers from 46 to 90.', [{ n: 5, filter: '46-90' }], scatter(5)),
  countDef(
    'young-and-old',
    'Young and Old',
    'numbers',
    'Mark any 5 numbers from 1 to 45 and any 5 from 46 to 90.',
    [
      { n: 5, filter: '1-45' },
      { n: 5, filter: '46-90' },
    ],
    scatter(10),
  ),

  // Full house (4)
  countDef(
    'almost-house',
    'Almost House',
    'house',
    'Mark any 14 of the 15 numbers on your ticket.',
    [{ n: 14, filter: 'any' }],
    FULL_CELLS.slice(0, 14),
  ),
  fullDef(1, 'Full House 1st', 'Mark all 15 numbers - the first valid claim wins.'),
  fullDef(2, 'Full House 2nd', 'Mark all 15 numbers - the second valid claim wins.'),
  fullDef(3, 'Full House 3rd', 'Mark all 15 numbers - the third valid claim wins.'),
];

const GROUP_LABELS: readonly { id: PatternGroup; label: string }[] = [
  { id: 'early', label: 'Early' },
  { id: 'lines', label: 'Lines' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'house', label: 'House' },
];

export const PATTERN_GROUPS: readonly { id: PatternGroup; label: string; ids: string[] }[] = GROUP_LABELS.map((g) => ({
  id: g.id,
  label: g.label,
  ids: PATTERNS.filter((p) => p.group === g.id).map((p) => p.id),
}));

const BY_ID: ReadonlyMap<string, PatternDef> = new Map(PATTERNS.map((p) => [p.id, p]));

export function getPattern(id: string): PatternDef | undefined {
  return BY_ID.get(id);
}

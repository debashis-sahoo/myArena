export { useRegionSize } from '../../state/viewport';

/** wide: two columns with docked chat; narrow: one column; short: two columns on a landscape phone with the chat drawer. */
export type BingoLayout = 'wide' | 'narrow' | 'short';

/** Cells are as wide as the region allows (at most 1.5:1) once the height, not the width, is the limit. */
export type CardPlan = { mode: 'stack' | 'row' | 'tabs'; cellW: number; cellH: number };

/** Smallest card cell across (FR-035) and smallest cell height the planner accepts before it falls back to tabs. */
export const MIN_CARD_CELL = 40;
export const MIN_CARD_CELL_H = 28;
const MAX_ASPECT = 1.5;
/** Tabs replace stack or row when their cells come out at least this many times taller. */
const TABS_GAIN = 1.5;
const CARD_GAP = 3; // between cells
const CARD_FRAME = 16; // border and padding, both sides
const CARD_LABEL_W = 24; // side tab and its gap, only when several cards are shown at once
const ITEM_GAP = 8; // between cards
const TAB_STRIP = 30;
const TAB_W = 96; // widest card tab ("Card 2 of 3") with its padding
const TAB_GAP = 6;

const clampCell = (v: number): number => Math.max(0, Math.floor(v));

/** Cell size for `cols x rows` cards (each 5 columns by 6 rows including the header) in width x height. */
function fitCards(width: number, height: number, cols: number, rows: number, labelled: boolean, strip: number): { cellW: number; cellH: number } {
  const frameW = 4 * CARD_GAP + CARD_FRAME + (labelled ? CARD_LABEL_W : 0);
  const frameH = 5 * CARD_GAP + CARD_FRAME;
  const byW = clampCell((width - (cols - 1) * ITEM_GAP - cols * frameW) / (5 * cols));
  const byH = clampCell((height - strip - (rows - 1) * ITEM_GAP - rows * frameH) / (6 * rows));
  if (byW <= byH) return { cellW: byW, cellH: byW }; // width-limited: square cells
  // Height-limited: widen the cells up to 1.5:1, and never below 40 across while the width allows.
  const wide = Math.max(Math.floor(byH * MAX_ASPECT), Math.min(byW, MIN_CARD_CELL));
  return { cellW: Math.min(byW, wide), cellH: byH };
}

/** Height of one card plus the tab strip when several cards share the region, for cells of `cellH` px. */
export function cardsHeightFor(count: number, cellH: number): number {
  return 6 * cellH + 5 * CARD_GAP + CARD_FRAME + (count > 1 ? TAB_STRIP + ITEM_GAP : 0);
}

/** Region width (px) the plan fills exactly; lets a caller give the cards just the width they can use. */
export function cardsWidth(plan: CardPlan, count: number): number {
  const n = Math.max(1, Math.floor(count));
  const labelled = n > 1 && plan.mode !== 'tabs';
  const one = 5 * plan.cellW + 4 * CARD_GAP + CARD_FRAME + (labelled ? CARD_LABEL_W : 0);
  if (plan.mode === 'row') return n * one + (n - 1) * ITEM_GAP;
  if (plan.mode === 'tabs') return Math.max(one, n * TAB_W + (n - 1) * TAB_GAP);
  return one;
}

const valid = (c: { cellW: number; cellH: number }): boolean => c.cellW >= MIN_CARD_CELL && c.cellH >= MIN_CARD_CELL_H;

/** Stack or side by side with the largest cells that are at least 40 across and 28 high; one card at a time under a tab strip when nothing fits or the tabs give cells 1.5 times taller. */
export function planCards(width: number, height: number, count: number): CardPlan {
  const n = Math.max(1, Math.floor(count));
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  if (n === 1) return { mode: 'stack', ...fitCards(w, h, 1, 1, false, 0) };

  const candidates: CardPlan[] = [
    { mode: 'stack', ...fitCards(w, h, 1, n, true, 0) },
    { mode: 'row', ...fitCards(w, h, n, 1, true, 0) },
  ];
  let best: CardPlan | null = null;
  for (const c of candidates) {
    if (!valid(c)) continue;
    // The shorter side drives readability; strict ">" keeps stack on ties.
    if (!best || c.cellH > best.cellH || (c.cellH === best.cellH && c.cellW > best.cellW)) best = c;
  }
  const tabs: CardPlan = { mode: 'tabs', ...fitCards(w, h, 1, 1, false, TAB_STRIP + ITEM_GAP) };
  if (!best) return tabs;
  return valid(tabs) && tabs.cellH >= best.cellH * TABS_GAIN ? tabs : best;
}

export type PatternPlan = { cols: number; rows: number; tileHeight: number; scroll: boolean };

export const TILE_GAP = 4;
export const TILE_MIN_H = 48;
/** Room the tile text needs beside the picture: the longest name ("Postage Stamp") and the "Available" badge at 11 px. */
export const TILE_TEXT_MIN = 90;
const TILE_MAX_H: Record<BingoLayout, number> = { wide: 78, narrow: 58, short: 58 };
const TILE_MIN_W: Record<BingoLayout, number> = { wide: 140, narrow: 144, short: 140 };

/** Columns from the width, balanced rows (5 tiles become 3 + 2, not 4 + 1); only the tile grid scrolls when it cannot fit. */
export function planPatterns(width: number, height: number, count: number, layout: BingoLayout = 'wide'): PatternPlan {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return { cols: 1, rows: 0, tileHeight: TILE_MIN_H, scroll: false };
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const maxH = TILE_MAX_H[layout];
  const maxCols = Math.max(1, Math.min(n, Math.floor((w + TILE_GAP) / (TILE_MIN_W[layout] + TILE_GAP))));
  const rowsFor = (c: number): number => Math.ceil(n / c);
  const heightFor = (r: number): number => Math.floor((h - TILE_GAP * (r - 1)) / r);

  let rows = rowsFor(maxCols);
  let cols = Math.ceil(n / rows);
  // Too short for the smallest tile: add columns (fewer rows) while the width allows.
  while (h > 0 && heightFor(rows) < TILE_MIN_H && cols < maxCols) {
    cols += 1;
    rows = rowsFor(cols);
  }
  const tileHeight = h > 0 ? Math.max(TILE_MIN_H, Math.min(maxH, heightFor(rows))) : maxH;
  const scroll = h > 0 && rows * tileHeight + TILE_GAP * (rows - 1) > h;
  return { cols, rows, tileHeight, scroll };
}

/** Tile grid heights for a width: all rows at full height, up to two rows (or one) at the smallest tile height. */
export function patternHeights(width: number, count: number, layout: BingoLayout): { natural: number; two: number; one: number } {
  const plan = planPatterns(width, 0, count, layout);
  const rows = (r: number, tile: number): number => (r <= 0 ? 0 : r * tile + (r - 1) * TILE_GAP);
  return {
    natural: rows(plan.rows, plan.tileHeight),
    two: rows(Math.min(plan.rows, 2), TILE_MIN_H),
    one: rows(Math.min(plan.rows, 1), TILE_MIN_H),
  };
}

export type BallPlan = { ball: number; chip: number };

const MIN_BALL = 48;
const COUNT_H = 22; // the "Called n of 75" line
const BALL_GAP = 6;

/** Ball diameter from the region height: leaves room for the count line and one row of chips when stacked, the full height when the count sits beside the ball; chip is the chip height in px (34 up to about 340 px tall, then a tenth of the height). */
export function planBall(width: number, height: number, stacked: boolean = true): BallPlan {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const chip = Math.max(26, Math.min(Math.max(34, Math.floor(h / 10)), Math.floor(w / 12)));
  const byH = stacked ? h - COUNT_H - chip - 2 * BALL_GAP : h;
  const ball = Math.max(MIN_BALL, Math.floor(Math.min(byH, w * (stacked ? 0.5 : 0.42))));
  return { ball, chip };
}

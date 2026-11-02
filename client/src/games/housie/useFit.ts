import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Measures an element's content box with one ResizeObserver; integer sizes, 0,0 until measured. */
export function useRegionSize<T extends HTMLElement>(): { ref: RefObject<T | null>; width: number; height: number } {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (): void => {
      const width = Math.max(0, Math.floor(el.clientWidth));
      const height = Math.max(0, Math.floor(el.clientHeight));
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return { ref, width: size.width, height: size.height };
}

export type TicketPlan = { mode: 'stack' | 'grid' | 'tabs'; cell: number };

const MIN_CELL = 32;
const MAX_CELL = 110;
const ROW_RATIO = 0.62;
const TICKET_ROWS = 3;
const TICKET_COLS = 9;
const PAD_X = 58; // per ticket: borders, padding, the 16px label tab and the 8 inner column gaps
const PAD_X_COMPACT = 18; // no label tab, 2px borders and padding, 1px column gaps
const LABEL_H_COMPACT = 12;
const LABEL_H = 28;
const GAP = 8;
const TAB_STRIP = 30;

const clampCell = (v: number): number => Math.max(0, Math.min(MAX_CELL, Math.floor(v)));

/** Largest cell width that fits `cols x rows` tickets in width x height. */
function fitCell(width: number, height: number, cols: number, rows: number, strip: number, compact = false): number {
  const padX = compact ? PAD_X_COMPACT : PAD_X;
  const labelH = compact ? LABEL_H_COMPACT : LABEL_H;
  const byW = (width - padX * cols - GAP * (cols - 1)) / (TICKET_COLS * cols);
  const byH = (height - strip - labelH * rows - GAP * (rows - 1)) / (TICKET_ROWS * ROW_RATIO * rows);
  return clampCell(Math.min(byW, byH));
}

export function planTickets(width: number, height: number, count: number): TicketPlan {
  const n = Math.max(1, Math.floor(count));
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const tabsCell = Math.max(MIN_CELL / 2, fitCell(w, h, 1, 1, n > 1 ? TAB_STRIP + GAP : 0, true));
  if (n === 1) return { mode: 'stack', cell: tabsCell };

  const candidates: TicketPlan[] = [{ mode: 'stack', cell: fitCell(w, h, 1, n, 0) }];
  if (n >= 3) candidates.push({ mode: 'grid', cell: fitCell(w, h, 2, Math.ceil(n / 2), 0) });

  let best: TicketPlan | null = null;
  for (const c of candidates) {
    if (c.cell < MIN_CELL) continue;
    if (!best || c.cell > best.cell) best = c; // strict ">" keeps stack on ties
  }
  return best ?? { mode: 'tabs', cell: tabsCell };
}

export type TilePlan = { cols: number; tier: 'large' | 'medium' | 'compact'; tileHeight: number; scroll: boolean };

const TILE_GAP = 6;
const TILE_MAX_H = 78;

export function planTiles(width: number, height: number, count: number): TilePlan {
  const n = Math.max(0, Math.floor(count));
  const tier: TilePlan['tier'] = n <= 9 ? 'large' : n <= 18 ? 'medium' : 'compact';
  const minW = tier === 'large' ? 124 : tier === 'medium' ? 92 : 62;
  const tap = tier === 'large' ? 44 : 40;
  const w = Math.max(0, width);
  const h = Math.max(0, height);

  const maxCols = Math.max(1, Math.floor((w + TILE_GAP) / (minW + TILE_GAP)));
  // Balance the rows (6 tiles on a wide area become 3 + 3, not 5 + 1), then add columns only if the height needs it.
  const balancedRows = Math.max(1, Math.ceil(n / Math.min(maxCols, n || 1)));
  const rowsByHeight = h > 0 ? Math.max(1, Math.floor((h + TILE_GAP) / (tap + TILE_GAP))) : balancedRows;
  const cols = Math.max(1, Math.min(n || 1, Math.max(Math.ceil(n / balancedRows), Math.ceil(n / rowsByHeight))));
  const rows = Math.max(1, Math.ceil(n / cols));
  const avail = (h - TILE_GAP * (rows - 1)) / rows;
  const tileHeight = Math.max(tap, Math.min(TILE_MAX_H, Math.floor(avail)));
  const scroll = h > 0 && rows * tap + TILE_GAP * (rows - 1) > h;
  return { cols, tier, tileHeight, scroll };
}

export type BallPlan = { ball: number; chip: number };

export function planBall(width: number, height: number): BallPlan {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const ball = Math.max(56, Math.floor(Math.min(h * 0.7, w * 0.4)));
  const chip = Math.max(22, Math.min(30, Math.floor(w / 14)));
  return { ball, chip };
}

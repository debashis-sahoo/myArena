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
export type TileTier = TilePlan['tier'];

const TILE_GAP = 6;
const TILE_MAX_H = 78;
/** Narrowest tile that still shows a readable title and the whole CLAIM label, and the tile height used when the list scrolls. */
const READABLE_TILE_W = { large: 70, medium: 70, compact: 54 } as const;
const SCROLL_TILE_H = { large: 62, medium: 58, compact: 56 } as const;

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
  let cols = Math.max(1, Math.min(n || 1, Math.max(Math.ceil(n / balancedRows), Math.ceil(n / rowsByHeight))));
  // Past the readable width the list scrolls inside its own region instead of squeezing titles (the page never scrolls).
  let readable = false;
  if (w > 0) {
    const maxReadable = Math.max(1, Math.floor((w + TILE_GAP) / (READABLE_TILE_W[tier] + TILE_GAP)));
    if (cols > maxReadable) {
      cols = Math.min(n || 1, maxReadable);
      readable = true;
    }
  }
  const rows = Math.max(1, Math.ceil(n / cols));
  const avail = (h - TILE_GAP * (rows - 1)) / rows;
  const tileHeight = readable ? Math.max(tap, SCROLL_TILE_H[tier]) : Math.max(tap, Math.min(TILE_MAX_H, Math.floor(avail)));
  const scroll = h > 0 && rows * tileHeight + TILE_GAP * (rows - 1) > h;
  return { cols, tier, tileHeight, scroll };
}

export interface TitleFitInput {
  full: string;
  short: string;
  /** Usable width and height of the name box in px. */
  width: number;
  height: number;
  /** Largest font size to try, px. */
  baseFontPx: number;
  fontFamily?: string;
  fontWeight?: number | string;
}

export interface TitleFit {
  text: string;
  form: 'full' | 'short';
  fontPx: number;
  lines: 1 | 2;
  /** False only for the last-resort short name at the floor that still does not fit. */
  fits: boolean;
}

export const TITLE_MIN_PX = 10;
export const TITLE_LINE_HEIGHT = 1.15;
const TITLE_STEP_PX = 0.5;
const TITLE_MAX_LINES = 2;
const TITLE_SAFETY_PX = 2; // canvas and DOM text widths can differ slightly

const widthCache = new Map<string, number>();
const fitCache = new Map<string, TitleFit>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

function textWidth(text: string, px: number, family: string, weight: number | string): number {
  const font = `${weight} ${px}px ${family}`;
  const key = `${font}|${text}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  if (measureCtx === undefined) {
    measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  }
  let w: number;
  if (measureCtx) {
    measureCtx.font = font;
    w = measureCtx.measureText(text).width;
  } else {
    w = text.length * px * 0.62;
  }
  if (widthCache.size > 4000) widthCache.clear();
  widthCache.set(key, w);
  return w;
}

/** Words split after a "+" too (Top+Mid may break as Top+ / Mid); `space` marks a token that follows a blank. */
function tokenize(text: string): { t: string; space: boolean }[] {
  const out: { t: string; space: boolean }[] = [];
  for (const word of text.split(' ')) {
    (word.match(/[^+]+\+?|\+/g) ?? [word]).forEach((t, i) => out.push({ t, space: i === 0 && out.length > 0 }));
  }
  return out;
}

/** Greedy word wrap; returns the line count, or 0 when a word is wider than `avail` or more than 2 lines are needed. */
function wrapLines(text: string, px: number, avail: number, family: string, weight: number | string): number {
  const space = textWidth(' ', px, family, weight);
  let lines = 1;
  let cur = -1;
  for (const { t, space: sp } of tokenize(text)) {
    const w = textWidth(t, px, family, weight);
    if (w > avail) return 0;
    if (cur < 0) cur = w;
    else if (cur + (sp ? space : 0) + w <= avail) cur += (sp ? space : 0) + w;
    else {
      lines += 1;
      if (lines > TITLE_MAX_LINES) return 0;
      cur = w;
    }
  }
  return lines;
}

function tryForm(
  text: string,
  base: number,
  availW: number,
  height: number,
  family: string,
  weight: number | string,
): { fontPx: number; lines: 1 | 2 } | null {
  for (let px = Math.floor(base / TITLE_STEP_PX) * TITLE_STEP_PX; px >= TITLE_MIN_PX; px -= TITLE_STEP_PX) {
    const lines = wrapLines(text, px, availW, family, weight);
    if (lines > 0 && lines * px * TITLE_LINE_HEIGHT <= height) return { fontPx: px, lines: lines as 1 | 2 };
  }
  return null;
}

/** Picks the title text and size for one tile: full name (2 lines, base size down to 10 px), then the short name, then the short name at 10 px. */
export function fitTitle(input: TitleFitInput): TitleFit {
  const { full, short, width, height, baseFontPx } = input;
  const family = input.fontFamily ?? 'sans-serif';
  const weight = input.fontWeight ?? 800;
  if (!(width > 0) || !(height > 0)) return { text: full, form: 'full', fontPx: TITLE_MIN_PX, lines: 1, fits: false };

  const key = `${full}|${short}|${Math.round(width * 2)}|${Math.round(height * 2)}|${baseFontPx}|${family}|${weight}`;
  const cached = fitCache.get(key);
  if (cached) return cached;

  const availW = width - TITLE_SAFETY_PX;
  let result: TitleFit;
  const f = tryForm(full, baseFontPx, availW, height, family, weight);
  if (f) result = { text: full, form: 'full', ...f, fits: true };
  else {
    const s = short !== full ? tryForm(short, baseFontPx, availW, height, family, weight) : null;
    if (s) result = { text: short, form: 'short', ...s, fits: true };
    else result = { text: short, form: 'short', fontPx: TITLE_MIN_PX, lines: 2, fits: false };
  }
  if (fitCache.size > 4000) fitCache.clear();
  fitCache.set(key, result);
  return result;
}

export type BallPlan = { ball: number; chip: number };

export function planBall(width: number, height: number): BallPlan {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const ball = Math.max(56, Math.floor(Math.min(h * 0.7, w * 0.4)));
  const chip = Math.max(22, Math.min(30, Math.floor(w / 14)));
  return { ball, chip };
}

import { useMemo } from 'react';

export { useRegionSize } from '../../state/viewport';

/** Sizing rules of specs/006-uno-game-module/contracts/match-screen-layout.md section 3, as pure functions plus one hook. */

export const CARD_ASPECT = 0.69;
/** Gap between the two piles, as a fraction of the pile card height. */
export const PILE_GAP = 0.08;
export const MIN_HAND_STEP = 28;
export const UNO_ROW_H = 44;
/** Table margin around the centre area (the contract's "- 8"). */
export const CENTRE_MARGIN = 8;
export const CHAT_GAP = 12;
/** Width of the minimized chat column (the rail with the chat icon, the unread count and Open chat). */
export const CHAT_RAIL_W = 44;
/** Each side of the hand band keeps this much padding. */
export const HAND_PAD = 8;
/** Below this table width the hand band keeps only HAND_PAD_NARROW, so seven cards still show a 40 px slice at 320 px. */
export const NARROW_TABLE_W = 340;
export const HAND_PAD_NARROW = 2;
/** A top seat's BOT / thinking tag hangs about 5 px under the seat box; the arrow track starts this far below the centre area's top. */
export const TRACK_TOP_CLEAR = 6;
/** Landscape: the UNO! and Keep buttons take about this much at each end of the hand band. */
export const END_BUTTONS_W = 120;
export const MAX_TOP_SEAT_W = 190;
export const MAX_HAND_ROTATION = 18;
/**
 * Turn strip (specs/007 US1): at least this screen width it sits in the header's free space (no table height used); below it, it is a
 * full-width row under the header. Measured in V3 (online room, header with Leave, brand, code, invite, audio and chat): at 760 the free
 * width is 350 to 372 px against 382 px for the longest label ("Your turn: stack a Wild Draw 4 or draw 12"), at 800 it is 390 to 412 px.
 * Short landscape phones (height up to SHORT_LANDSCAPE_H, width from SHORT_LANDSCAPE_MIN_W) also use the header, with shorter labels.
 */
export const STRIP_MIN_W = 800;
export const SHORT_LANDSCAPE_H = 420;
export const SHORT_LANDSCAPE_MIN_W = 560;
export const STRIP_H = 30;
export const STRIP_H_SHORT = 24;

/** Room under the fan for the lower corner of a tilted end card (about 8.2% of the card height at 18 degrees). */
export const handPad = (cardH: number): number => Math.ceil(0.085 * cardH);

const SIDE_BY_SIDE = 2 * CARD_ASPECT + PILE_GAP; // pile pair width over card height (1.46)
const STACKED = 2 + PILE_GAP; // pile pair height over card height (2.08)

export type UnoChatMode = 'dock' | 'drawer' | 'rail' | 'none';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Mirrors the contract's clamp(min, value, max). */
export const clamp = (min: number, value: number, max: number): number => Math.min(max, Math.max(min, value));

export const handSidePad = (tableWidth: number): number => (tableWidth < NARROW_TABLE_W ? HAND_PAD_NARROW : HAND_PAD);

/** Portrait puts the UNO! and Keep buttons in a row above the hand; the contract's test is W' < 1.3 H. */
export const isPortrait = (tableWidth: number, height: number): boolean => tableWidth < 1.3 * height;

// ---------- hand ----------

export interface HandSlot {
  /** Left edge in the hand content box. */
  x: number;
  /** Resting top edge in the hand band (band height is cardH + lift); the arc is already included. */
  y: number;
  /** Degrees, negative to the left. */
  rotation: number;
  /** Top edge of the card when lifted by a press or hover; never above the band. */
  liftedY: number;
}

export interface HandPlan {
  cardW: number;
  cardH: number;
  lift: number;
  /** Distance between card starts. */
  step: number;
  /** True when the step would drop below MIN_HAND_STEP: the hand scrolls sideways inside its band with the fan kept. */
  scroll: boolean;
  /** Width of the fan's content box (at least the hand width; wider when the hand scrolls). */
  contentWidth: number;
  /** Rotation of the outermost cards in degrees (scaled down for few cards). */
  spread: number;
  slots: HandSlot[];
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

/** The fan: step = min(0.75 x card width, (hand width - card width) / (n - 1)), rotation -spread..+spread, a small vertical arc. */
export function planHand(handWidth: number, cardH: number, count: number): HandPlan {
  const h = Math.max(1, Math.round(cardH));
  const cardW = Math.round(h * CARD_ASPECT);
  const lift = Math.round(0.14 * h);
  const n = Math.max(0, Math.floor(count));
  const width = Math.max(0, handWidth);

  const raw = n > 1 ? Math.min(0.75 * cardW, (width - cardW) / (n - 1)) : 0;
  const scroll = n > 1 && raw < MIN_HAND_STEP;
  const step = scroll ? MIN_HAND_STEP : Math.max(0, raw);
  const spread = Math.min(MAX_HAND_ROTATION, 3 * Math.max(0, n - 1));
  const sag = 0.06 * h * (spread / MAX_HAND_ROTATION);

  const fan = n > 0 ? cardW + (n - 1) * step : 0;
  // A tilted end card sticks out sideways; when the hand scrolls there is no free margin, so reserve it.
  const theta = (spread * Math.PI) / 180;
  const overhang = scroll ? Math.max(0, Math.ceil(0.5 * (h * Math.sin(theta) - cardW * (1 - Math.cos(theta))))) : 0;
  const contentWidth = Math.max(width, fan + 2 * overhang);
  const left0 = (contentWidth - fan) / 2;

  const slots: HandSlot[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = n > 1 ? (2 * i) / (n - 1) - 1 : 0;
    const y = lift - sag + sag * t * t;
    slots.push({
      x: round1(left0 + i * step),
      y: round1(y),
      rotation: round1(spread * t),
      liftedY: round1(Math.max(0, y - lift)),
    });
  }
  return { cardW, cardH: h, lift, step: round1(step), scroll, contentWidth: Math.ceil(contentWidth), spread, slots };
}

// ---------- piles ----------

export interface PilePlan {
  arrangement: 'side' | 'stacked';
  cardW: number;
  cardH: number;
  gap: number;
  /** All rects are relative to the centre area's top-left. */
  draw: Rect;
  discard: Rect;
  /** The rounded track the direction arrows run on: the pair of piles grown by the track band on every side, but never above `clearTop`. */
  track: Rect;
}

/** The piles are not capped: the arrangement whose card is taller wins (side by side on a tie). */
export function planPiles(centreW: number, centreH: number, band: number, clearTop = 0): PilePlan {
  const w = Math.max(0, centreW);
  const h = Math.max(0, centreH);
  const side = Math.min(h - 2 * band, (w - 2 * band) / SIDE_BY_SIDE);
  const stacked = Math.min((h - 2 * band) / STACKED, (w - 2 * band) / CARD_ASPECT);
  const arrangement: PilePlan['arrangement'] = stacked > side ? 'stacked' : 'side';
  const cardH = Math.max(0, Math.round(arrangement === 'side' ? side : stacked));
  const cardW = Math.round(cardH * CARD_ASPECT);
  const gap = Math.round(PILE_GAP * cardH);

  const pairW = arrangement === 'side' ? 2 * cardW + gap : cardW;
  const pairH = arrangement === 'side' ? cardH : 2 * cardH + gap;
  const x = Math.floor((w - pairW) / 2);
  const y = Math.floor((h - pairH) / 2);
  const draw: Rect = { x, y, width: cardW, height: cardH };
  const discard: Rect =
    arrangement === 'side'
      ? { x: x + cardW + gap, y, width: cardW, height: cardH }
      : { x, y: y + cardH + gap, width: cardW, height: cardH };
  const trackTop = Math.max(y - band, clearTop);
  const track: Rect = { x: x - band, y: trackTop, width: pairW + 2 * band, height: y + pairH + band - trackTop };
  return { arrangement, cardW, cardH, gap, draw, discard, track };
}

// ---------- seats ----------

export type SeatZone = 'top-left' | 'top-center' | 'top-right' | 'mid-left' | 'mid-right';

export interface SeatPlacement {
  /** Index in the opponent list (seat order, clockwise from the viewer). */
  index: number;
  zone: SeatZone;
  edge: 'top' | 'left' | 'right';
  /** Table coordinates. Top seats are as tall as the top band; side seats fill their column, so centre the content vertically. */
  rect: Rect;
}

const ZONES: readonly (readonly SeatZone[])[] = [
  [],
  ['top-center'],
  ['top-left', 'top-right'],
  ['mid-left', 'top-center', 'mid-right'],
  ['mid-left', 'top-left', 'top-right', 'mid-right'],
];

/** Opponents are listed clockwise from the viewer; the same table serves every orientation. */
export function planSeats(opponents: number, tableW: number, topH: number, sideW: number, centreH: number): SeatPlacement[] {
  const n = clamp(0, Math.floor(opponents), 4);
  const zones = ZONES[n] ?? [];
  const topCount = zones.filter((z) => z.startsWith('top')).length;
  const cell = topCount > 0 ? tableW / topCount : 0;
  const topW = Math.floor(Math.min(MAX_TOP_SEAT_W, Math.max(0, cell - 8)));
  let topIndex = 0;

  return zones.map((zone, index) => {
    if (zone === 'mid-left') {
      return { index, zone, edge: 'left', rect: { x: 0, y: topH, width: sideW, height: centreH } };
    }
    if (zone === 'mid-right') {
      return { index, zone, edge: 'right', rect: { x: tableW - sideW, y: topH, width: sideW, height: centreH } };
    }
    const x = Math.floor(topIndex * cell + (cell - topW) / 2);
    topIndex += 1;
    return { index, zone, edge: 'top', rect: { x, y: 0, width: topW, height: topH } };
  });
}

// ---------- whole table ----------

export interface UnoFitInput {
  /** The whole match screen (header and chat column included), as measured by useRegionSize. */
  width: number;
  height: number;
  opponents: number;
  chat?: UnoChatMode;
  /** Cards in the viewer's hand; shapes `hand.plan`. */
  handCount?: number;
  /** Safe-area insets to remove from the region before sizing; the screen adds them back as padding. */
  safe?: Partial<Insets>;
}

export interface HandLayout {
  cardW: number;
  cardH: number;
  lift: number;
  /** Height of the card band: cardH + lift + the room under the fan. */
  bandH: number;
  /** Height of the UNO row above the band: 44 in portrait, 0 in landscape. */
  rowH: number;
  /** Where the UNO! and Keep buttons live: a row above the hand (portrait) or the two ends of the band (landscape). */
  buttons: 'row' | 'ends';
  /** Width each end button column takes (0 when the buttons are in a row). */
  endW: number;
  /** Width left for the fan. */
  width: number;
  /** Side padding of the band; the fan keeps its tilted end cards inside it. */
  pad: number;
  /** Table coordinates. */
  bandRect: Rect;
  rowRect: Rect | null;
  plan: HandPlan;
}

export interface UnoFit {
  /** False until the region has been measured; every size is 0 then. */
  ready: boolean;
  /** Screen size after the safe-area insets. */
  width: number;
  height: number;
  safe: Insets;
  /** Table width W': the screen minus the chat column and gap when chat is docked. */
  tableWidth: number;
  /** Table height: the screen minus the header. */
  tableHeight: number;
  /** W' < 1.3 H. */
  portrait: boolean;
  chat: { mode: UnoChatMode; width: number; gap: number };
  headerH: number;
  /** Where the turn strip sits: in the header's free space or as a row under it. */
  turnStrip: 'header' | 'row';
  /** Height of the strip row (0 when it sits in the header). The table box starts at headerH + stripH. */
  stripH: number;
  /** All rects below are in table coordinates: origin at the table's top-left, just under the header. */
  topBand: Rect;
  sideW: number;
  seats: SeatPlacement[];
  centre: Rect;
  /** Arrow track band thickness. */
  band: number;
  /** Relative to `centre`. */
  piles: PilePlan;
  hand: HandLayout;
}

/** Every size of the match screen from the measured region; integers throughout (the chat column rounds down, the rest to nearest). */
export function planUnoTable(input: UnoFitInput): UnoFit {
  const safe: Insets = {
    top: input.safe?.top ?? 0,
    right: input.safe?.right ?? 0,
    bottom: input.safe?.bottom ?? 0,
    left: input.safe?.left ?? 0,
  };
  const chat = input.chat ?? 'none';
  const W = Math.max(0, Math.floor(input.width) - safe.left - safe.right);
  const H = Math.max(0, Math.floor(input.height) - safe.top - safe.bottom);
  const opponents = clamp(0, Math.floor(input.opponents), 4);

  // A column beside the table: the full dock, or the 44 px rail while the chat is minimized. Either way the table gets what is left.
  const column = chat === 'dock' || chat === 'rail';
  const chatW = chat === 'dock' ? Math.floor(clamp(240, 0.22 * W, 340)) : chat === 'rail' ? CHAT_RAIL_W : 0;
  const tableW = column ? Math.max(0, W - chatW - CHAT_GAP) : W;
  const portrait = isPortrait(tableW, H);

  const headerH = H <= 420 ? 32 : W >= 1024 ? 52 : 44;
  // Short landscape phones put the strip in the header too (shorter labels, no brand) instead of spending 24 px of table height on a row.
  const turnStrip: 'header' | 'row' = W >= STRIP_MIN_W || (H <= SHORT_LANDSCAPE_H && W >= SHORT_LANDSCAPE_MIN_W) ? 'header' : 'row';
  const stripH = turnStrip === 'row' ? (H <= 600 ? STRIP_H_SHORT : STRIP_H) : 0;
  const topH = Math.round(clamp(56, 0.085 * H, 92));
  const sideW = opponents >= 3 ? Math.round(clamp(56, 0.075 * tableW, 110)) : 0;

  const cardH = Math.round(clamp(64, 0.15 * H, 200));
  const cardW = Math.round(cardH * CARD_ASPECT);
  const lift = Math.round(0.14 * cardH);
  const bandH = cardH + lift + handPad(cardH);
  const rowH = portrait ? UNO_ROW_H : 0;
  const endW = portrait ? 0 : END_BUTTONS_W;

  const tableH = Math.max(0, H - headerH - stripH);
  const centreW = Math.max(0, tableW - 2 * sideW - CENTRE_MARGIN);
  const centreH = Math.max(0, H - headerH - stripH - topH - bandH - rowH);
  const band = Math.round(clamp(18, 0.09 * Math.min(centreW, centreH), 34));
  const centre: Rect = { x: sideW + CENTRE_MARGIN / 2, y: topH, width: centreW, height: centreH };

  const handPadX = handSidePad(tableW);
  const handW = Math.max(0, tableW - 2 * handPadX - 2 * endW);
  const handY = topH + centreH + rowH;
  const ready = W > 0 && H > 0;

  return {
    ready,
    width: W,
    height: H,
    safe,
    tableWidth: tableW,
    tableHeight: tableH,
    portrait,
    chat: { mode: chat, width: chatW, gap: column ? CHAT_GAP : 0 },
    headerH,
    turnStrip,
    stripH,
    topBand: { x: 0, y: 0, width: tableW, height: topH },
    sideW,
    seats: planSeats(opponents, tableW, topH, sideW, centreH),
    centre,
    band,
    piles: planPiles(centreW, centreH, band, TRACK_TOP_CLEAR),
    hand: {
      cardW,
      cardH,
      lift,
      bandH,
      rowH,
      buttons: portrait ? 'row' : 'ends',
      endW,
      width: handW,
      pad: handPadX,
      bandRect: { x: 0, y: handY, width: tableW, height: bandH },
      rowRect: portrait ? { x: 0, y: topH + centreH, width: tableW, height: rowH } : null,
      plan: planHand(handW, cardH, input.handCount ?? 0),
    },
  };
}

export interface UnoFitOptions {
  chat?: UnoChatMode;
  handCount?: number;
  safe?: Partial<Insets>;
}

/** `region` comes from useRegionSize on the element that spans the whole match screen. */
export function useUnoFit(region: { width: number; height: number }, opponentCount: number, options: UnoFitOptions = {}): UnoFit {
  const { chat = 'none', handCount = 0, safe } = options;
  const top = safe?.top ?? 0;
  const right = safe?.right ?? 0;
  const bottom = safe?.bottom ?? 0;
  const left = safe?.left ?? 0;
  return useMemo(
    () =>
      planUnoTable({
        width: region.width,
        height: region.height,
        opponents: opponentCount,
        chat,
        handCount,
        safe: { top, right, bottom, left },
      }),
    [region.width, region.height, opponentCount, chat, handCount, top, right, bottom, left],
  );
}

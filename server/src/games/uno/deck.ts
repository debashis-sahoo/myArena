import { randomInt } from 'node:crypto';
import { UNO_DECK_SIZE, UNO_HAND_SIZE, unoCardOf, type UnoColor, type UnoKind } from '@myarena/shared';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

/**
 * Development-only controls (research R14, data-model section 9). They are read only outside production and
 * ignored, with a startup warning, in production, so no environment or client can influence real results.
 */
const DEV_VARS = ['UNO_DEV_DECK', 'UNO_DEV_BOT_MS', 'UNO_DEV_TURN_MS', 'UNO_DEV_FORGET'] as const;

export function warnIfDevControlsSet(): void {
  if (!config.isProd) return;
  const set = DEV_VARS.filter((name) => process.env[name]);
  if (set.length) logger.warn({ ignored: set }, 'UNO development controls are ignored in production');
}

function devValue(name: (typeof DEV_VARS)[number]): string | undefined {
  if (config.isProd) return undefined;
  const raw = process.env[name];
  return raw ? raw.trim() : undefined;
}

/** UNO_DEV_BOT_MS: a fixed bot pause (0 allowed), outside production. */
export function devBotMs(): number | undefined {
  const raw = devValue('UNO_DEV_BOT_MS');
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** UNO_DEV_TURN_MS: replaces the 30 s human countdown, outside production. */
export function devTurnMs(): number | undefined {
  const raw = devValue('UNO_DEV_TURN_MS');
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 500 ? n : undefined;
}

/** UNO_DEV_FORGET: `always` makes bots forget UNO! every time, `never` makes them call every time. */
export function devForget(): 'always' | 'never' | undefined {
  const raw = devValue('UNO_DEV_FORGET')?.toLowerCase();
  return raw === 'always' || raw === 'never' ? raw : undefined;
}

/** All 108 ids in table order (not shuffled). */
export function buildDeck(): number[] {
  return Array.from({ length: UNO_DECK_SIZE }, (_, id) => id);
}

/** Fisher-Yates with crypto randomness. Returns a new array; the input is left alone. */
export function shuffle(ids: readonly number[]): number[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = out[i] as number;
    out[i] = out[j] as number;
    out[j] = a;
  }
  return out;
}

/** Rebuilds an empty Draw Pile (FR-018): the discard minus its top card (last element), shuffled; the top card stays alone in the new discard. */
export function reshuffle(discard: readonly number[]): { drawPile: number[]; discard: number[] } {
  const top = discard[discard.length - 1];
  if (top === undefined) return { drawPile: [], discard: [] };
  return { drawPile: shuffle(discard.slice(0, -1)), discard: [top] };
}

export interface Deal {
  /** hands[i] belongs to seat i (slot order). */
  hands: number[][];
  /** Top = last element. */
  drawPile: number[];
  /** Top = last element, which is the starting card. */
  discard: number[];
  start: number;
}

const ALL = buildDeck();

function idsWhere(color: UnoColor | null, kind: UnoKind, rank: number | null = null): number[] {
  return ALL.filter((id) => {
    const card = unoCardOf(id);
    return card.color === color && card.kind === kind && (rank === null || card.rank === rank);
  });
}

interface Plan {
  /** Cards fixed for seat 0, 1, ...; every seat is then topped up at random to its size. */
  fixed: number[][];
  /** Hand size per seat; defaults to UNO_HAND_SIZE. */
  sizes?: number[];
  /** Starting card; random (never a Wild) when absent. */
  start?: number;
  /** Cards the random top-up must not hand out. */
  avoid?: (id: number) => boolean;
  /** Leave 4 cards in the Draw Pile and 20 below the top of the Discard Pile; the rest are out of play. */
  shortPile?: boolean;
}

const SCENARIOS = ['wild', 'reverse', 'uno', 'stack', 'short-pile', 'endgame'] as const;
type Scenario = (typeof SCENARIOS)[number];

function isScenario(value: string): value is Scenario {
  return (SCENARIOS as readonly string[]).includes(value);
}

function planFor(scenario: Scenario): Plan {
  const start = idsWhere('red', 'number', 5)[0] as number;
  const redNumbers = idsWhere('red', 'number').filter((id) => id !== start);
  const wilds = idsWhere(null, 'wild');
  const wild4s = idsWhere(null, 'wild4');
  const redDraw2s = idsWhere('red', 'draw2');
  switch (scenario) {
    case 'wild':
      return { fixed: [[wilds[0] as number, wild4s[0] as number, ...redNumbers.slice(0, 5)]], start };
    case 'reverse':
      return { fixed: [[idsWhere('red', 'reverse')[0] as number, ...redNumbers.slice(0, 6)]], start };
    case 'uno':
      return { fixed: [redNumbers.slice(0, 2)], sizes: [2], start };
    case 'stack':
      return {
        fixed: [
          [redDraw2s[0] as number, wild4s[0] as number],
          [redDraw2s[1] as number, wild4s[1] as number],
        ],
        start,
        avoid: (id) => {
          const kind = unoCardOf(id).kind;
          return kind === 'draw2' || kind === 'wild4';
        },
      };
    case 'short-pile':
      return { fixed: [], shortPile: true };
    case 'endgame':
      return { fixed: [redNumbers.slice(0, 1)], sizes: [1], start };
  }
}

function devPlan(): Plan | null {
  const raw = devValue('UNO_DEV_DECK')?.toLowerCase();
  return raw && isScenario(raw) ? planFor(raw) : null;
}

/** Turns cards from the top until one is not a Wild; rejected Wilds go back and the pile is reshuffled (FR-019). */
function turnStartCard(pile: readonly number[]): { start: number; pile: number[] } {
  let i = pile.length - 1;
  while (i >= 0 && unoCardOf(pile[i] as number).color === null) i--;
  const rejected = pile.slice(i + 1);
  const rest = pile.slice(0, i);
  return { start: pile[i] as number, pile: rejected.length ? shuffle([...rest, ...rejected]) : rest };
}

/**
 * Deals a match: UNO_HAND_SIZE cards to each seat round-robin starting at seat `firstIndex`, then turns the starting card.
 * Outside production UNO_DEV_DECK may fix some hands (seat 0 = the host); everything else stays random.
 */
export function dealMatch(seatCount: number, firstIndex: number): Deal {
  const plan = devPlan();
  const fixed = plan ? plan.fixed.slice(0, seatCount) : [];
  const reserved = new Set<number>(fixed.flat());
  if (plan?.start !== undefined) reserved.add(plan.start);
  let pile = shuffle(ALL.filter((id) => !reserved.has(id)));

  const hands: number[][] = Array.from({ length: seatCount }, (_, seat) => [...(fixed[seat] ?? [])]);
  const sizeOf = (seat: number): number => plan?.sizes?.[seat] ?? UNO_HAND_SIZE;
  const avoid = plan?.avoid;
  for (let round = 0; round < UNO_HAND_SIZE; round++) {
    for (let k = 0; k < seatCount; k++) {
      const seat = (firstIndex + k) % seatCount;
      const hand = hands[seat] as number[];
      if (hand.length >= sizeOf(seat)) continue;
      const at = avoid ? pile.findIndex((id) => !avoid(id)) : 0;
      const [card] = at >= 0 ? pile.splice(at, 1) : [];
      if (card !== undefined) hand.push(card);
    }
  }

  let start: number;
  if (plan?.start !== undefined) {
    start = plan.start;
  } else {
    const turned = turnStartCard(pile);
    start = turned.start;
    pile = turned.pile;
  }

  if (plan?.shortPile) {
    return { hands, drawPile: pile.slice(0, 4), discard: [...pile.slice(4, 24), start], start };
  }
  return { hands, drawPile: pile, discard: [start], start };
}

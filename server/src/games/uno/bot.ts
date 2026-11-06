import { randomInt } from 'node:crypto';
import {
  UNO_BOT_CATCH_MAX_MS,
  UNO_BOT_CATCH_MIN_MS,
  UNO_BOT_FORGET_PROBABILITY,
  UNO_BOT_PAUSE_MAX_MS,
  UNO_BOT_PAUSE_MIN_MS,
  UNO_COLORS,
  unoCardOf,
  type UnoColor,
  type UnoKind,
  type UnoTable,
} from '@myarena/shared';
import { devBotMs, devForget } from './deck.js';
import { nextActive, playable, type RuleTable } from './rules.js';

/** Everything a bot may know: its own cards and the public table a human sees. Never the match. */
export interface BotView {
  playerId: string;
  /** The bot's own hand. */
  hand: readonly number[];
  /** The card the bot just drew and may play (table.phase 'drawn'), otherwise null. */
  drawn: number | null;
  table: UnoTable;
}

/** `color` is present only for a Wild or Wild Draw 4. */
export type BotDecision = { action: 'play'; card: number; color?: UnoColor } | { action: 'draw' } | { action: 'keep' };

function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)] as T;
}

function colorCounts(hand: readonly number[]): Record<UnoColor, number> {
  const counts: Record<UnoColor, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const id of hand) {
    const color = unoCardOf(id).color;
    if (color) counts[color]++;
  }
  return counts;
}

/** The colour held most among the cards that stay in hand; random among ties. */
function chooseColor(hand: readonly number[], played: number): UnoColor {
  const counts = colorCounts(hand.filter((id) => id !== played));
  const most = Math.max(...UNO_COLORS.map((c) => counts[c]));
  return pick(UNO_COLORS.filter((c) => counts[c] === most));
}

function mostHeld(cards: readonly number[], counts: Record<UnoColor, number>): number {
  const score = (id: number): number => counts[unoCardOf(id).color as UnoColor];
  const best = Math.max(...cards.map(score));
  return pick(cards.filter((id) => score(id) === best));
}

function chooseCard(options: readonly number[], hand: readonly number[], nextCount: number): number {
  const counts = colorCounts(hand);
  const ofKind = (...kinds: UnoKind[]): number[] => options.filter((id) => kinds.includes(unoCardOf(id).kind));
  if (nextCount <= 3) {
    for (const kind of ['draw2', 'skip', 'reverse'] as const) {
      const cards = ofKind(kind);
      if (cards.length) return mostHeld(cards, counts);
    }
  }
  const numbers = ofKind('number');
  if (numbers.length) return mostHeld(numbers, counts);
  const actions = ofKind('draw2', 'skip', 'reverse');
  if (actions.length) return mostHeld(actions, counts);
  return pick(nextCount <= 3 ? [...ofKind('wild4'), ...ofKind('wild')] : [...ofKind('wild'), ...ofKind('wild4')]);
}

/** Cards held by the next active seat in the table's direction; Infinity when there is none. */
function nextHandCount(view: BotView): number {
  const { players, direction } = view.table;
  const me = players.findIndex((p) => p.playerId === view.playerId);
  if (me < 0) return Infinity;
  return players[nextActive(players, me, direction, 1)]?.handCount ?? Infinity;
}

/** Research R7. Call it only on the bot's own turn (table.phase 'turn' or 'drawn'). */
export function decide(view: BotView): BotDecision {
  const { table, hand } = view;
  const rules: RuleTable = {
    top: table.top,
    activeColor: table.activeColor,
    pending: table.pending,
    phase: table.phase,
    drawn: view.drawn,
    direction: table.direction,
  };
  const options = playable(rules, hand);
  if (options.length === 0) return { action: table.phase === 'drawn' ? 'keep' : 'draw' };

  const nextCount = nextHandCount(view);
  if (table.pending && nextCount <= 2) return { action: 'draw' };

  const card = chooseCard(options, hand, nextCount);
  return unoCardOf(card).color === null
    ? { action: 'play', card, color: chooseColor(hand, card) }
    : { action: 'play', card };
}

/** Pause before a bot acts: random 1.5 to 2.0 s, or UNO_DEV_BOT_MS outside production. */
export function botPauseMs(): number {
  return devBotMs() ?? randomInt(UNO_BOT_PAUSE_MIN_MS, UNO_BOT_PAUSE_MAX_MS + 1);
}

/** Whether a bot calls UNO! before the play that leaves it one card (it forgets with probability UNO_BOT_FORGET_PROBABILITY). */
export function shouldCallUno(): boolean {
  const forced = devForget();
  if (forced) return forced === 'never';
  return randomInt(1_000_000) >= UNO_BOT_FORGET_PROBABILITY * 1_000_000;
}

/** Delay before a bot catches a human who has not called UNO!: random 2.0 to 3.5 s, or 0 to 50 ms when UNO_DEV_BOT_MS is set. */
export function catchDelayMs(): number {
  return devBotMs() !== undefined ? randomInt(0, 51) : randomInt(UNO_BOT_CATCH_MIN_MS, UNO_BOT_CATCH_MAX_MS + 1);
}

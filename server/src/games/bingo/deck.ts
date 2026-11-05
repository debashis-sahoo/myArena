import { randomInt } from 'node:crypto';
import { BINGO_BALLS, BINGO_FREE_INDEX, type BingoCard } from '@myarena/shared';
import { config } from '../../config.js';

function shuffle(items: number[]): number[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = items[i] as number;
    items[i] = items[j] as number;
    items[j] = a;
  }
  return items;
}

function parseDevBalls(raw: string): number[] {
  const seen = new Set<number>();
  for (const part of raw.split(',')) {
    const text = part.trim();
    if (!/^\d+$/.test(text)) continue;
    const n = Number.parseInt(text, 10);
    if (n >= 1 && n <= BINGO_BALLS) seen.add(n);
  }
  return [...seen];
}

/** Card numbers top row first, row by row, skipping FREE. */
function cardRowMajor(card: BingoCard): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  card.forEach((n, i) => {
    if (i !== BINGO_FREE_INDEX && n >= 1 && n <= BINGO_BALLS && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  });
  return out;
}

/** A shuffled 1..75 deck; dev-only env controls can pin the opening balls. */
export function buildDeck(firstCard?: BingoCard | null): number[] {
  let head: number[] = [];
  if (!config.isProd) {
    const balls = process.env.BINGO_DEV_BALLS;
    if (balls) head = parseDevBalls(balls);
    if (head.length === 0 && process.env.BINGO_DEV_DECK === 'first-card' && firstCard) {
      head = cardRowMajor(firstCard);
    }
  }
  const used = new Set(head);
  const rest: number[] = [];
  for (let n = 1; n <= BINGO_BALLS; n++) if (!used.has(n)) rest.push(n);
  return [...head, ...shuffle(rest)];
}

import { randomInt } from 'node:crypto';
import { cellAt, type Ticket } from '@myarena/shared';
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
    if (n >= 1 && n <= 90) seen.add(n);
  }
  return [...seen];
}

function ticketRowMajor(ticket: Ticket): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const n = cellAt(ticket, r, c);
      if (n >= 1 && n <= 90 && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
  }
  return out;
}

/** A shuffled 1..90 deck; dev-only env controls can pin the opening balls. */
export function buildDeck(firstTicket?: Ticket | null): number[] {
  let head: number[] = [];
  if (!config.isProd) {
    const balls = process.env.HOUSIE_DEV_BALLS;
    if (balls) head = parseDevBalls(balls);
    if (head.length === 0 && process.env.HOUSIE_DEV_DECK === 'first-ticket' && firstTicket) {
      head = ticketRowMajor(firstTicket);
    }
  }
  const used = new Set(head);
  const rest: number[] = [];
  for (let n = 1; n <= 90; n++) if (!used.has(n)) rest.push(n);
  return [...head, ...shuffle(rest)];
}

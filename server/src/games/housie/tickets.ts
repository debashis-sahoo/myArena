import { randomInt } from 'node:crypto';
import { COLUMN_RANGES, ticketKey, validateTicket, type Ticket } from '@myarena/shared';
import { config } from '../../config.js';

const MAX_ATTEMPTS = 1000;

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = items[i] as T;
    items[i] = items[j] as T;
    items[j] = a;
  }
  return items;
}

/** Each column holds 1-3 numbers; the 15 numbers total. */
function pickColumnCounts(): number[] {
  const counts = new Array<number>(9).fill(1);
  let remaining = 6;
  while (remaining > 0) {
    const open: number[] = [];
    for (let c = 0; c < 9; c++) if ((counts[c] ?? 0) < 3) open.push(c);
    const col = open[randomInt(open.length)] as number;
    counts[col] = (counts[col] ?? 0) + 1;
    remaining--;
  }
  return counts;
}

function rowChoices(count: number): number[][] {
  if (count === 1) return shuffle([[0], [1], [2]]);
  if (count === 2) return shuffle([[0, 1], [0, 2], [1, 2]]);
  return [[0, 1, 2]];
}

/** Randomized backtracking: assigns each column's rows so every row ends with 5 numbers. */
function placeRows(counts: number[]): number[][] | null {
  const rowTotals = [0, 0, 0];
  const placement: number[][] = [];

  const search = (col: number): boolean => {
    if (col === 9) return rowTotals.every((t) => t === 5);
    for (const rows of rowChoices(counts[col] ?? 1)) {
      if (rows.some((r) => (rowTotals[r] ?? 0) >= 5)) continue;
      for (const r of rows) rowTotals[r] = (rowTotals[r] ?? 0) + 1;
      placement[col] = rows;
      if (search(col + 1)) return true;
      for (const r of rows) rowTotals[r] = (rowTotals[r] ?? 0) - 1;
    }
    return false;
  };

  return search(0) ? placement : null;
}

function pickDistinct(min: number, max: number, count: number): number[] {
  const values = new Set<number>();
  while (values.size < count) values.add(min + randomInt(max - min + 1));
  return [...values].sort((a, b) => a - b);
}

function buildTicket(): Ticket | null {
  const counts = pickColumnCounts();
  const placement = placeRows(counts);
  if (!placement) return null;
  const ticket: Ticket = [new Array<number>(9).fill(0), new Array<number>(9).fill(0), new Array<number>(9).fill(0)];
  for (let c = 0; c < 9; c++) {
    const range = COLUMN_RANGES[c];
    const rows = placement[c];
    if (!range || !rows) return null;
    const values = pickDistinct(range[0], range[1], rows.length);
    rows.forEach((r, i) => {
      const row = ticket[r];
      if (row) row[c] = values[i] ?? 0;
    });
  }
  return ticket;
}

export function generateTicket(): Ticket {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ticket = buildTicket();
    if (ticket && validateTicket(ticket) === null) return ticket;
  }
  throw new Error('Housie ticket generation failed');
}

export function createTicketIssuer(): { issue(): Ticket } {
  const issued = new Set<string>();
  return {
    issue(): Ticket {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const ticket = generateTicket();
        const key = ticketKey(ticket);
        if (issued.has(key)) continue;
        issued.add(key);
        return ticket;
      }
      throw new Error('Housie ticket issuing failed');
    },
  };
}

/** Development-only: HOUSIE_DEV_TICKET_AUDIT=N generates N tickets and logs validity and uniqueness. */
export function runTicketAuditFromEnv(log: (fields: Record<string, unknown>, message: string) => void): void {
  if (config.isProd) return;
  const raw = process.env.HOUSIE_DEV_TICKET_AUDIT;
  if (!raw || !/^\d+$/.test(raw.trim())) return;
  const total = Number.parseInt(raw.trim(), 10);
  if (!Number.isSafeInteger(total) || total <= 0) return;
  const issuer = createTicketIssuer();
  const keys = new Set<string>();
  let valid = 0;
  for (let i = 0; i < total; i++) {
    const ticket = issuer.issue();
    if (validateTicket(ticket) === null) valid++;
    keys.add(ticketKey(ticket));
  }
  log({ total, valid, unique: keys.size }, 'housie ticket audit');
}

import { randomInt } from 'node:crypto';
import { BINGO_COLUMN_RANGES, BINGO_FREE_INDEX, cardKey, cellIndex, validateBingoCard, type BingoCard } from '@myarena/shared';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

const MAX_ATTEMPTS = 1000;
const N_COLUMN = 2;

/** `count` distinct numbers from [min, max] in random order (partial Fisher-Yates). */
function pickDistinct(min: number, max: number, count: number): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  for (let i = 0; i < count; i++) {
    const j = i + randomInt(pool.length - i);
    const a = pool[i] as number;
    pool[i] = pool[j] as number;
    pool[j] = a;
  }
  return pool.slice(0, count);
}

function buildCard(): BingoCard {
  const card = new Array<number>(25).fill(0);
  for (let col = 0; col < 5; col++) {
    const range = BINGO_COLUMN_RANGES[col];
    if (!range) continue;
    const rows = col === N_COLUMN ? [0, 1, 3, 4] : [0, 1, 2, 3, 4];
    const values = pickDistinct(range[0], range[1], rows.length);
    rows.forEach((row, i) => {
      card[cellIndex(row, col)] = values[i] ?? 0;
    });
  }
  card[BINGO_FREE_INDEX] = 0;
  return card;
}

export function generateCard(): BingoCard {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const card = buildCard();
    const problem = validateBingoCard(card);
    if (problem === null) return card;
    logger.error({ problem }, 'bingo card failed validation; regenerating');
  }
  throw new Error('Bingo card generation failed');
}

/** Issues cards that are unique across one match. */
export function createCardIssuer(): { issue(): BingoCard } {
  const issued = new Set<string>();
  return {
    issue(): BingoCard {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const card = generateCard();
        const key = cardKey(card);
        if (issued.has(key)) continue;
        issued.add(key);
        return card;
      }
      throw new Error('Bingo card issuing failed');
    },
  };
}

/** Development-only: BINGO_DEV_CARD_AUDIT=N generates N cards and logs validity and uniqueness. */
export function runCardAuditFromEnv(log: (fields: Record<string, unknown>, message: string) => void): void {
  if (config.isProd) return;
  const raw = process.env.BINGO_DEV_CARD_AUDIT;
  if (!raw || !/^\d+$/.test(raw.trim())) return;
  const total = Number.parseInt(raw.trim(), 10);
  if (!Number.isSafeInteger(total) || total <= 0) return;
  const issuer = createCardIssuer();
  const keys = new Set<string>();
  let ok = 0;
  for (let i = 0; i < total; i++) {
    const card = issuer.issue();
    const key = cardKey(card);
    if (validateBingoCard(card) === null && !keys.has(key)) ok++;
    keys.add(key);
  }
  log({ total, ok }, `bingo card audit: ${ok} of ${total} valid and unique`);
}

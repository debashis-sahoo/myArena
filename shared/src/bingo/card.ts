import { BINGO_COLUMN_RANGES } from './letters.js';

/** 25 numbers in row-major order (index `row * 5 + col`); the centre cell (index 12) is 0, meaning FREE. */
export type BingoCard = number[];

/** The centre cell. It counts as marked and called from the start; nobody daubs it, and it is never stored in a daub mask. */
export const BINGO_FREE_INDEX = 12;

export function cellIndex(row: number, col: number): number {
  return row * 5 + col;
}

export function rowOf(index: number): number {
  return Math.floor(index / 5);
}

export function colOf(index: number): number {
  return index % 5;
}

/** The 24 numbers joined as text; identical cards share a key. */
export function cardKey(card: readonly number[]): string {
  return card.filter((_, i) => i !== BINGO_FREE_INDEX).join(',');
}

const MSG_SHAPE = 'a card holds 25 whole numbers';
const MSG_COLUMNS =
  'column B holds five different numbers from 1-15, I from 16-30, N four different numbers from 31-45, G from 46-60 and O from 61-75';
const MSG_FREE = 'the centre cell (index 12, third row of N) is 0, meaning FREE; every other cell is a number';
const MSG_UNIQUE = 'no number appears twice on the card';

/** Returns an error message, or null when the card is valid. */
export function validateBingoCard(card: readonly number[]): string | null {
  if (!Array.isArray(card) || card.length !== 25 || !card.every((n) => Number.isInteger(n))) return MSG_SHAPE;
  for (let i = 0; i < 25; i++) {
    const n = card[i] ?? 0;
    if (i === BINGO_FREE_INDEX ? n !== 0 : n === 0) return MSG_FREE;
  }
  for (let i = 0; i < 25; i++) {
    if (i === BINGO_FREE_INDEX) continue;
    const range = BINGO_COLUMN_RANGES[colOf(i)];
    const n = card[i] ?? 0;
    if (!range || n < range[0] || n > range[1]) return MSG_COLUMNS;
  }
  const numbers = card.filter((_, i) => i !== BINGO_FREE_INDEX);
  if (new Set(numbers).size !== numbers.length) return MSG_UNIQUE;
  return null;
}

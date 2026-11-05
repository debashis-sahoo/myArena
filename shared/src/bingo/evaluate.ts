import type { BingoPatternDef } from './patterns.js';
import { BINGO_FREE_INDEX } from './card.js';

/**
 * Whether `card` completes `pattern`. A cell counts only if its daub bit (`1 << index`) is set AND it is the FREE cell or its
 * number was called. Daubs on other cells do not matter.
 */
export function evaluateBingoPattern(
  pattern: BingoPatternDef,
  card: readonly number[],
  daubs: number,
  called: ReadonlySet<number>,
): boolean {
  const satisfied = (index: number): boolean => {
    if ((daubs & (1 << index)) === 0) return false;
    return index === BINGO_FREE_INDEX || called.has(card[index] ?? 0);
  };
  return pattern.variants.some((cells) => cells.every(satisfied));
}

/** Ids of the patterns (in the order given) that `card` completes. */
export function completedBingoPatterns(
  patterns: readonly BingoPatternDef[],
  card: readonly number[],
  daubs: number,
  called: ReadonlySet<number>,
): string[] {
  return patterns.filter((p) => evaluateBingoPattern(p, card, daubs, called)).map((p) => p.id);
}

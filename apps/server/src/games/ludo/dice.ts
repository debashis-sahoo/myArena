import { randomInt } from 'node:crypto';

/** Everything the match needs that must be fair or random. Clients never supply any of it. */
export interface DiceSource {
  /** A die face, 1 to 6, every face equally likely. */
  value(): number;
  /** Makes the animated throw differ from roll to roll; it never affects the result. */
  seed(): number;
  /** Which of `count` seats goes first. */
  firstSeat(count: number): number;
}

export const cryptoDice = (): DiceSource => ({
  value: () => randomInt(1, 7),
  seed: () => randomInt(0, 2 ** 32),
  firstSeat: (count) => randomInt(0, count),
});

/** For tests only: cycles `values`, derives seeds from a counter, and always starts with the first seat. */
export function scriptedDice(values: readonly number[]): DiceSource {
  let rolls = 0;
  let seeds = 0;
  return {
    value: () => values[rolls++ % values.length]!,
    seed: () => Math.imul(++seeds, 2654435761) >>> 0,
    firstSeat: () => 0,
  };
}

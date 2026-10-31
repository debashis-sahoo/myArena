import { COLORS, type Color } from './board.js';

const PLAN: Readonly<Record<number, readonly Color[]>> = {
  2: ['RED', 'YELLOW'],
  3: ['RED', 'GREEN', 'YELLOW'],
  4: ['RED', 'GREEN', 'YELLOW', 'BLUE'],
};

/** Colours in turn order for a match of `players` seats; people take them in the order they joined. */
export function colorsFor(players: number): readonly Color[] {
  const plan = PLAN[players];
  if (!plan) throw new RangeError('A Ludo match has 2 to 4 players.');
  return plan;
}

/** Clockwise order of all colours, used to keep turn order stable. */
export const TURN_ORDER = COLORS;

/** The next seat after `from` (clockwise) that has not left, or null when none remains. */
export function nextSeat(seats: readonly { left: boolean }[], from: number): number | null {
  for (let step = 1; step <= seats.length; step += 1) {
    const index = (from + step) % seats.length;
    if (!seats[index]!.left) return index;
  }
  return null;
}

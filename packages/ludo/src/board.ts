export const COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'] as const;
export type Color = (typeof COLORS)[number];

export const RING_LENGTH = 52;
export const START_INDEX: Readonly<Record<Color, number>> = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 };
export const STAR_INDEXES = [8, 21, 34, 47] as const;
export const LANE_LENGTH = 5;
export const PAWNS_PER_SEAT = 4;

// A pawn's step: -1 base, 0 start square, 1 to 50 ring, 51 to 55 home lane, 56 home.
export const BASE = -1;
export const LAST_RING_STEP = 50;
export const FIRST_LANE_STEP = 51;
export const HOME_STEP = 56;

export type Zone = 'BASE' | 'RING' | 'LANE' | 'HOME';

export function zoneOf(step: number): Zone {
  if (step === BASE) return 'BASE';
  if (step >= 0 && step <= LAST_RING_STEP) return 'RING';
  if (step >= FIRST_LANE_STEP && step < HOME_STEP) return 'LANE';
  if (step === HOME_STEP) return 'HOME';
  throw new RangeError(`Invalid pawn step ${step}.`);
}

/** Shared ring square (0 to 51) for a step on the ring (0 to 50), otherwise null. */
export function ringIndexOf(color: Color, step: number): number | null {
  return step >= 0 && step <= LAST_RING_STEP ? (START_INDEX[color] + step) % RING_LENGTH : null;
}

const PROTECTED = new Set<number>([...Object.values(START_INDEX), ...STAR_INDEXES]);
/** Start squares and star squares: no capture and no block there. */
export const isProtectedRing = (ringIndex: number): boolean => PROTECTED.has(ringIndex);

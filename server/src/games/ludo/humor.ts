/**
 * Ludo humor: the only text the server posts to Ludo's Chat (specs/007 research R8, data-model section 4).
 *
 * Tone rules: encouraging or playful about the game. No insults, no sensitive traits, no mocking of being behind (a player who is
 * trailing gets a comeback line, never a jab), and no invented facts: a guard (`needs`) reads match state only, and a line that
 * mentions state is written so it is true whenever its guard passes. Lines carry no emoji and no names other than the public display
 * name that fills `{name}`.
 */

export interface HumorContext {
  /** Public display name of the addressee. */
  name: string;
  /** Pawns home for that player (0 to 4). */
  home: number;
  /** Every pawn is still in the base. */
  allInBase: boolean;
  /** Strictly the most pawns home, and at least one. */
  soleLeader: boolean;
}

export interface HumorLine {
  text: string;
  needs?: (c: HumorContext) => boolean;
}

export const HUMOR_MIN_MS = 45_000;
export const HUMOR_MAX_MS = 90_000;
/** A line is never chosen again while it is one of the last this many returned. */
export const HUMOR_MEMORY = 5;
const MAX_LINE = 120;
const MAX_NAME = 20;

/** No names, true for any match. */
export const GENERAL: readonly string[] = [
  'The dice are watching. Behave.',
  'Fun fact: the dice have never once apologised.',
  'A pawn out of base is a pawn with ambitions.',
  'Somewhere, a six is warming up.',
  'Friendly reminder: the dice cannot be bribed. People have tried.',
  'Every long trip home starts with one brave pawn.',
  'Rolling tip: blowing on the dice does nothing, but it looks great.',
  'The board is small, but the drama is huge.',
  'Slow and steady wins races. Sixes win Ludo.',
  'Pawns do not have feelings. Probably.',
  'Keep calm and roll on.',
  'May your next roll be a fortunate one.',
  'Safe squares are a pawn\u2019s happy place.',
  'Keep rolling. The board loves a surprise.',
];

/** Templates with a {name} slot; a guarded line is only used when its guard passes for the addressee. */
export const ADDRESSED: readonly HumorLine[] = [
  { text: '{name}, that thumb is warmed up. Roll it.' },
  { text: 'Go on, {name}. The dice believe in you.' },
  { text: '{name}, your pawns are staring at the dice. No pressure.' },
  { text: 'Big roll energy from {name}.' },
  { text: '{name}, fortune favours the brave. And the lucky. Mostly the lucky.' },
  { text: 'A round of applause for {name}, who keeps showing up and rolling.' },
  { text: '{name}, any spare sixes are welcome.' },
  { text: 'Keep it up, {name}. The next roll could be the one.' },
  { text: '{name} has a pawn home already. Smooth.', needs: (c) => c.home >= 1 },
  { text: 'Nice work getting a pawn home, {name}. Who is next?', needs: (c) => c.home >= 1 },
  { text: '{name}, the base is cosy, but the board is waiting. A six will do it.', needs: (c) => c.allInBase },
  { text: 'Plenty of game left, {name}. Comebacks are the best part of Ludo.', needs: (c) => c.allInBase },
  { text: '{name} leads the way. The rest are plotting.', needs: (c) => c.soleLeader },
  { text: '{name} is out front. Keep an eye on the pawns behind you.', needs: (c) => c.soleLeader },
];

/** Uniform delay in [HUMOR_MIN_MS, HUMOR_MAX_MS]; never below the minimum. */
export function humorDelayMs(rand: () => number = Math.random): number {
  return HUMOR_MIN_MS + Math.floor(Math.min(0.999999, Math.max(0, rand())) * (HUMOR_MAX_MS - HUMOR_MIN_MS + 1));
}

export interface HumorPicker {
  /** One line for this moment: general or addressed at random, never one of the previous five. */
  next(players: HumorContext[]): string;
  /** Forgets the recent lines (a replay starts fresh). */
  reset(): void;
}

function render(line: string, name: string): string {
  const text = line.replace(/\{name\}/g, Array.from(name).slice(0, MAX_NAME).join(''));
  return text.length <= MAX_LINE ? text : `${text.slice(0, MAX_LINE - 1).trimEnd()}\u2026`;
}

export function createHumorPicker(rand: () => number = Math.random): HumorPicker {
  const recent: string[] = [];
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
  const fresh = (text: string): boolean => !recent.includes(text);
  const remember = (text: string): string => {
    recent.push(text);
    if (recent.length > HUMOR_MEMORY) recent.shift();
    return text;
  };

  function addressed(players: HumorContext[]): string | null {
    // Visit the players in random order and take the first one that has an unused line whose guard passes.
    const order = [...players];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j] as HumorContext, order[i] as HumorContext];
    }
    for (const c of order) {
      const pool = ADDRESSED.filter((l) => (l.needs ? l.needs(c) : true))
        .map((l) => render(l.text, c.name))
        .filter(fresh);
      if (pool.length > 0) return pick(pool);
    }
    return null;
  }

  return {
    next(players) {
      const text = players.length > 0 && rand() < 0.5 ? addressed(players) : null;
      if (text !== null) return remember(text);
      const pool = GENERAL.map((l) => render(l, '')).filter(fresh);
      return remember(pool.length > 0 ? pick(pool) : pick(GENERAL));
    },
    reset() {
      recent.length = 0;
    },
  };
}

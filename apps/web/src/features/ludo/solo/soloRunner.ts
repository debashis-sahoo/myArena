import {
  NO_MOVE_PAUSE_MS, ROLL_ANIMATION_MS, advance, chooseMove, createMatch, isStuck, legalPawns, move, roll, toMatchView,
  type EngineEvent, type LudoEvent, type LudoMatchView, type MatchState,
} from '@myarena/ludo';
import type { SoloSettings } from './soloStorage';

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface SoloDice {
  /** 1 to 6, drawn from a uniform source. */
  value(): number;
  /** 0 to 4294967295; drives the shape of the throw only. */
  seed(): number;
  firstSeat(count: number): number;
  /** A float in [0, 1) for computer pauses and Easy choices. */
  random(): number;
}

export interface SoloUpdate { view: LudoMatchView; seq: number; events: LudoEvent[]; }

export interface SoloRunner {
  /** Publishes the first update and starts any computer turn. */
  start(): void;
  roll(): string | null;
  move(pawn: number): string | null;
  stop(): void;
}

export interface SoloOptions {
  settings: SoloSettings;
  visitorLabel: string;
  resume?: MatchState | null;
  onUpdate: (update: SoloUpdate) => void;
  /** Called with the new state after every change, so the caller can save it. */
  onState?: (state: MatchState) => void;
  clock?: Clock;
  dice?: SoloDice;
}

/** A computer waits 700 to 1500 ms before each of its two actions: 3 s at most, apart from the roll animation. */
export const COMPUTER_PAUSE_MIN_MS = 700;
export const COMPUTER_PAUSE_SPAN_MS = 800;

const browserClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
};

function unit(): number { return crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296; }

export const cryptoDice: SoloDice = {
  value() {
    const bucket = new Uint8Array(1);
    // Reject the top of the byte range so every face is equally likely.
    do crypto.getRandomValues(bucket); while (bucket[0]! >= 252);
    return (bucket[0]! % 6) + 1;
  },
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0]!,
  firstSeat: (count) => Math.min(count - 1, Math.floor(unit() * count)),
  random: unit,
};

export function createSoloMatch(settings: SoloSettings, visitorLabel: string, firstSeat: number): MatchState {
  const seats = [
    { kind: 'HUMAN' as const, label: visitorLabel },
    ...Array.from({ length: settings.opponents }, (_, index) => ({ kind: 'COMPUTER' as const, label: `Computer ${index + 1}` })),
  ];
  return createMatch(seats, firstSeat);
}

const toLudoEvents = (events: EngineEvent[], throwInfo?: { seed: number }): LudoEvent[] =>
  events.map((event) => (event.kind === 'ROLLED'
    ? { ...event, seed: throwInfo?.seed ?? 0, durationMs: ROLL_ANIMATION_MS }
    : event));

/** Plays a solo match on this device: the visitor is seat 0 (Red), computers take the other seats. */
export function createSoloRunner(options: SoloOptions): SoloRunner {
  const clock = options.clock ?? browserClock;
  const dice = options.dice ?? cryptoDice;
  const count = options.settings.opponents + 1;
  let state = options.resume ?? createSoloMatch(options.settings, options.visitorLabel, dice.firstSeat(count));
  let seq = 0;
  let settleUntil = 0;
  let timer: unknown = null;
  let stopped = false;

  const clearTimer = (): void => { if (timer !== null) { clock.clearTimeout(timer); timer = null; } };
  const after = (ms: number, action: () => void): void => {
    clearTimer();
    timer = clock.setTimeout(() => { timer = null; if (!stopped) action(); }, ms);
  };
  const pause = (): number => COMPUTER_PAUSE_MIN_MS + Math.floor(dice.random() * (COMPUTER_PAUSE_SPAN_MS + 1));

  function schedule(): void {
    if (state.phase === 'ENDED' || state.current === null) return;
    const computer = state.seats[state.current]!.kind === 'COMPUTER';
    if (state.phase === 'ROLL') {
      if (computer) after(pause(), doRoll);
      return;
    }
    const settle = Math.max(0, settleUntil - clock.now());
    if (isStuck(state)) after(settle + NO_MOVE_PAUSE_MS, doAdvance);
    else if (computer) after(settle + pause(), doComputerMove);
  }

  function publish(events: LudoEvent[]): void {
    seq += 1;
    const view = toMatchView(state, {
      theme: options.settings.theme, turnLimitSeconds: 0, you: 0, legalPawns: legalPawns(state),
      decisionMsLeft: null, settleMsLeft: Math.max(0, settleUntil - clock.now()),
    });
    options.onState?.(state);
    options.onUpdate({ view, seq, events });
    schedule();
  }

  function doRoll(): void {
    const seed = dice.seed();
    const result = roll(state, dice.value());
    state = result.state;
    settleUntil = clock.now() + ROLL_ANIMATION_MS;
    publish(toLudoEvents(result.events, { seed }));
  }
  function doAdvance(): void {
    const result = advance(state);
    state = result.state;
    publish(toLudoEvents(result.events));
  }
  function doMove(pawn: number): void {
    const result = move(state, pawn);
    state = result.state;
    publish(toLudoEvents(result.events));
  }
  function doComputerMove(): void {
    const pawn = chooseMove(state, options.settings.difficulty, dice.random);
    if (pawn !== null) doMove(pawn);
  }

  return {
    start() { publish([]); },
    roll() {
      if (state.current !== 0 || state.phase !== 'ROLL') return 'It is not time for you to roll.';
      doRoll();
      return null;
    },
    move(pawn) {
      if (state.current !== 0 || state.phase !== 'MOVE') return 'It is not time for you to move.';
      if (clock.now() < settleUntil) return 'The die is still rolling. Wait a moment, then choose a pawn.';
      if (!legalPawns(state).includes(pawn)) return 'That pawn cannot move with this roll.';
      doMove(pawn);
      return null;
    },
    stop() { stopped = true; clearTimer(); },
  };
}

/** Pacing shared by server and client so the server never starts a step before clients have shown the last one. */
export const TURN_TIMER_MS = 15_000;
export const ROLL_TUMBLE_MS = 1_400;
export const HOP_MS = 340;
export const LAND_PAUSE_MS = 250;
export const CAPTURE_MS = 900;
export const HOME_CELEBRATE_MS = 600;
export const NO_MOVE_PAUSE_MS = 1_200;
export const BOT_PAUSE_MS = 1_500;
export const BOT_THINK_MS = 700;
export const TURN_HANDOFF_MS = 500;
export const AWAY_WARN_AT = 2;
export const AWAY_RELEASE_AT = 3;

/** How long clients need to show a move of `hops` squares (plus a capture bounce when `captured`). */
export function moveDurationMs(hops: number, captured: boolean): number {
  return hops * HOP_MS + LAND_PAUSE_MS + (captured ? CAPTURE_MS : 0);
}

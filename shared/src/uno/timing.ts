/** UNO constants shared by server and client. Values mirror specs/006-uno-game-module/data-model.md section 2. */

export const UNO_HAND_SIZE = 7;
export const UNO_MIN_PLAYERS = 2;
export const UNO_MAX_PLAYERS = 5;
export const UNO_DEFAULT_CAPACITY = 4;

/** Human turn countdown and the missed-turn limits. */
export const UNO_TURN_TIMER_MS = 30_000;
export const UNO_AWAY_WARN_AT = 2;
export const UNO_AWAY_RELEASE_AT = 3;

/** UNO! catch window and its penalty. */
export const UNO_CATCH_WINDOW_MS = 5_000;
export const UNO_CATCH_PENALTY = 2;

/** Bots: pause before acting, reaction time to an uncalled UNO!, chance of forgetting to call. */
export const UNO_BOT_PAUSE_MIN_MS = 1_500;
export const UNO_BOT_PAUSE_MAX_MS = 2_000;
export const UNO_BOT_CATCH_MIN_MS = 2_000;
export const UNO_BOT_CATCH_MAX_MS = 3_500;
export const UNO_BOT_FORGET_PROBABILITY = 1 / 6;

/** Animation lengths (the server's settle times follow them so every screen finishes before the next turn). */
export const UNO_THROW_MS = 450;
export const UNO_FLY_MS = 400;
export const UNO_FLY_STAGGER_MS = 110;
export const UNO_FLY_MAX_MS = 1_200;
export const UNO_BOUNCE_MS = 320;
export const UNO_SHAKE_MS = 240;
export const UNO_FLARE_MS = 600;
export const UNO_AURA_MS = 350;
export const UNO_BANNER_MS = 900;

/** Staged card play: the card lifts to a hold pose while the server answers, then the throw finishes (specs/007). */
export const UNO_HOLD_LIFT_MS = 120;
/** Share of the distance to the Discard Pile covered by the hold pose. */
export const UNO_HOLD_FRACTION = 0.4;
export const UNO_FINISH_THROW_MS = 220;
export const UNO_RETURN_MS = 220;
export const UNO_HOLD_TIMEOUT_MS = 4_000;

/** Server pause before the next turn starts. */
export const UNO_SETTLE_DEAL_MS = 1_500;
export const UNO_SETTLE_PLAY_MS = 600;
export const UNO_SETTLE_EFFECT_MS = 900;

/** Pause before an unavoidable penalty is taken for a human (a bot waits its normal pause). */
export const UNO_PENALTY_BEAT_MS = 900;

/** Time for `count` cards to fly from the pile, so the next turn starts after the screens finish. */
export function unoDrawSettleMs(count: number): number {
  return Math.min(UNO_FLY_MAX_MS, UNO_FLY_MS + Math.max(0, count - 1) * UNO_FLY_STAGGER_MS);
}

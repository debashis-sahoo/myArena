/** Housie pacing and limits shared by server and client. Spec: specs/003-housie-tambola-module/data-model.md */
export const AUTO_INTERVALS_MS = [5_000, 8_000, 10_000] as const;
export const CLAIM_PACE_MS = 2_000;
/** Consecutive bogus claims before a player is locked out. */
export const BOGUS_STREAK_LIMIT = 3;
export const CLAIM_LOCK_MS = 60_000;
export const BALL_ROLL_MS = 1_100;
export const MARK_FLUSH_MS = 200;
export const MARK_BATCH_MAX = 30;
export const TICKET_CEILING_MAX = 4;
export const DEFAULT_TICKET_CEILING = 1;
export const DEFAULT_PATTERN_IDS = [
  'early-five',
  'top-line',
  'middle-line',
  'bottom-line',
  'four-corners',
  'full-house-1',
] as const;

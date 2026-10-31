export const THEME_IDS = ['classic', 'super-heroes', 'halloween', 'diwali', 'winter'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = 'classic';

/** Seconds a seat has to decide; 0 means no limit. */
export const TURN_LIMITS = [0, 30, 60, 90] as const;
export type TurnLimit = (typeof TURN_LIMITS)[number];
export const DEFAULT_TURN_LIMIT: TurnLimit = 60;

/** Timing shared by the server runner, the solo runner and the renderers (milliseconds). */
export const ROLL_ANIMATION_MS = 2400;
export const NO_MOVE_PAUSE_MS = 1200;
export const AUTO_PAUSE_MS = 600;
export const AWAY_AFTER_MISSES = 3;

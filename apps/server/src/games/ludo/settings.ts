import { z } from 'zod';
import { DEFAULT_THEME, DEFAULT_TURN_LIMIT, THEME_IDS, type ThemeId, type TurnLimit } from '@myarena/ludo';

// Strict: unknown keys and values outside the documented lists are rejected; an empty object yields the defaults.
// The literals below are the values of TURN_LIMITS (0 means no limit).
export const ludoSettingsSchema = z.strictObject({
  theme: z.enum(THEME_IDS).default(DEFAULT_THEME),
  turnLimitSeconds: z.union([z.literal(0), z.literal(30), z.literal(60), z.literal(90)]).default(DEFAULT_TURN_LIMIT),
});

export interface LudoSettings { theme: ThemeId; turnLimitSeconds: TurnLimit; }

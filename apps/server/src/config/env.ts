import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOY_TARGET: z.enum(['production', 'preview']).default('production'),
  ALLOWED_ORIGINS: z.string().optional(),
  MAX_ROOMS: z.coerce.number().int().min(1).max(1000).default(20),
  MAX_TOTAL_PARTICIPANTS: z.coerce.number().int().min(1).max(10000).default(200),
  TEST_GAME_SECONDS: z.coerce.number().int().min(1).max(3600).optional(),
  LUDO_TEST_DICE: z.string().optional(),
  CREATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100000).default(10),
  JOIN_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100000).default(20),
  PREVIEW_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(100000).default(30),
});

export function parseEnv(environment: Record<string, string | undefined> = process.env) {
  const parsed = schema.parse(environment);
  if (parsed.NODE_ENV === 'production' && !parsed.ALLOWED_ORIGINS) {
    throw new Error('ALLOWED_ORIGINS is required in production.');
  }
  if (parsed.NODE_ENV === 'production' && parsed.TEST_GAME_SECONDS !== undefined && parsed.DEPLOY_TARGET !== 'preview') {
    throw new Error('TEST_GAME_SECONDS enables a test-only game and is not allowed in production unless DEPLOY_TARGET=preview.');
  }
  // Rolls decide wins, so a fixed die is never accepted in production, preview deployments included.
  if (parsed.NODE_ENV === 'production' && parsed.LUDO_TEST_DICE !== undefined) {
    throw new Error('LUDO_TEST_DICE fixes the die for tests and is not allowed in production.');
  }
  const ludoTestDice = parsed.LUDO_TEST_DICE === undefined ? null : parsed.LUDO_TEST_DICE.split(',').map((value) => {
    if (!/^[1-6]$/.test(value.trim())) throw new Error('LUDO_TEST_DICE must be a comma-separated list of die values from 1 to 6.');
    return Number(value.trim());
  });
  const allowedOrigins = (parsed.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((value) => value.trim());
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password || (parsed.NODE_ENV === 'production' && url.protocol !== 'https:')) {
      throw new Error('ALLOWED_ORIGINS must contain exact origins; production requires HTTPS.');
    }
  }
  return {
    port: parsed.PORT, nodeEnv: parsed.NODE_ENV, deployTarget: parsed.DEPLOY_TARGET, allowedOrigins,
    maxRooms: parsed.MAX_ROOMS, maxTotalParticipants: parsed.MAX_TOTAL_PARTICIPANTS,
    testGameSeconds: parsed.TEST_GAME_SECONDS ?? null,
    ludoTestDice,
    rateLimits: { create: parsed.CREATE_LIMIT_PER_MINUTE, join: parsed.JOIN_LIMIT_PER_MINUTE, preview: parsed.PREVIEW_LIMIT_PER_MINUTE },
    recoveryWindowMs: 600_000, heartbeatMs: 20_000,
  };
}
export type Environment = ReturnType<typeof parseEnv>;
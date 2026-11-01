import crypto from 'node:crypto';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

/**
 * Development-only controls (research R10). They are read only outside production and ignored, with a startup
 * warning, in production, so no environment or client can influence real results.
 */
const DEV_VARS = ['LUDO_DEV_DICE', 'LUDO_DEV_SCENARIO', 'LUDO_TURN_MS'] as const;

export function warnIfDevControlsSet(): void {
  if (!config.isProd) return;
  const set = DEV_VARS.filter((name) => process.env[name]);
  if (set.length) logger.warn({ ignored: set }, 'Ludo development controls are ignored in production');
}

function devValue(name: (typeof DEV_VARS)[number]): string | undefined {
  if (config.isProd) return undefined;
  const raw = process.env[name];
  return raw ? raw : undefined;
}

export interface Dice {
  roll(): number;
}

/** Server dice: crypto-random 1 to 6, or the LUDO_DEV_DICE sequence (outside production) before random dice resume. */
export function createDice(): Dice {
  const scripted = (devValue('LUDO_DEV_DICE') ?? '')
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 6);
  let index = 0;
  return {
    roll: () => {
      const next = scripted[index++];
      return next ?? crypto.randomInt(1, 7);
    },
  };
}

/** LUDO_DEV_SCENARIO=endgame: three pawns on HOME and one at progress 50 for every player. */
export function endgameScenario(): boolean {
  return devValue('LUDO_DEV_SCENARIO') === 'endgame';
}

/** LUDO_TURN_MS replaces the 15 s countdown (outside production). */
export function devTurnMs(): number | undefined {
  const raw = devValue('LUDO_TURN_MS');
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 500 ? n : undefined;
}

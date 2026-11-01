import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MAX_ROOMS, RECONNECT_WINDOW_MS, REMOVAL_COOLDOWN_MS } from '@myarena/shared';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  /** Render injects PORT (10000); 10000 is also the local default. */
  port: intFromEnv('PORT', 10000),
  isProd: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  maxRooms: intFromEnv('MAX_ROOMS', MAX_ROOMS),
  reconnectWindowMs: intFromEnv('RECONNECT_WINDOW_MS', RECONNECT_WINDOW_MS),
  removalCooldownMs: intFromEnv('REMOVAL_COOLDOWN_MS', REMOVAL_COOLDOWN_MS),
  /** server/dist/<file>.js -> repo/client/dist. Same relative hop from server/src when run with tsx. */
  clientDist: path.resolve(here, '../../client/dist'),
};

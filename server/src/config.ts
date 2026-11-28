import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  MAX_ROOMS,
  RECONNECT_WINDOW_MS,
  REMOVAL_COOLDOWN_MS,
  type SlotIdentity,
} from '@myarena/shared';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampedIntFromEnv(name: string, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, intFromEnv(name, fallback)));
}

const here = path.dirname(fileURLToPath(import.meta.url));

const housieMaxPlayers = clampedIntFromEnv('HOUSIE_MAX_PLAYERS', 200, 2, 500);
const bingoMaxPlayers = clampedIntFromEnv('BINGO_MAX_PLAYERS', 200, 2, 500);
const slotIdentity = (process.env.SLOT_IDENTITY ?? 'production') as SlotIdentity;
const legacyRoomAdmission = process.env.ACCEPTS_PUBLIC_NEW_ROOMS;
const publicOrigin = originFromEnv('PUBLIC_ORIGIN');
const drainOrigin = originFromEnv('DRAIN_ORIGIN');
const verifierTokenHash = process.env.CANDIDATE_VERIFIER_TOKEN_HASH ?? '';
const verifierExpiresUtc = process.env.CANDIDATE_VERIFIER_EXPIRES_UTC ?? '';

if (slotIdentity !== 'production' && slotIdentity !== 'staging') {
  throw new Error(`Invalid SLOT_IDENTITY: ${slotIdentity}`);
}

if (legacyRoomAdmission !== undefined && legacyRoomAdmission !== String(slotIdentity === 'production')) {
  throw new Error('ACCEPTS_PUBLIC_NEW_ROOMS conflicts with immutable SLOT_IDENTITY.');
}

if (Boolean(verifierTokenHash) !== Boolean(verifierExpiresUtc)) {
  throw new Error('Candidate verifier hash and expiry must be configured together.');
}

if (verifierTokenHash && !/^[a-f0-9]{64}$/i.test(verifierTokenHash)) {
  throw new Error('CANDIDATE_VERIFIER_TOKEN_HASH must be a SHA-256 hex digest.');
}

if (verifierExpiresUtc && !Number.isFinite(Date.parse(verifierExpiresUtc))) {
  throw new Error('CANDIDATE_VERIFIER_EXPIRES_UTC must be an ISO-8601 timestamp.');
}

if (slotIdentity === 'production' && verifierTokenHash) {
  throw new Error('The candidate verifier capability must never be configured on production.');
}

function originFromEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS origin.`);
  }
  if (parsed.protocol !== 'https:' || parsed.origin !== value) {
    throw new Error(`${name} must be an exact HTTPS origin without a path, query, or fragment.`);
  }
  return parsed.origin;
}

function validCandidateVerifier(raw: unknown): boolean {
  if (
    slotIdentity !== 'staging' ||
    !verifierTokenHash ||
    !verifierExpiresUtc ||
    Date.now() >= Date.parse(verifierExpiresUtc) ||
    typeof raw !== 'string' ||
    raw.length < 32 ||
    raw.length > 512
  ) {
    return false;
  }
  const actual = crypto.createHash('sha256').update(raw, 'utf8').digest();
  const expected = Buffer.from(verifierTokenHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export const config = {
  /** Azure injects PORT; 10000 is the local default. */
  port: intFromEnv('PORT', 10000),
  isProd: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  slotIdentity,
  releaseId: process.env.RELEASE_ID ?? 'local',
  publicOrigin,
  drainOrigin,
  acceptsPublicNewRooms: slotIdentity === 'production',
  validCandidateVerifier,
  maxRooms: intFromEnv('MAX_ROOMS', MAX_ROOMS),
  reconnectWindowMs: intFromEnv('RECONNECT_WINDOW_MS', RECONNECT_WINDOW_MS),
  removalCooldownMs: intFromEnv('REMOVAL_COOLDOWN_MS', REMOVAL_COOLDOWN_MS),
  /** Housie seat cap (env HOUSIE_MAX_PLAYERS), clamped to 2..500. */
  housieMaxPlayers,
  /** Bingo seat cap (env BINGO_MAX_PLAYERS), clamped to 2..500. */
  bingoMaxPlayers,
  /** Player ceiling per roster game id. */
  rosterMaxPlayers: { housie: housieMaxPlayers, bingo: bingoMaxPlayers } as Record<string, number>,
  /** Maximum concurrent sockets (env MAX_SOCKETS). */
  maxSockets: intFromEnv('MAX_SOCKETS', 500),
  /** server/dist/<file>.js -> repo/client/dist. Same relative hop from server/src when run with tsx. */
  clientDist: path.resolve(here, '../../client/dist'),
};

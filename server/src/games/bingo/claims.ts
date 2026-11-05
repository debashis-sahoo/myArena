import {
  BOGUS_STREAK_LIMIT,
  CLAIM_LOCK_MS,
  CLAIM_PACE_MS,
  completedBingoPatterns,
  getBingoPattern,
  type BingoAction,
  type BingoPatternDef,
} from '@myarena/shared';
import { config } from '../../config.js';
import type { ActionResult } from '../registry.js';
import { finishMatch, publish } from './matchOps.js';
import type { Match, PlayerEntry } from './model.js';

/** Development-only override of the claim pace for quick manual checks; ignored in production. */
function paceMs(): number {
  const raw = process.env.BINGO_CLAIM_PACE_MS;
  if (config.isProd || !raw) return CLAIM_PACE_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : CLAIM_PACE_MS;
}

type ClaimAction = Extract<BingoAction, { type: 'bingo' }>;

/**
 * Decides a claim at the moment the server receives it (single-threaded, so the first arrival wins a race). The named card is
 * checked against every pattern in play; a cell counts only if it is daubed and (FREE or called). Order: data-model "Claim".
 */
export function handleClaim(match: Match, playerId: string, action: ClaimAction): ActionResult {
  const ctx = match.ctx;
  const entry: PlayerEntry | undefined = match.players.get(playerId);
  if (match.phase !== 'running') return { ok: false, reason: 'The match is over.' };
  if (!entry || entry.status !== 'playing') return { ok: false, reason: 'You are not playing in this match.' };
  const card = entry.cards[action.card];
  if (!card) return { ok: false, reason: 'You do not have that card.' };

  const now = ctx.now();
  if (now < entry.lockedUntil) {
    ctx.emitTo(playerId, { type: 'claimsPaused', priv: true, untilMs: entry.lockedUntil - now });
    return { ok: false, reason: 'Claims paused.' };
  }
  if (now - entry.lastClaimAt < paceMs()) return { ok: false, reason: 'Wait a moment.' };
  entry.lastClaimAt = now;

  const inPlay = match.patterns.map((p) => getBingoPattern(p.id)).filter((d): d is BingoPatternDef => d !== undefined);
  const completed = completedBingoPatterns(inPlay, card, entry.daubs[action.card] ?? 0, new Set(match.called));
  const awarded = match.patterns.filter((p) => !p.claimedBy && completed.includes(p.id));

  if (awarded.length > 0) {
    entry.bogusStreak = 0;
    const by = { playerId, name: entry.name, color: entry.color };
    for (const p of awarded) {
      p.claimedBy = by;
      p.claimedAtCall = match.called.length;
    }
    publish(match, { type: 'claimed', patterns: awarded.map((p) => p.id), by, calledCount: match.called.length });
    if (match.patterns.every((p) => p.claimedBy)) finishMatch(match);
    return { ok: true };
  }

  if (completed.length > 0) {
    ctx.emitTo(playerId, { type: 'tooLate', priv: true });
    return { ok: true };
  }

  entry.bogusStreak++;
  ctx.emitTo(playerId, { type: 'bogus', priv: true });
  if (entry.bogusStreak >= BOGUS_STREAK_LIMIT) {
    entry.bogusStreak = 0;
    entry.lockedUntil = now + CLAIM_LOCK_MS;
    ctx.emitTo(playerId, { type: 'claimsPaused', priv: true, untilMs: CLAIM_LOCK_MS });
  }
  return { ok: true };
}

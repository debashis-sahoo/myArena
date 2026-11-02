import {
  BOGUS_STREAK_LIMIT,
  CLAIM_LOCK_MS,
  CLAIM_PACE_MS,
  evaluatePattern,
  getPattern,
  type HousieAction,
} from '@myarena/shared';
import { config } from '../../config.js';
import type { ActionResult } from '../registry.js';
import { finishMatch, publish } from './matchOps.js';
import type { Match, PlayerEntry } from './model.js';

/** Development-only override of the claim pace for quick manual checks; ignored in production. */
function paceMs(): number {
  const raw = process.env.HOUSIE_CLAIM_PACE_MS;
  if (config.isProd || !raw) return CLAIM_PACE_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : CLAIM_PACE_MS;
}

type ClaimAction = Extract<HousieAction, { type: 'claim' }>;

/**
 * Decides a claim at the moment the server receives it (single-threaded, so the first arrival wins a race). Valid only if every
 * pattern cell on the chosen ticket is called AND crossed by the claimant (data-model "Claim").
 */
export function handleClaim(match: Match, playerId: string, action: ClaimAction): ActionResult {
  const ctx = match.ctx;
  const entry: PlayerEntry | undefined = match.players.get(playerId);
  if (match.phase !== 'running') return { ok: false, reason: 'The match is over.' };
  if (!entry || entry.status !== 'playing') return { ok: false, reason: 'You are not playing in this match.' };
  const combo = match.combos.find((c) => c.id === action.combo);
  const pattern = getPattern(action.combo);
  const ticket = entry.tickets[action.ticket];
  if (!combo || !pattern) return { ok: false, reason: 'That combination is not in play.' };
  if (!ticket) return { ok: false, reason: 'You do not have that ticket.' };

  if (combo.claimedBy) {
    ctx.emitTo(playerId, { type: 'justClaimed', priv: true, combo: combo.id });
    return { ok: true };
  }
  if (combo.locked) return { ok: false, reason: 'Claim the earlier Full House first.' };

  const now = ctx.now();
  if (now < entry.lockedUntil) {
    ctx.emitTo(playerId, { type: 'claimsPaused', priv: true, untilMs: entry.lockedUntil - now });
    return { ok: false, reason: 'Claims paused.' };
  }
  if (now - entry.lastClaimAt < paceMs()) return { ok: false, reason: 'Wait a moment.' };
  entry.lastClaimAt = now;

  const isFull = pattern.rule.kind === 'full';
  if (isFull && entry.fullHouseTickets.has(action.ticket)) {
    return { ok: false, reason: 'That ticket already won a Full House.' };
  }

  const called = new Set(match.called);
  const mask = entry.marks[action.ticket] ?? 0;
  if (!evaluatePattern(pattern, ticket, mask, called)) {
    entry.bogusStreak++;
    ctx.emitTo(playerId, { type: 'bogus', priv: true, combo: combo.id });
    if (entry.bogusStreak >= BOGUS_STREAK_LIMIT) {
      entry.bogusStreak = 0;
      entry.lockedUntil = now + CLAIM_LOCK_MS;
      ctx.emitTo(playerId, { type: 'claimsPaused', priv: true, untilMs: CLAIM_LOCK_MS });
    }
    return { ok: true };
  }

  // Accepted.
  entry.bogusStreak = 0;
  combo.claimedBy = { playerId, name: entry.name, color: entry.color };
  combo.claimedAtCall = match.called.length;
  if (pattern.rule.kind === 'full') {
    entry.fullHouseTickets.add(action.ticket);
    const order = pattern.rule.order;
    const following = match.combos.find((c) => {
      const p = getPattern(c.id);
      return p?.rule.kind === 'full' && p.rule.order === order + 1;
    });
    if (following) following.locked = false;
  }
  publish(match, { type: 'claimed', combo: combo.id, by: combo.claimedBy, calledCount: match.called.length });
  ctx.notice(`${entry.name} won ${pattern.name}`);
  if (match.combos.every((c) => c.claimedBy)) finishMatch(match);
  return { ok: true };
}

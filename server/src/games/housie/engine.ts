import { AUTO_INTERVALS_MS, getPattern, type HousieAction, type HousieLobby, type Ticket } from '@myarena/shared';
import { logger } from '../../logger.js';
import { config } from '../../config.js';
import type { ActionResult, GameContext, GameEngine, MatchSeat } from '../registry.js';
import { handleClaim } from './claims.js';
import { buildDeck } from './deck.js';
import { applyLobbyAction, createDefaultLobby, lobbyView, onLobbyLeave, ticketsFor, validateLobbyStart } from './lobby.js';
import { callerView, cancelAuto, drawBall, finishMatch, playingCount, publish, scheduleAuto, viewFor } from './matchOps.js';
import type { Combo, Match, PlayerEntry } from './model.js';
import { createTicketIssuer, runTicketAuditFromEnv } from './tickets.js';

const NOT_HOST: ActionResult = { ok: false, reason: 'Only the host can do that.' };

const DEV_VARS = ['HOUSIE_DEV_DECK', 'HOUSIE_DEV_BALLS', 'HOUSIE_DEV_TICKET_AUDIT', 'HOUSIE_CLAIM_PACE_MS'] as const;

/** Development controls are read only outside production; in production they are ignored with a startup warning. */
function warnIfDevControlsSet(): void {
  if (!config.isProd) return;
  const set = DEV_VARS.filter((name) => process.env[name]);
  if (set.length) logger.warn({ ignored: set }, 'Housie development controls are ignored in production');
}

function buildCombos(patterns: string[]): Combo[] {
  const chosen = new Set(patterns);
  return patterns.map((id) => {
    const rule = getPattern(id)?.rule;
    // Full House 2nd and 3rd wait for the previous one, but only when that one is in play.
    const locked =
      rule?.kind === 'full' &&
      rule.order > 1 &&
      [...chosen].some((other) => {
        const r = getPattern(other)?.rule;
        return r?.kind === 'full' && r.order === rule.order - 1;
      });
    return { id, locked: Boolean(locked) };
  });
}

function createMatch(seats: MatchSeat[], ctx: GameContext, lobbyArg?: unknown): Match {
  const lobby: HousieLobby = (lobbyArg as HousieLobby | undefined) ?? createDefaultLobby();
  const hostId = ctx.hostId();
  const issuer = createTicketIssuer();
  const players = new Map<string, PlayerEntry>();
  for (const seat of seats) {
    if (seat.kind !== 'human') continue;
    if (seat.playerId === hostId && !lobby.hostPlays) continue;
    const count = ticketsFor(lobby, seat.playerId);
    const tickets: Ticket[] = Array.from({ length: count }, () => issuer.issue());
    players.set(seat.playerId, {
      playerId: seat.playerId,
      name: seat.displayName,
      color: seat.color,
      tickets,
      marks: tickets.map(() => 0),
      lastClaimAt: 0,
      bogusStreak: 0,
      lockedUntil: 0,
      fullHouseTickets: new Set(),
      status: 'playing',
    });
  }
  const first = players.values().next().value as PlayerEntry | undefined;
  const auto = lobby.caller.mode === 'auto';
  const match: Match = {
    ctx,
    settings: { patterns: [...lobby.patterns], ceiling: lobby.ceiling },
    deck: buildDeck(first?.tickets[0] ?? null),
    called: [],
    caller: { mode: lobby.caller.mode, intervalMs: auto ? (lobby.caller.intervalMs ?? 8000) : 8000, paused: false },
    nextDrawAt: null,
    cancelAuto: null,
    players,
    combos: buildCombos(lobby.patterns),
    phase: 'running',
    seq: 0,
    lobby,
  };
  // Everyone gets their own snapshot (the host too, with no tickets when only calling).
  for (const seat of seats) {
    if (seat.kind === 'human') {
      ctx.emitTo(seat.playerId, { type: 'snapshot', priv: true, view: viewFor(match, seat.playerId, hostId) });
    }
  }
  scheduleAuto(match);
  return match;
}

function onAction(match: Match, playerId: string, action: HousieAction): ActionResult {
  if (match.phase === 'finished' && action.type !== 'marks') return { ok: false, reason: 'The match is over.' };
  const isHost = match.ctx.hostId() === playerId;
  switch (action.type) {
    case 'draw':
      if (!isHost) return NOT_HOST;
      return drawBall(match) ? { ok: true } : { ok: false, reason: 'All balls have been called.' };
    case 'auto': {
      if (!isHost) return NOT_HOST;
      if (!(AUTO_INTERVALS_MS as readonly number[]).includes(action.intervalMs)) {
        return { ok: false, reason: 'Choose 5, 8 or 10 seconds.' };
      }
      match.caller = { mode: 'auto', intervalMs: action.intervalMs, paused: false };
      scheduleAuto(match);
      publish(match, { type: 'caller', ...callerView(match) });
      return { ok: true };
    }
    case 'manual':
      if (!isHost) return NOT_HOST;
      match.caller = { ...match.caller, mode: 'manual', paused: false };
      cancelAuto(match);
      publish(match, { type: 'caller', ...callerView(match) });
      return { ok: true };
    case 'pause':
      if (!isHost) return NOT_HOST;
      if (match.caller.mode !== 'auto') return { ok: false, reason: 'Calling is manual.' };
      match.caller.paused = true;
      cancelAuto(match);
      publish(match, { type: 'caller', ...callerView(match) });
      return { ok: true };
    case 'resume':
      if (!isHost) return NOT_HOST;
      if (match.caller.mode !== 'auto') return { ok: false, reason: 'Calling is manual.' };
      match.caller.paused = false;
      scheduleAuto(match);
      publish(match, { type: 'caller', ...callerView(match) });
      return { ok: true };
    case 'marks': {
      const entry = match.players.get(playerId);
      if (!entry || entry.status !== 'playing') return { ok: false, reason: 'You are not playing in this match.' };
      for (const change of action.changes) {
        const ticket = entry.tickets[change.t];
        if (!ticket) continue;
        const row = Math.floor(change.c / 9);
        const col = change.c % 9;
        if ((ticket[row]?.[col] ?? 0) === 0) continue; // empty cells cannot be marked
        const bit = 1 << change.c;
        const current = entry.marks[change.t] ?? 0;
        entry.marks[change.t] = change.on ? current | bit : current & ~bit;
      }
      return { ok: true };
    }
    case 'claim':
      return handleClaim(match, playerId, action);
    default:
      return { ok: false, reason: 'Not available during the match.' };
  }
}

function onSeatReleased(match: Match, playerId: string): void {
  const entry = match.players.get(playerId);
  if (!entry || entry.status === 'left') return;
  entry.status = 'left';
  entry.marks = entry.tickets.map(() => 0);
  if (match.phase !== 'running') return;
  publish(match, { type: 'playerLeft', playerId });
  if (playingCount(match) === 0) finishMatch(match);
}

/** Housie server engine: lobby channel, tickets, deck and caller, marks, and claims (specs/003-housie-tambola-module). */
export function createHousieEngine(): GameEngine {
  warnIfDevControlsSet();
  runTicketAuditFromEnv((fields, message) => logger.info(fields, message));
  return {
    id: 'housie',
    createLobby: () => createDefaultLobby(),
    lobbyView: (lobby) => lobbyView(lobby as HousieLobby),
    onLobbyAction: (lobby, who, action) => applyLobbyAction(lobby as HousieLobby, who, action as HousieAction),
    onLobbyLeave: (lobby, playerId) => onLobbyLeave(lobby as HousieLobby, playerId),
    validateStart: (lobby, seated) => validateLobbyStart(lobby as HousieLobby, seated),
    createMatch: (seats, ctx, lobby) => createMatch(seats, ctx, lobby),
    getView: (match, playerId) => {
      const m = match as Match;
      return viewFor(m, playerId, m.ctx.hostId());
    },
    onAction: (match, playerId, action) => onAction(match as Match, playerId, action as HousieAction),
    onSeatReleased: (match, playerId) => onSeatReleased(match as Match, playerId),
    onBotTurn: () => undefined,
    dispose: (match) => cancelAuto(match as Match),
  };
}

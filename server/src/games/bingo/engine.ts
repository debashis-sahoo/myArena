import {
  AUTO_INTERVALS_MS,
  BINGO_BALLS,
  BINGO_CARD_CEILING_MAX,
  BINGO_FREE_INDEX,
  type BingoAction,
  type BingoLobby,
} from '@myarena/shared';
import { logger } from '../../logger.js';
import { config } from '../../config.js';
import type { ActionResult, GameContext, GameEngine, MatchSeat } from '../registry.js';
import { createCardIssuer, runCardAuditFromEnv } from './cards.js';
import { handleClaim } from './claims.js';
import { buildDeck } from './deck.js';
import { applyLobbyAction, cardsFor, createDefaultLobby, lobbyView, onLobbyLeave, validateLobbyStart } from './lobby.js';
import { callerView, cancelAuto, drawBall, finishMatch, inCatalogueOrder, playingCount, publish, scheduleAuto, viewFor } from './matchOps.js';
import type { Match, PlayerEntry } from './model.js';

const NOT_HOST: ActionResult = { ok: false, reason: 'Only the host can do that.' };
const DEFAULT_AUTO_MS = 8000;

const DEV_VARS = ['BINGO_DEV_DECK', 'BINGO_DEV_BALLS', 'BINGO_DEV_CARD_AUDIT', 'BINGO_CLAIM_PACE_MS'] as const;

/** Development controls are read only outside production; in production they are ignored with a startup warning. */
function warnIfDevControlsSet(): void {
  if (!config.isProd) return;
  const set = DEV_VARS.filter((name) => process.env[name]);
  if (set.length) logger.warn({ ignored: set }, 'Bingo development controls are ignored in production');
}

function createMatch(seats: MatchSeat[], ctx: GameContext, lobbyArg?: unknown): Match {
  const lobby: BingoLobby = (lobbyArg as BingoLobby | undefined) ?? createDefaultLobby();
  const ceiling = Math.min(Math.max(lobby.ceiling, 1), BINGO_CARD_CEILING_MAX);
  const frozen: BingoLobby = { ...lobby, ceiling };
  const hostId = ctx.hostId();
  const issuer = createCardIssuer();
  const players = new Map<string, PlayerEntry>();
  for (const seat of seats) {
    if (seat.kind !== 'human') continue;
    if (seat.playerId === hostId && !lobby.hostPlays) continue;
    const count = cardsFor(frozen, seat.playerId);
    const cards = Array.from({ length: count }, () => issuer.issue());
    players.set(seat.playerId, {
      playerId: seat.playerId,
      name: seat.displayName,
      color: seat.color,
      cards,
      daubs: cards.map(() => 0),
      freeTapped: cards.map(() => false),
      lastClaimAt: 0,
      bogusStreak: 0,
      lockedUntil: 0,
      status: 'playing',
    });
  }
  const first = players.values().next().value as PlayerEntry | undefined;
  const auto = lobby.caller.mode === 'auto';
  const patternIds = inCatalogueOrder(lobby.patterns);
  const match: Match = {
    ctx,
    settings: { patterns: patternIds, ceiling },
    deck: buildDeck(first?.cards[0] ?? null),
    called: [],
    caller: { mode: lobby.caller.mode, intervalMs: auto ? (lobby.caller.intervalMs ?? DEFAULT_AUTO_MS) : DEFAULT_AUTO_MS, paused: false },
    nextDrawAt: null,
    cancelAuto: null,
    players,
    patterns: patternIds.map((id) => ({ id })),
    phase: 'running',
    seq: 0,
    lobby: frozen,
  };
  // Everyone gets their own snapshot (the host too, with no cards when only calling).
  for (const seat of seats) {
    if (seat.kind === 'human') {
      ctx.emitTo(seat.playerId, { type: 'snapshot', priv: true, view: viewFor(match, seat.playerId, hostId) });
    }
  }
  scheduleAuto(match);
  return match;
}

function onAction(match: Match, playerId: string, action: BingoAction): ActionResult {
  const isHost = match.ctx.hostId() === playerId;
  if (match.phase === 'finished') {
    if (action.type === 'draw' && isHost && match.called.length >= BINGO_BALLS) {
      return { ok: false, reason: 'All balls have been called.' };
    }
    return { ok: false, reason: 'The match is over.' };
  }
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
    case 'daubs': {
      const entry = match.players.get(playerId);
      if (!entry || entry.status !== 'playing') return { ok: false, reason: 'You are not playing in this match.' };
      for (const change of action.changes) {
        if (!entry.cards[change.card]) continue;
        if (!Number.isInteger(change.cell) || change.cell < 0 || change.cell > 24) continue;
        const bit = 1 << change.cell;
        const current = entry.daubs[change.card] ?? 0;
        entry.daubs[change.card] = change.on ? current | bit : current & ~bit;
        if (change.cell === BINGO_FREE_INDEX) entry.freeTapped[change.card] = true;
      }
      return { ok: true };
    }
    case 'bingo':
      return handleClaim(match, playerId, action);
    default:
      return { ok: false, reason: 'Not available during the match.' };
  }
}

function onSeatReleased(match: Match, playerId: string): void {
  const entry = match.players.get(playerId);
  if (!entry || entry.status === 'left') return;
  entry.status = 'left';
  entry.daubs = entry.cards.map(() => 0);
  if (match.phase !== 'running') return;
  publish(match, { type: 'playerLeft', playerId });
  if (playingCount(match) === 0) finishMatch(match);
}

/** Bingo server engine: lobby channel, cards, deck and caller, daubs and claims (specs/005-bingo-75-ball-module). */
export function createBingoEngine(): GameEngine {
  warnIfDevControlsSet();
  runCardAuditFromEnv((fields, message) => logger.info(fields, message));
  return {
    id: 'bingo',
    createLobby: () => createDefaultLobby(),
    lobbyView: (lobby) => lobbyView(lobby as BingoLobby),
    onLobbyAction: (lobby, who, action) => applyLobbyAction(lobby as BingoLobby, who, action as BingoAction),
    onLobbyLeave: (lobby, playerId) => onLobbyLeave(lobby as BingoLobby, playerId),
    validateStart: (lobby, seated) => validateLobbyStart(lobby as BingoLobby, seated),
    createMatch: (seats, ctx, lobby) => createMatch(seats, ctx, lobby),
    getView: (match, playerId) => {
      const m = match as Match;
      return viewFor(m, playerId, m.ctx.hostId());
    },
    onAction: (match, playerId, action) => onAction(match as Match, playerId, action as BingoAction),
    onSeatReleased: (match, playerId) => onSeatReleased(match as Match, playerId),
    onBotTurn: () => undefined,
    dispose: (match) => cancelAuto(match as Match),
  };
}

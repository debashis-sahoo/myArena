import { BINGO_BALLS, BINGO_PATTERNS, type BingoPatternState, type BingoResultEntry, type BingoView, type CallerState } from '@myarena/shared';
import type { Match, PlayerEntry } from './model.js';

/** Emits one public event with the next sequence number. */
export function publish<T extends { type: string }>(match: Match, event: T): void {
  match.seq++;
  match.ctx.emit({ ...event, seq: match.seq });
}

export function playingCount(match: Match): number {
  let n = 0;
  for (const p of match.players.values()) if (p.status === 'playing') n++;
  return n;
}

export function nextInMs(match: Match): number | undefined {
  if (match.caller.mode !== 'auto' || match.caller.paused || match.nextDrawAt === null) return undefined;
  return Math.max(0, match.nextDrawAt - match.ctx.now());
}

export function callerView(match: Match): CallerState {
  const next = nextInMs(match);
  return {
    mode: match.caller.mode,
    intervalMs: match.caller.intervalMs,
    paused: match.caller.paused,
    ...(next !== undefined ? { nextInMs: next } : {}),
  };
}

export function patternViews(match: Match): BingoPatternState[] {
  return match.patterns.map((p) => ({
    id: p.id,
    status: p.claimedBy ? 'claimed' : 'open',
    ...(p.claimedBy ? { claimedBy: p.claimedBy, claimedAtCall: p.claimedAtCall ?? 0 } : {}),
  }));
}

export function cancelAuto(match: Match): void {
  match.cancelAuto?.();
  match.cancelAuto = null;
  match.nextDrawAt = null;
}

/** (Re)starts the automatic calling timer when auto is on and not paused. */
export function scheduleAuto(match: Match): void {
  cancelAuto(match);
  if (match.phase !== 'running' || match.caller.mode !== 'auto' || match.caller.paused) return;
  const { intervalMs } = match.caller;
  match.nextDrawAt = match.ctx.now() + intervalMs;
  match.cancelAuto = match.ctx.schedule(intervalMs, () => {
    match.cancelAuto = null;
    drawBall(match);
  });
}

/** Draws the next ball from the private deck. Returns false when nothing could be drawn. */
export function drawBall(match: Match): boolean {
  if (match.phase !== 'running' || match.called.length >= BINGO_BALLS) return false;
  const n = match.deck[match.called.length];
  if (n === undefined) return false;
  match.called.push(n);
  const last = match.called.length >= BINGO_BALLS;
  if (last) cancelAuto(match);
  else scheduleAuto(match);
  const next = nextInMs(match);
  publish(match, { type: 'ball', n, index: match.called.length, ...(next !== undefined ? { nextInMs: next } : {}) });
  if (last) finishMatch(match);
  return true;
}

export function finishMatch(match: Match): void {
  if (match.phase === 'finished') return;
  match.phase = 'finished';
  cancelAuto(match);
  const results: BingoResultEntry[] = match.patterns.map((p) => ({ pattern: p.id, ...(p.claimedBy ? { winner: p.claimedBy } : {}) }));
  match.results = results;
  publish(match, { type: 'finished', results, calledCount: match.called.length });
}

/** Chosen pattern ids in catalogue order. */
export function inCatalogueOrder(ids: readonly string[]): string[] {
  const chosen = new Set(ids);
  return BINGO_PATTERNS.filter((p) => chosen.has(p.id)).map((p) => p.id);
}

/** The receiver's own view: cards and daubs are theirs only; the deck is never included. */
export function viewFor(match: Match, playerId: string, hostId: string): BingoView {
  const entry: PlayerEntry | undefined = match.players.get(playerId);
  const playing = entry?.status === 'playing';
  const lockedMs = entry ? entry.lockedUntil - match.ctx.now() : 0;
  return {
    seq: match.seq,
    phase: match.phase,
    settings: { patterns: [...match.settings.patterns], ceiling: match.settings.ceiling },
    called: [...match.called],
    caller: callerView(match),
    patterns: patternViews(match),
    you: {
      playing,
      cards: playing && entry ? entry.cards.map((c) => [...c]) : [],
      daubs: playing && entry ? [...entry.daubs] : [],
      ...(lockedMs > 0 ? { claimsLockedMs: lockedMs } : {}),
    },
    hostId,
    playing: playingCount(match),
    ...(match.results ? { results: match.results } : {}),
  };
}

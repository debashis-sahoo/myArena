import type { ComboState, HousieView, ResultEntry } from '@myarena/shared';
import type { Match, PlayerEntry } from './model.js';

/** Emits one public event with the next sequence number. */
export function publish<T extends { type: string }>(match: Match, event: T): void {
  match.seq++;
  match.ctx.emit({ ...event, seq: match.seq });
}

export function nextInMs(match: Match): number | undefined {
  if (match.caller.mode !== 'auto' || match.caller.paused || match.nextDrawAt === null) return undefined;
  return Math.max(0, match.nextDrawAt - match.ctx.now());
}

export function callerView(match: Match): HousieView['caller'] {
  const next = nextInMs(match);
  return { mode: match.caller.mode, intervalMs: match.caller.intervalMs, paused: match.caller.paused, ...(next !== undefined ? { nextInMs: next } : {}) };
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
  if (match.phase !== 'running' || match.called.length >= 90) return false;
  const n = match.deck[match.called.length];
  if (n === undefined) return false;
  match.called.push(n);
  scheduleAuto(match);
  const next = nextInMs(match);
  publish(match, { type: 'ball', n, index: match.called.length, ...(next !== undefined ? { nextInMs: next } : {}) });
  if (match.called.length >= 90) finishMatch(match);
  return true;
}

export function finishMatch(match: Match): void {
  if (match.phase === 'finished') return;
  match.phase = 'finished';
  cancelAuto(match);
  const results: ResultEntry[] = match.combos.map((c) => ({ combo: c.id, ...(c.claimedBy ? { winner: c.claimedBy } : {}) }));
  match.results = results;
  publish(match, { type: 'finished', results, calledCount: match.called.length });
}

export function comboViews(match: Match): ComboState[] {
  return match.combos.map((c) => ({
    id: c.id,
    status: c.claimedBy ? 'claimed' : 'open',
    ...(c.claimedBy ? { claimedBy: c.claimedBy, claimedAtCall: c.claimedAtCall ?? 0 } : {}),
    ...(c.locked ? { locked: true } : {}),
  }));
}

export function playingCount(match: Match): number {
  let n = 0;
  for (const p of match.players.values()) if (p.status === 'playing') n++;
  return n;
}

/** The receiver's own view: tickets and marks are theirs only. */
export function viewFor(match: Match, playerId: string, hostId: string): HousieView {
  const entry: PlayerEntry | undefined = match.players.get(playerId);
  const playing = entry?.status === 'playing';
  const lockedMs = entry ? entry.lockedUntil - match.ctx.now() : 0;
  return {
    seq: match.seq,
    phase: match.phase,
    settings: { patterns: [...match.settings.patterns], ceiling: match.settings.ceiling },
    called: [...match.called],
    caller: callerView(match),
    combos: comboViews(match),
    you: {
      playing,
      tickets: playing && entry ? entry.tickets.map((t) => t.map((r) => [...r])) : [],
      marks: playing && entry ? [...entry.marks] : [],
      ...(lockedMs > 0 ? { claimsLockedMs: lockedMs } : {}),
    },
    hostId,
    playing: playingCount(match),
    ...(match.results ? { results: match.results } : {}),
  };
}

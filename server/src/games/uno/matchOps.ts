import {
  UNO_AWAY_RELEASE_AT,
  UNO_AWAY_WARN_AT,
  UNO_CATCH_PENALTY,
  UNO_CATCH_WINDOW_MS,
  UNO_COLORS,
  UNO_PENALTY_BEAT_MS,
  UNO_SETTLE_DEAL_MS,
  UNO_SETTLE_EFFECT_MS,
  UNO_SETTLE_PLAY_MS,
  UNO_TURN_TIMER_MS,
  unoCardOf,
  unoDrawSettleMs,
  type UnoCatchCloseReason,
  type UnoColor,
  type UnoDrawReason,
  type UnoEventInput,
  type UnoStanding,
  type UnoTable,
  type UnoView,
  type UnoYou,
} from '@myarena/shared';
import type { ActionResult } from '../registry.js';
import { botPauseMs, catchDelayMs, decide, shouldCallUno, type BotView } from './bot.js';
import { dealMatch, devTurnMs, reshuffle, shuffle } from './deck.js';
import type { CatchWindow, Match, Seat } from './model.js';
import {
  applyEffect,
  canPlay,
  canStack,
  dealerOf,
  matches,
  nextActive,
  playable,
  standingsOf,
  startCardEffect,
  type RuleTable,
} from './rules.js';

export interface UnoMatch extends Match {
  /** The one pending turn-flow timer: settle, countdown, bot pause or penalty beat. */
  flow: (() => void) | null;
  winner: string | null;
  standings: UnoStanding[] | null;
}

const OK: ActionResult = { ok: true };
const refuse = (reason: string): ActionResult => ({ ok: false, reason });

function seatOf(m: UnoMatch, playerId: string): Seat | undefined {
  return m.seats.find((s) => s.playerId === playerId);
}

function topOf(m: UnoMatch): number {
  return m.discard[m.discard.length - 1] as number;
}

function ruleTable(m: UnoMatch): RuleTable {
  return {
    top: topOf(m),
    activeColor: m.activeColor,
    pending: m.pending,
    phase: m.phase,
    drawn: m.drawn?.card ?? null,
    direction: m.direction,
  };
}

/** Any accepted action by a seat resets its missed-turn count and warning. */
function touch(seat: Seat): void {
  seat.missed = 0;
  seat.warned = false;
}

// ---------- views and events ----------

export function tableOf(m: UnoMatch): UnoTable {
  const now = m.ctx.now();
  const counting = (m.phase === 'turn' || m.phase === 'drawn') && m.deadline !== null;
  return {
    matchNo: m.matchNo,
    phase: m.phase,
    turn: m.turn,
    direction: m.direction,
    activeColor: m.activeColor,
    top: topOf(m),
    drawCount: m.drawPile.length,
    discardCount: m.discard.length,
    pending: m.pending ? { ...m.pending } : null,
    catchWindow: m.catchWindow ? { victim: m.catchWindow.victim, remainingMs: Math.max(0, m.catchWindow.closesAt - now) } : null,
    remainingMs: counting && m.deadline !== null ? Math.max(0, m.deadline - now) : null,
    thinking: m.thinking,
    players: m.seats.map((s) => ({
      playerId: s.playerId,
      slot: s.slot,
      name: s.name,
      kind: s.kind,
      status: s.status,
      handCount: s.hand.length,
      calledUno: s.calledUno,
      warned: s.warned,
    })),
    winner: m.winner,
    standings: m.standings ? m.standings.map((s) => ({ ...s })) : null,
  };
}

export function youOf(m: UnoMatch, seat: Seat): UnoYou {
  const mine = m.turn === seat.playerId;
  const live = m.phase === 'turn' || m.phase === 'drawn';
  const drawn = m.drawn?.playerId === seat.playerId ? m.drawn.card : null;
  return {
    playerId: seat.playerId,
    hand: [...seat.hand],
    playable: mine && live ? playable(ruleTable(m), seat.hand) : [],
    drawn,
    canDraw: mine && m.phase === 'turn',
    canKeep: mine && m.phase === 'drawn' && drawn !== null,
    canCallUno: m.phase !== 'finished' && (seat.hand.length === 2 || m.catchWindow?.victim === seat.playerId),
    unoCalled: seat.calledUno,
  };
}

/** The receiver's snapshot for create, join and resume acknowledgements. */
export function viewFor(m: UnoMatch, playerId: string): UnoView {
  const seat = m.seats.find((s) => s.playerId === playerId && s.status === 'active');
  return { seq: m.seq, table: tableOf(m), you: seat ? youOf(m, seat) : null };
}

/** One event per human, built for that person; `draw.cards` is in the drawer's copy only. */
export function publish(m: UnoMatch, input: UnoEventInput): void {
  m.seq += 1;
  const table = tableOf(m);
  for (const seat of m.seats) {
    if (seat.kind !== 'human' || seat.status !== 'active') continue;
    let shown: UnoEventInput = input;
    if (input.type === 'draw' && input.by !== seat.playerId && input.cards) {
      const { cards: _hidden, ...rest } = input;
      shown = rest;
    }
    m.ctx.emitTo(seat.playerId, { ...shown, seq: m.seq, table, you: youOf(m, seat) });
  }
}

// ---------- timers ----------

export function later(m: UnoMatch, ms: number, fn: () => void): () => void {
  const cancel = m.ctx.schedule(ms, () => {
    m.timers.delete(cancel);
    if (!m.disposed) fn();
  });
  m.timers.add(cancel);
  return cancel;
}

function stop(m: UnoMatch, cancel: () => void): void {
  cancel();
  m.timers.delete(cancel);
}

function stopFlow(m: UnoMatch): void {
  if (m.flow) stop(m, m.flow);
  m.flow = null;
}

function flowLater(m: UnoMatch, ms: number, fn: () => void): void {
  stopFlow(m);
  const cancel = later(m, ms, () => {
    if (m.flow === cancel) m.flow = null;
    fn();
  });
  m.flow = cancel;
}

export function cancelAll(m: UnoMatch): void {
  m.flow = null;
  for (const cancel of [...m.timers]) cancel();
  m.timers.clear();
  m.catchWindow = null;
}

// ---------- cards ----------

/** Takes up to `count` cards; an empty Draw Pile is rebuilt from the Discard Pile except its top card (FR-018). */
function take(m: UnoMatch, count: number): { cards: number[]; reshuffled: boolean } {
  const cards: number[] = [];
  let reshuffled = false;
  while (cards.length < count) {
    if (m.drawPile.length === 0) {
      if (m.discard.length <= 1) break;
      const next = reshuffle(m.discard);
      m.drawPile = next.drawPile;
      m.discard = next.discard;
      reshuffled = true;
    }
    const card = m.drawPile.pop();
    if (card === undefined) break;
    cards.push(card);
  }
  return { cards, reshuffled };
}

interface Received {
  cards: number[];
  reshuffled: boolean;
  /** Victim of a catch window that closed because this hand grew. */
  closed: string | null;
}

function receive(m: UnoMatch, seat: Seat, count: number): Received {
  const taken = take(m, count);
  seat.hand.push(...taken.cards);
  if (seat.hand.length > 2) seat.calledUno = false;
  const closed = taken.cards.length > 0 && m.catchWindow?.victim === seat.playerId ? dropCatch(m) : null;
  return { ...taken, closed };
}

function announceDraw(m: UnoMatch, seat: Seat, why: UnoDrawReason, got: Received): void {
  publish(m, { type: 'draw', by: seat.playerId, count: got.cards.length, why, reshuffled: got.reshuffled, cards: [...got.cards] });
  if (got.closed) publish(m, { type: 'catchClosed', victim: got.closed, reason: 'hand_changed' });
}

// ---------- catch window ----------

function dropCatch(m: UnoMatch): string | null {
  const w = m.catchWindow;
  if (!w) return null;
  w.cancel();
  m.catchWindow = null;
  return w.victim;
}

function closeCatch(m: UnoMatch, reason: UnoCatchCloseReason): void {
  const victim = dropCatch(m);
  if (victim) publish(m, { type: 'catchClosed', victim, reason });
}

function openCatch(m: UnoMatch, seat: Seat): void {
  const previous = dropCatch(m);
  if (previous) publish(m, { type: 'catchClosed', victim: previous, reason: 'expired' });
  const cancels: (() => void)[] = [];
  const w: CatchWindow = {
    victim: seat.playerId,
    closesAt: m.ctx.now() + UNO_CATCH_WINDOW_MS,
    cancel: () => {
      for (const cancel of cancels) stop(m, cancel);
    },
  };
  cancels.push(later(m, UNO_CATCH_WINDOW_MS, () => (m.catchWindow === w ? closeCatch(m, 'expired') : undefined)));
  if (seat.kind === 'human') {
    for (const bot of m.seats) {
      if (bot.kind !== 'bot' || bot.status !== 'active') continue;
      cancels.push(later(m, catchDelayMs(), () => (m.catchWindow === w ? void catchPlayer(m, bot.playerId, w.victim) : undefined)));
    }
  }
  m.catchWindow = w;
  publish(m, { type: 'catchOpen', victim: seat.playerId, windowMs: UNO_CATCH_WINDOW_MS });
}

// ---------- deal and turn flow ----------

export function deal(m: UnoMatch): void {
  cancelAll(m);
  m.seq = 0;
  const count = m.seats.length;
  const dealt = dealMatch(count, (m.matchNo - 1) % count);
  m.dealer = dealerOf(m.seats, m.matchNo);
  m.seats.forEach((seat, i) => {
    seat.hand = dealt.hands[i] ?? [];
    seat.calledUno = false;
    touch(seat);
  });
  m.drawPile = dealt.drawPile;
  m.discard = dealt.discard;
  const start = startCardEffect(dealt.start, m.seats, m.dealer);
  m.direction = start.direction;
  m.activeColor = start.activeColor;
  m.pending = null;
  m.drawn = null;
  m.thinking = null;
  m.deadline = null;
  m.winner = null;
  m.standings = null;
  m.phase = 'settling';
  m.turn = m.seats[start.first]?.playerId ?? null;
  publish(m, { type: 'deal', dealer: m.seats[m.dealer]?.playerId ?? '' });

  let settle = UNO_SETTLE_DEAL_MS;
  const target = start.draw ? m.seats[start.draw.seat] : undefined;
  if (start.draw && target) {
    const got = receive(m, target, start.draw.count);
    announceDraw(m, target, 'start', got);
    settle += unoDrawSettleMs(got.cards.length);
  }
  flowLater(m, settle, () => startTurn(m));
}

export function startTurn(m: UnoMatch): void {
  if (m.phase === 'finished') return;
  const seat = m.turn === null ? undefined : seatOf(m, m.turn);
  if (!seat || seat.status !== 'active') return;
  const id = seat.playerId;
  m.phase = 'turn';
  m.drawn = null;

  if (seat.kind === 'bot') {
    m.deadline = null;
    m.thinking = id;
    publish(m, { type: 'turn', player: id });
    flowLater(m, botPauseMs(), () => botAct(m, id));
    return;
  }
  m.thinking = null;
  if (m.pending && !canStack(ruleTable(m), seat.hand)) {
    m.deadline = null;
    publish(m, { type: 'turn', player: id });
    flowLater(m, UNO_PENALTY_BEAT_MS, () => {
      if (m.turn === id && m.phase === 'turn' && m.pending) drawPending(m, seat, 'pending');
    });
    return;
  }
  const ms = devTurnMs() ?? UNO_TURN_TIMER_MS;
  m.deadline = m.ctx.now() + ms;
  publish(m, { type: 'turn', player: id });
  flowLater(m, ms, () => onTimeout(m, id));
}

/** Passes the turn from `fromId` by `advance` active seats and starts the next turn after `settleMs`. */
function handOff(m: UnoMatch, fromId: string, advance: number, settleMs: number): void {
  m.phase = 'settling';
  m.deadline = null;
  m.thinking = null;
  const from = m.seats.findIndex((s) => s.playerId === fromId);
  m.turn = m.seats[nextActive(m.seats, from, m.direction, advance)]?.playerId ?? null;
  flowLater(m, settleMs, () => startTurn(m));
}

/** Takes the whole pending total for `seat` and passes the turn. */
function drawPending(m: UnoMatch, seat: Seat, why: UnoDrawReason): void {
  const total = m.pending?.total ?? 0;
  m.pending = null;
  const got = receive(m, seat, total);
  handOff(m, seat.playerId, 1, unoDrawSettleMs(got.cards.length));
  announceDraw(m, seat, why, got);
}

export function finish(m: UnoMatch, winner: string, forfeit: boolean): void {
  stopFlow(m);
  m.phase = 'finished';
  m.turn = null;
  m.pending = null;
  m.drawn = null;
  m.thinking = null;
  m.deadline = null;
  m.winner = winner;
  m.standings = standingsOf(m.seats, winner);
  const victim = dropCatch(m);
  for (const cancel of [...m.timers]) cancel();
  m.timers.clear();
  if (victim) publish(m, { type: 'catchClosed', victim, reason: 'finished' });
  publish(m, { type: 'finished', winner, forfeit });
  m.ctx.log('info', { matchNo: m.matchNo, forfeit, players: m.seats.length }, 'uno match finished');
}

export function dispose(m: UnoMatch): void {
  m.disposed = true;
  cancelAll(m);
}

// ---------- actions (people and bots share these) ----------

function turnGate(m: UnoMatch, playerId: string): ActionResult | null {
  if (m.phase === 'finished') return refuse('The match is over.');
  if (m.turn !== playerId) return refuse('It is not your turn.');
  if (m.phase === 'settling') return refuse('Please wait a moment.');
  return null;
}

export function playCard(m: UnoMatch, playerId: string, card: number, color?: UnoColor): ActionResult {
  const blocked = turnGate(m, playerId);
  if (blocked) return blocked;
  const seat = seatOf(m, playerId);
  if (!seat) return refuse('It is not your turn.');
  const at = seat.hand.indexOf(card);
  if (at < 0) return refuse('You do not have that card.');
  if (m.phase === 'drawn' && m.drawn?.card !== card) return refuse('Play the card you drew, or keep it.');
  if (m.pending && unoCardOf(card).kind !== m.pending.kind) return refuse('Play a matching draw card or draw the cards.');
  const rule = ruleTable(m);
  if (!canPlay(rule, card)) return refuse('That card does not match.');
  const wild = unoCardOf(card).color === null;
  if (wild ? color === undefined || !UNO_COLORS.includes(color) : color !== undefined) {
    return refuse('Choose a colour for the Wild card.');
  }

  touch(seat);
  stopFlow(m);
  m.thinking = null;
  m.deadline = null;
  m.drawn = null;
  seat.hand.splice(at, 1);
  m.discard.push(card);
  const effect = applyEffect(rule, m.seats, m.seats.indexOf(seat), card, color ?? null);

  if (seat.hand.length === 0) {
    // The last card wins at once; its effects are not applied (FR-020).
    m.activeColor = effect.activeColor;
    m.pending = null;
    m.phase = 'settling';
    publish(m, { type: 'play', by: playerId, card, color: effect.activeColor, effect: 'none' });
    finish(m, playerId, false);
    return OK;
  }

  const stacked = m.pending !== null && effect.pending !== null;
  m.activeColor = effect.activeColor;
  m.direction = effect.direction;
  m.pending = effect.pending;
  handOff(m, playerId, effect.advance, effect.effect === 'none' ? UNO_SETTLE_PLAY_MS : UNO_SETTLE_EFFECT_MS);
  publish(m, {
    type: 'play',
    by: playerId,
    card,
    color: effect.activeColor,
    effect: effect.effect,
    ...(effect.skipped ? { skipped: effect.skipped } : {}),
    ...(stacked ? { stacked: true } : {}),
  });
  if (seat.hand.length === 1 && !seat.calledUno) openCatch(m, seat);
  return OK;
}

export function drawCard(m: UnoMatch, playerId: string): ActionResult {
  const blocked = turnGate(m, playerId);
  if (blocked) return blocked;
  const seat = seatOf(m, playerId);
  if (!seat) return refuse('It is not your turn.');
  if (m.phase === 'drawn') return refuse('You already drew a card this turn.');

  touch(seat);
  if (m.pending) {
    drawPending(m, seat, 'pending');
    return OK;
  }
  const got = receive(m, seat, 1);
  const card = got.cards[0];
  if (card !== undefined && matches(card, topOf(m), m.activeColor)) {
    // The countdown keeps running; a bot shows its thinking cue again.
    m.phase = 'drawn';
    m.drawn = { playerId, card };
    m.thinking = seat.kind === 'bot' ? playerId : null;
    announceDraw(m, seat, 'turn', got);
    return OK;
  }
  handOff(m, playerId, 1, unoDrawSettleMs(got.cards.length));
  announceDraw(m, seat, 'turn', got);
  return OK;
}

export function keepCard(m: UnoMatch, playerId: string): ActionResult {
  const blocked = turnGate(m, playerId);
  if (blocked) return blocked;
  const seat = seatOf(m, playerId);
  if (!seat || m.phase !== 'drawn' || m.drawn?.playerId !== playerId) return refuse('It is not your turn.');
  touch(seat);
  m.drawn = null;
  handOff(m, playerId, 1, UNO_SETTLE_PLAY_MS);
  publish(m, { type: 'keep', by: playerId });
  return OK;
}

export function callUno(m: UnoMatch, playerId: string): ActionResult {
  if (m.phase === 'finished') return refuse('The match is over.');
  const seat = seatOf(m, playerId);
  if (!seat || seat.status !== 'active') return refuse('You are not in this match.');
  const against = m.catchWindow?.victim === playerId;
  if (seat.hand.length !== 2 && !against) return refuse('Not yet. UNO! is for when you have two cards.');
  touch(seat);
  if (seat.calledUno && !against) return OK;
  seat.calledUno = true;
  publish(m, { type: 'uno', by: playerId });
  if (against) closeCatch(m, 'called');
  return OK;
}

export function catchPlayer(m: UnoMatch, byId: string, victimId: string): ActionResult {
  if (m.phase === 'finished') return refuse('The match is over.');
  const by = seatOf(m, byId);
  if (!by || by.status !== 'active') return refuse('You are not in this match.');
  if (byId === victimId) return refuse('You cannot catch yourself.');
  const victim = seatOf(m, victimId);
  if (!victim || m.catchWindow?.victim !== victimId) return refuse('Too late.');

  touch(by);
  dropCatch(m);
  victim.calledUno = false;
  publish(m, { type: 'caught', victim: victimId, by: byId });
  const got = receive(m, victim, UNO_CATCH_PENALTY);
  announceDraw(m, victim, 'catch', got);
  publish(m, { type: 'catchClosed', victim: victimId, reason: 'caught' });
  return OK;
}

export function playAgain(m: UnoMatch, playerId: string): ActionResult {
  if (playerId !== m.ctx.hostId()) return refuse('Only the host can do that.');
  if (m.phase !== 'finished') return refuse('The match is not over.');
  if (m.seats.filter((s) => s.status === 'active').length < 2) return refuse('At least two players are needed.');
  m.seats = m.seats.filter((s) => s.status === 'active');
  m.matchNo += 1;
  m.releasing.clear();
  deal(m);
  return OK;
}

// ---------- countdown, bots and departures ----------

function onTimeout(m: UnoMatch, id: string): void {
  if (m.turn !== id || (m.phase !== 'turn' && m.phase !== 'drawn')) return;
  const seat = seatOf(m, id);
  if (!seat || seat.status !== 'active') return;
  m.deadline = null;

  if (m.phase === 'drawn') {
    // The player already acted this turn: keep the drawn card, no missed turn.
    m.drawn = null;
    handOff(m, id, 1, UNO_SETTLE_PLAY_MS);
    publish(m, { type: 'timeout', by: id, action: 'keep' });
    return;
  }

  seat.missed += 1;
  if (seat.missed >= UNO_AWAY_RELEASE_AT) {
    m.ctx.log('info', { slot: seat.slot }, 'uno seat released for inactivity');
    m.releasing.set(id, 'inactive');
    m.ctx.releaseSeat(id, 'inactive');
    return;
  }
  if (seat.missed === UNO_AWAY_WARN_AT) {
    seat.warned = true;
    m.ctx.log('info', { slot: seat.slot }, 'uno player warned for missed turns');
    publish(m, { type: 'warning', player: id });
  }
  publish(m, { type: 'timeout', by: id, action: 'draw' });
  if (m.pending) {
    drawPending(m, seat, 'pending');
    return;
  }
  const got = receive(m, seat, 1);
  handOff(m, id, 1, unoDrawSettleMs(got.cards.length));
  announceDraw(m, seat, 'timeout', got);
}

function botAct(m: UnoMatch, id: string): void {
  if (m.turn !== id || (m.phase !== 'turn' && m.phase !== 'drawn')) return;
  const seat = seatOf(m, id);
  if (!seat || seat.kind !== 'bot' || seat.status !== 'active') return;
  const view: BotView = { playerId: id, hand: seat.hand, drawn: m.drawn?.playerId === id ? m.drawn.card : null, table: tableOf(m) };
  const choice = decide(view);

  let result: ActionResult;
  if (choice.action === 'play') {
    if (seat.hand.length === 2 && !seat.calledUno && shouldCallUno()) callUno(m, id);
    result = playCard(m, id, choice.card, choice.color);
  } else if (choice.action === 'keep') {
    result = keepCard(m, id);
  } else {
    result = drawCard(m, id);
    if (result.ok && m.phase === 'drawn' && m.turn === id) {
      flowLater(m, botPauseMs(), () => botAct(m, id));
      return;
    }
  }
  if (result.ok) return;
  m.ctx.log('error', { choice, reason: result.reason }, 'uno bot action refused');
  if (m.phase === 'drawn') keepCard(m, id);
  else drawCard(m, id);
}

/** FR-051, FR-052: the seat leaves, its cards go back to the pile, the turn and any penalty move on. */
export function release(m: UnoMatch, playerId: string): void {
  const seat = seatOf(m, playerId);
  if (!seat || seat.status === 'left') return;
  const reason = m.releasing.get(playerId) ?? 'left';
  m.releasing.delete(playerId);
  seat.status = 'left';
  seat.calledUno = false;
  touch(seat);

  if (m.phase === 'finished') {
    publish(m, { type: 'released', player: playerId, reason });
    return;
  }
  const wasTurn = m.turn === playerId;
  if (seat.hand.length > 0) m.drawPile = shuffle([...m.drawPile, ...seat.hand]);
  seat.hand = [];
  const victim = m.catchWindow?.victim === playerId ? dropCatch(m) : null;
  const active = m.seats.filter((s) => s.status === 'active');

  if (wasTurn) {
    stopFlow(m);
    m.drawn = null;
    m.pending = null;
    m.phase = 'settling';
    m.deadline = null;
    m.thinking = null;
    m.turn = m.seats[nextActive(m.seats, m.seats.indexOf(seat), m.direction, 1)]?.playerId ?? null;
    if (active.length >= 2) flowLater(m, UNO_SETTLE_PLAY_MS, () => startTurn(m));
  }
  publish(m, { type: 'released', player: playerId, reason });
  if (victim) publish(m, { type: 'catchClosed', victim, reason: 'left' });
  const last = active[0];
  if (active.length === 1 && last) finish(m, last.playerId, true);
}

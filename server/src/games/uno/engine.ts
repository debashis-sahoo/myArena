import type { UnoAction } from '@myarena/shared';
import type { ActionResult, GameContext, GameEngine, MatchSeat } from '../registry.js';
import { warnIfDevControlsSet } from './deck.js';
import {
  callUno,
  catchPlayer,
  deal,
  dispose,
  drawCard,
  keepCard,
  playAgain,
  playCard,
  release,
  viewFor,
  type UnoMatch,
} from './matchOps.js';

function createMatch(seats: MatchSeat[], ctx: GameContext): UnoMatch {
  const m: UnoMatch = {
    ctx,
    seats: seats.map((seat, slot) => ({
      playerId: seat.playerId,
      name: seat.displayName,
      kind: seat.kind,
      slot,
      hand: [],
      status: 'active',
      calledUno: false,
      missed: 0,
      warned: false,
    })),
    matchNo: 1,
    dealer: 0,
    drawPile: [],
    discard: [],
    turn: null,
    direction: 1,
    activeColor: 'red',
    pending: null,
    phase: 'settling',
    drawn: null,
    catchWindow: null,
    deadline: null,
    thinking: null,
    seq: 0,
    timers: new Set(),
    releasing: new Map(),
    disposed: false,
    flow: null,
    winner: null,
    standings: null,
  };
  ctx.log('info', { players: seats.length, bots: seats.filter((s) => s.kind === 'bot').length }, 'uno match started');
  deal(m);
  return m;
}

function onAction(m: UnoMatch, playerId: string, action: UnoAction): ActionResult {
  if (m.phase === 'finished' && action.type !== 'playAgain') return { ok: false, reason: 'The match is over.' };
  switch (action.type) {
    case 'playCard':
      return playCard(m, playerId, action.card, action.color);
    case 'drawCard':
      return drawCard(m, playerId);
    case 'keepCard':
      return keepCard(m, playerId);
    case 'callUno':
      return callUno(m, playerId);
    case 'catchPlayer':
      return catchPlayer(m, playerId, action.player);
    case 'playAgain':
      return playAgain(m, playerId);
    default:
      return { ok: false, reason: 'Unknown action' };
  }
}

/** UNO server engine: rules, per-viewer events and bots (specs/006-uno-game-module). */
export function createUnoEngine(): GameEngine {
  warnIfDevControlsSet();
  return {
    id: 'uno',
    createMatch: (seats, ctx) => createMatch(seats, ctx),
    getView: (match, playerId) => viewFor(match as UnoMatch, playerId),
    onAction: (match, playerId, action) => onAction(match as UnoMatch, playerId, action as UnoAction),
    onSeatReleased: (match, playerId) => {
      const m = match as UnoMatch;
      if (!m.disposed) release(m, playerId);
    },
    onBotTurn: () => undefined,
    dispose: (match) => dispose(match as UnoMatch),
  };
}

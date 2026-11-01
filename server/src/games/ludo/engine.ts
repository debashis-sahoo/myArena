import {
  AWAY_RELEASE_AT,
  AWAY_WARN_AT,
  BASE_PROGRESS,
  BOT_PAUSE_MS,
  BOT_THINK_MS,
  HOME_CELEBRATE_MS,
  HOME_PROGRESS,
  NO_MOVE_PAUSE_MS,
  REMOVED_PROGRESS,
  ROLL_TUMBLE_MS,
  TURN_HANDOFF_MS,
  TURN_TIMER_MS,
  moveDurationMs,
  type ActivityEntry,
  type ActivityKind,
  type LudoColor,
  type LudoEvent,
  type LudoState,
} from '@myarena/shared';
import type { ActionResult, GameContext, GameEngine, MatchSeat } from '../registry.js';
import { chooseBotPawn, phrase, type Phrase } from './bot.js';
import { createDice, devTurnMs, endgameScenario, warnIfDevControlsSet, type Dice } from './dice.js';
import {
  applyMove,
  assignColors,
  createInitialState,
  eligiblePawns,
  nextActivePlayer,
  playerOf,
  standingsOf,
  winnerOf,
  chooseAutoPawn,
} from './rules.js';

const ACTIVITY_LIMIT = 100;

type DistributiveOmit<T> = T extends unknown ? Omit<T, 'seq' | 'state' | 'entry'> : never;
type EventInput = DistributiveOmit<LudoEvent>;

interface Match {
  ctx: GameContext;
  state: LudoState;
  names: Map<string, string>;
  dice: Dice;
  turnMs: number;
  humanCount: number;
  seq: number;
  nextEntryId: number;
  /** Absolute ctx.now() time at which the running countdown ends, or null. */
  deadline: number | null;
  cancel: (() => void) | null;
  missed: Map<string, number>;
  /** An action was auto-played in the current turn (counted once as a missed turn). */
  autoThisTurn: boolean;
  releasing: Map<string, 'inactive'>;
  disposed: boolean;
}

export function createLudoEngine(): GameEngine {
  warnIfDevControlsSet();

  function nameOf(m: Match, playerId: string): string {
    return m.names.get(playerId) ?? 'Player';
  }

  function colorOf(m: Match, playerId: string): LudoColor | undefined {
    return playerOf(m.state, playerId)?.color;
  }

  function snapshot(m: Match): LudoState {
    const copy = structuredClone(m.state);
    copy.remainingMs = m.deadline === null ? null : Math.max(0, m.deadline - m.ctx.now());
    return copy;
  }

  function entry(m: Match, kind: ActivityKind, text: string, playerId?: string): ActivityEntry {
    const e: ActivityEntry = {
      id: m.nextEntryId++,
      ts: m.ctx.now(),
      kind,
      text,
      ...(playerId ? { playerId, color: colorOf(m, playerId) } : {}),
    };
    m.state.activity.push(e);
    if (m.state.activity.length > ACTIVITY_LIMIT) m.state.activity.shift();
    return e;
  }

  function emit(m: Match, input: EventInput, e?: ActivityEntry): void {
    m.seq += 1;
    m.state.matchRev = m.seq;
    const event = { ...input, seq: m.seq, state: snapshot(m), ...(e ? { entry: e } : {}) } as LudoEvent;
    m.ctx.emit(event);
  }

  function later(m: Match, ms: number, fn: () => void): void {
    m.cancel?.();
    m.cancel = m.ctx.schedule(ms, () => {
      m.cancel = null;
      if (!m.disposed) fn();
    });
  }

  function stopTimer(m: Match): void {
    m.cancel?.();
    m.cancel = null;
    m.deadline = null;
  }

  function say(m: Match, playerId: string, kind: Phrase, victim?: string): void {
    const p = playerOf(m.state, playerId);
    if (!p || p.kind !== 'bot') return;
    m.ctx.say(playerId, phrase(kind, { n: nameOf(m, playerId), ...(victim ? { v: victim } : {}) }));
  }

  // ---------- turn flow ----------

  function startTurn(m: Match, reason: 'start' | 'next' | 'bonus'): void {
    const s = m.state;
    if (s.phase === 'finished' || !s.turn) return;
    const player = playerOf(s, s.turn);
    if (!player || player.status !== 'active') return;
    if (reason !== 'bonus') {
      s.sixStreak = 0;
      m.autoThisTurn = false;
    }
    s.phase = 'waiting_roll';
    s.roll = null;
    s.eligible = [];
    s.bonus = reason === 'bonus';
    const who = nameOf(m, player.playerId);
    const e =
      reason === 'bonus'
        ? entry(m, 'bonus', `${who} rolls again`, player.playerId)
        : entry(m, 'turn', `${who}'s turn`, player.playerId);

    if (player.kind === 'bot') {
      m.deadline = null;
      emit(m, { type: 'turn', reason }, e);
      later(m, BOT_PAUSE_MS, () => doRoll(m, false));
      return;
    }
    startCountdown(m, () => onTimeout(m));
    emit(m, { type: 'turn', reason }, e);
  }

  function startCountdown(m: Match, onExpire: () => void): void {
    m.deadline = m.ctx.now() + m.turnMs;
    later(m, m.turnMs, onExpire);
  }

  function handOff(m: Match, afterMs: number): void {
    const s = m.state;
    if (s.phase === 'finished' || !s.turn) return;
    const from = s.turn;
    later(m, afterMs, () => {
      const next = nextActivePlayer(s, from);
      if (!next) return;
      s.turn = next;
      startTurn(m, 'next');
    });
  }

  function doRoll(m: Match, byPlayer: boolean): void {
    const s = m.state;
    if (s.phase !== 'waiting_roll' || !s.turn) return;
    stopTimer(m);
    const by = s.turn;
    const value = m.dice.roll();
    s.roll = { value, by };
    s.sixStreak = value === 6 ? s.sixStreak + 1 : 0;
    s.phase = 'rolling';
    s.eligible = [];
    s.warning = byPlayer && s.warning === by ? null : s.warning;
    const e = entry(m, 'roll', `${nameOf(m, by)} rolled a ${value}`, by);
    emit(m, { type: 'rolled', value, by, tumbleMs: ROLL_TUMBLE_MS }, e);
    later(m, ROLL_TUMBLE_MS, () => afterTumble(m));
  }

  function afterTumble(m: Match): void {
    const s = m.state;
    if (!s.turn || !s.roll) return;
    const by = s.turn;
    const roll = s.roll.value;
    if (roll === 6) say(m, by, 'six');

    if (s.sixStreak >= 3) {
      s.phase = 'waiting_roll';
      s.sixStreak = 0;
      const e = entry(m, 'skip', `${nameOf(m, by)} rolled three sixes in a row and loses the turn`, by);
      emit(m, { type: 'no_move', reason: 'three_sixes' }, e);
      handOff(m, NO_MOVE_PAUSE_MS);
      return;
    }

    const eligible = eligiblePawns(s, by, roll);
    if (eligible.length === 0) {
      s.phase = 'waiting_roll';
      const e = entry(m, 'skip', `${nameOf(m, by)} has no move`, by);
      emit(m, { type: 'no_move', reason: 'blocked' }, e);
      say(m, by, 'skip');
      if (roll === 6) {
        later(m, NO_MOVE_PAUSE_MS, () => startTurn(m, 'bonus'));
      } else {
        handOff(m, NO_MOVE_PAUSE_MS);
      }
      return;
    }

    s.phase = 'waiting_move';
    s.eligible = eligible;
    const player = playerOf(s, by);
    if (player?.kind === 'bot') {
      m.deadline = null;
      emit(m, { type: 'choose' });
      later(m, BOT_THINK_MS, () => doMove(m, chooseBotPawn(s, by, roll, eligible), false));
      return;
    }
    startCountdown(m, () => onTimeout(m));
    emit(m, { type: 'choose' });
  }

  function doMove(m: Match, pawn: number, byPlayer: boolean): void {
    const s = m.state;
    if (s.phase !== 'waiting_move' || !s.turn || !s.roll) return;
    stopTimer(m);
    const by = s.turn;
    const roll = s.roll.value;
    const mover = playerOf(s, by);
    if (!mover) return;
    if (byPlayer && s.warning === by) s.warning = null;

    const result = applyMove(s, by, pawn, roll);
    s.phase = 'moving';
    s.eligible = [];
    s.bonus = result.bonus;
    const who = nameOf(m, by);
    const moveEntry = entry(
      m,
      'move',
      result.from === BASE_PROGRESS ? `${who} brought pawn ${pawn + 1} out` : `${who} moved pawn ${pawn + 1} by ${roll}`,
      by,
    );
    for (const c of result.captured) {
      entry(m, 'capture', `${who} captured ${nameOf(m, c.playerId)}'s pawn`, by);
    }
    if (result.reachedHome) entry(m, 'home', `${who} got a pawn home (${mover.home}/4)`, by);

    emit(
      m,
      {
        type: 'moved',
        by,
        pawn,
        from: result.from,
        to: result.to,
        path: result.path,
        captured: result.captured,
        reachedHome: result.reachedHome,
        bonus: result.bonus,
      },
      moveEntry,
    );

    const duration = moveDurationMs(result.path.length, result.captured.length > 0) + (result.reachedHome ? HOME_CELEBRATE_MS : 0);
    later(m, duration, () => {
      const victim = result.captured[0];
      if (victim) say(m, by, 'capture', nameOf(m, victim.playerId));
      else if (result.reachedHome) say(m, by, 'home');

      if (winnerOf(s) === by) {
        finish(m, by);
      } else if (result.bonus) {
        later(m, TURN_HANDOFF_MS, () => startTurn(m, 'bonus'));
      } else {
        handOff(m, TURN_HANDOFF_MS);
      }
    });
  }

  function finish(m: Match, winner: string): void {
    const s = m.state;
    s.phase = 'finished';
    s.turn = null;
    s.winner = winner;
    s.standings = standingsOf(s);
    s.eligible = [];
    m.deadline = null;
    const e = entry(m, 'win', `${nameOf(m, winner)} wins the match!`, winner);
    say(m, winner, 'win');
    emit(m, { type: 'finished', winner, standings: s.standings }, e);
    m.ctx.log('info', { players: s.players.length }, 'ludo match finished');
  }

  // ---------- countdown, auto-play and away handling ----------

  function onTimeout(m: Match): void {
    const s = m.state;
    const by = s.turn;
    if (!by || (s.phase !== 'waiting_roll' && s.phase !== 'waiting_move')) return;
    m.deadline = null;

    if (!m.autoThisTurn) {
      m.autoThisTurn = true;
      const count = (m.missed.get(by) ?? 0) + 1;
      m.missed.set(by, count);
      const slot = playerOf(s, by)?.slot;
      if (count >= AWAY_RELEASE_AT) {
        m.ctx.log('info', { slot }, 'ludo seat released for inactivity');
        m.releasing.set(by, 'inactive');
        m.ctx.releaseSeat(by, 'inactive');
        return;
      }
      if (count === AWAY_WARN_AT) {
        s.warning = by;
        m.ctx.log('info', { slot }, 'ludo player warned for missed turns');
        const w = entry(m, 'warning', `${nameOf(m, by)} missed 2 turns in a row`, by);
        emit(m, { type: 'warning', player: by }, w);
      }
    }
    m.ctx.log('info', { slot: playerOf(s, by)?.slot, phase: s.phase }, 'ludo countdown expired');

    if (s.phase === 'waiting_roll') {
      const e = entry(m, 'timeout', `${nameOf(m, by)} ran out of time and the game rolled`, by);
      emit(m, { type: 'timeout', by, action: 'roll' }, e);
      doRoll(m, false);
    } else {
      const roll = s.roll?.value ?? 1;
      const pawn = chooseAutoPawn(s, by, roll, s.eligible);
      const e = entry(m, 'timeout', `${nameOf(m, by)} ran out of time and the game moved`, by);
      emit(m, { type: 'timeout', by, action: 'move' }, e);
      doMove(m, pawn, false);
    }
  }

  function release(m: Match, playerId: string): void {
    const s = m.state;
    const player = playerOf(s, playerId);
    if (!player || player.status === 'left') return;
    const wasTurn = s.turn === playerId;
    player.status = 'left';
    player.pawns = player.pawns.map(() => REMOVED_PROGRESS);
    player.home = 0;
    m.missed.delete(playerId);
    if (s.warning === playerId) s.warning = null;
    const reason = m.releasing.get(playerId) ?? 'left';
    m.releasing.delete(playerId);
    const who = nameOf(m, playerId);
    const e = entry(m, 'released', reason === 'inactive' ? `${who} was removed for inactivity` : `${who} left the match`, playerId);

    const humansLeft = s.players.filter((p) => p.kind === 'human' && p.status === 'active');
    if (m.humanCount > 1 && humansLeft.length === 1 && s.lastPlayer === null && s.phase !== 'finished') {
      s.lastPlayer = (humansLeft[0] as { playerId: string }).playerId;
      entry(m, 'turn', `${nameOf(m, s.lastPlayer)} is the last player`, s.lastPlayer);
    }

    if (s.phase === 'finished') {
      emit(m, { type: 'released', player: playerId, reason }, e);
      return;
    }
    if (wasTurn) {
      stopTimer(m);
      s.eligible = [];
      s.phase = 'waiting_roll';
      s.roll = null;
      emit(m, { type: 'released', player: playerId, reason }, e);
      const next = nextActivePlayer(s, playerId);
      if (next) {
        later(m, TURN_HANDOFF_MS, () => {
          s.turn = next;
          startTurn(m, 'next');
        });
      }
      return;
    }
    emit(m, { type: 'released', player: playerId, reason }, e);
  }

  // ---------- GameEngine ----------

  return {
    id: 'ludo',

    assignColors(seated) {
      const colors = assignColors(seated.length);
      const out: Record<string, string> = {};
      seated.forEach((s, i) => {
        out[s.playerId] = colors[i] as string;
      });
      return out;
    },

    createMatch(seats: MatchSeat[], ctx: GameContext): Match {
      const turnMs = devTurnMs() ?? TURN_TIMER_MS;
      const state = createInitialState(
        seats.map((s) => ({ playerId: s.playerId, color: s.color as LudoColor, kind: s.kind })),
        turnMs,
      );
      if (endgameScenario()) {
        for (const p of state.players) {
          p.pawns = [HOME_PROGRESS, HOME_PROGRESS, HOME_PROGRESS, 50];
          p.home = 3;
        }
      }
      const m: Match = {
        ctx,
        state,
        names: new Map(seats.map((s) => [s.playerId, s.displayName])),
        dice: createDice(),
        turnMs,
        humanCount: seats.filter((s) => s.kind === 'human').length,
        seq: 0,
        nextEntryId: 1,
        deadline: null,
        cancel: null,
        missed: new Map(),
        autoThisTurn: false,
        releasing: new Map(),
        disposed: false,
      };
      const e = entry(m, 'turn', 'Match started');
      ctx.log('info', { players: state.players.length, bots: state.players.length - m.humanCount }, 'ludo match started');
      emit(m, { type: 'match_started' }, e);
      startTurn(m, 'start');
      return m;
    },

    getView(match: unknown): unknown {
      return snapshot(match as Match);
    },

    onAction(match: unknown, playerId: string, action: unknown): ActionResult {
      const m = match as Match;
      const s = m.state;
      const a = action as { type?: string; pawn?: number };
      if (s.phase === 'finished') return { ok: false, reason: 'The match is over' };
      if (s.turn !== playerId) return { ok: false, reason: 'It is not your turn' };

      if (a.type === 'roll') {
        if (s.phase !== 'waiting_roll' || m.deadline === null) {
          return { ok: false, reason: s.phase === 'waiting_move' ? 'Choose a pawn to move' : 'Please wait' };
        }
        m.missed.set(playerId, 0);
        if (s.warning === playerId) s.warning = null;
        doRoll(m, true);
        return { ok: true };
      }
      if (a.type === 'move') {
        if (s.phase === 'waiting_roll') return { ok: false, reason: 'Roll first' };
        if (s.phase !== 'waiting_move') return { ok: false, reason: 'Please wait' };
        if (typeof a.pawn !== 'number' || !s.eligible.includes(a.pawn)) return { ok: false, reason: 'That pawn cannot move' };
        m.missed.set(playerId, 0);
        doMove(m, a.pawn, true);
        return { ok: true };
      }
      return { ok: false, reason: 'Unknown action' };
    },

    onSeatReleased(match: unknown, playerId: string): void {
      const m = match as Match;
      if (!m.disposed) release(m, playerId);
    },

    onBotTurn(): void {
      /* bots are scheduled by the engine itself */
    },

    dispose(match: unknown): void {
      const m = match as Match;
      m.disposed = true;
      stopTimer(m);
    },
  };
}

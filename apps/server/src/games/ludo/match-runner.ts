import type { ActionResult, GameAction, JsonValue, MatchContext } from '@myarena/game-sdk';
import {
  AUTO_PAUSE_MS, NO_MOVE_PAUSE_MS, ROLL_ANIMATION_MS, advance, autoChoice, createMatch, isStuck, legalPawns, move, note, parseLudoAction,
  recordMiss, removeSeat, resume, roll,
  type EngineEvent, type LudoEvent, type LudoView, type MatchState,
} from '@myarena/ludo';
import type { DiceSource } from './dice.js';
import type { LudoSettings } from './settings.js';
import { projectView } from './view.js';

const reject = (reason: string, detail: string, nextStep: string): ActionResult => ({ accepted: false, reason, detail, nextStep });

const REJECTIONS = {
  INVALID_ACTION: reject('INVALID_ACTION', 'That action is not part of Ludo.', 'Use Roll, or choose one of the highlighted pawns.'),
  NOT_PLAYING: reject('NOT_PLAYING', 'You are not playing in this match.', 'Wait in the room for the next match.'),
  MATCH_ENDED: reject('MATCH_ENDED', 'The match is over.', 'Return to the lobby or play again.'),
  NOT_YOUR_TURN: reject('NOT_YOUR_TURN', 'It is not your turn.', 'Wait for your turn.'),
  ALREADY_ROLLED: reject('ALREADY_ROLLED', 'The die has already been rolled this turn.', 'Choose a pawn to move.'),
  DIE_STILL_ROLLING: reject('DIE_STILL_ROLLING', 'The die is still rolling.', 'Wait for the die to stop.'),
  MOVE_NOT_ALLOWED: reject('MOVE_NOT_ALLOWED', 'That pawn cannot move with this roll.', 'Choose one of the highlighted pawns.'),
  NOT_AWAY: reject('NOT_AWAY', 'You are not marked away.', 'Nothing to do.'),
} as const;

const ACCEPTED: ActionResult = { accepted: true };

type AutoReason = 'TIMEOUT' | 'AWAY';

/**
 * One running Ludo match in one room: owns the engine state, the die, the timers and the views.
 * Exactly one timer is armed at a time, for whatever the match is waiting on next.
 */
export class MatchRunner {
  private state: MatchState;
  private settleAt: number | null = null;
  private deadline: number | null = null;
  /** Set after a timed-out roll, so the move that follows is played for the seat as well. */
  private autoReason: AutoReason | null = null;
  private timer: unknown = null;
  private stopped = false;

  constructor(
    private readonly context: MatchContext,
    private readonly settings: LudoSettings,
    private readonly dice: DiceSource,
  ) {
    this.state = createMatch(
      context.participants.map((member) => ({ kind: 'HUMAN' as const, label: member.label, participantId: member.id })),
      dice.firstSeat(context.participants.length),
    );
  }

  start(): void {
    this.commit([{ kind: 'TURN', seat: this.state.current! }]);
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  view(participantId: string): JsonValue {
    const now = this.context.clock.now();
    const view: LudoView = projectView({
      state: this.state, theme: this.settings.theme, turnLimitSeconds: this.settings.turnLimitSeconds,
      settleMsLeft: this.settleAt === null ? 0 : Math.max(0, this.settleAt - now),
      decisionMsLeft: this.deadline === null ? null : Math.max(0, this.deadline - now),
    }, participantId);
    return view as unknown as JsonValue;
  }

  act(participantId: string, action: GameAction): ActionResult {
    const parsed = parseLudoAction(action);
    if (!parsed) return REJECTIONS.INVALID_ACTION;
    const seat = this.seatOf(participantId);
    if (seat < 0) return REJECTIONS.NOT_PLAYING;
    if (this.state.phase === 'ENDED') return REJECTIONS.MATCH_ENDED;
    if (parsed.type === 'resume') return this.resumeSeat(seat);
    if (this.state.current !== seat) return REJECTIONS.NOT_YOUR_TURN;

    if (parsed.type === 'roll') {
      if (this.state.phase !== 'ROLL') return REJECTIONS.ALREADY_ROLLED;
      this.rollDie(this.clearAway(seat));
      return ACCEPTED;
    }
    if (this.state.phase !== 'MOVE') return REJECTIONS.MOVE_NOT_ALLOWED;
    if (this.settling()) return REJECTIONS.DIE_STILL_ROLLING;
    if (!legalPawns(this.state).includes(parsed.pawn)) return REJECTIONS.MOVE_NOT_ALLOWED;
    this.movePawn(parsed.pawn, this.clearAway(seat));
    return ACCEPTED;
  }

  /** The platform released this member's seat (they left, were removed, or their recovery window expired). */
  participantLeft(participantId: string): void {
    const seat = this.seatOf(participantId);
    if (seat < 0 || this.state.phase === 'ENDED' || this.stopped) return;
    const result = removeSeat(this.state, seat);
    this.state = result.state;
    this.settleAt = null;
    this.commit(toLudoEvents(result.events));
    if (this.state.phase === 'ENDED') this.context.endMatch();
  }

  private seatOf(participantId: string): number {
    return this.state.seats.findIndex((candidate) => candidate.participantId === participantId && !candidate.left);
  }

  private settling(): boolean {
    return this.settleAt !== null && this.context.clock.now() < this.settleAt;
  }

  /** Any manual action clears missed turns and away; returns the event to publish when the seat was away. */
  private clearAway(seat: number): LudoEvent[] {
    const result = resume(this.state, seat);
    this.state = result.state;
    return result.cleared ? [{ kind: 'AWAY_CLEARED', seat }] : [];
  }

  private resumeSeat(seat: number): ActionResult {
    if (!this.state.seats[seat]!.away) return REJECTIONS.NOT_AWAY;
    this.commit(this.clearAway(seat));
    return ACCEPTED;
  }

  private rollDie(prefix: readonly LudoEvent[] = []): void {
    const value = this.dice.value();
    const seed = this.dice.seed();
    const { state } = roll(this.state, value);
    this.state = state;
    this.settleAt = this.context.clock.now() + ROLL_ANIMATION_MS;
    this.commit([...prefix, { kind: 'ROLLED', seat: state.current!, value, seed, durationMs: ROLL_ANIMATION_MS }]);
  }

  private resolveStuck(): void {
    if (this.stopped || !isStuck(this.state)) return;
    const result = advance(this.state);
    this.state = result.state;
    this.settleAt = null;
    this.commit(toLudoEvents(result.events));
  }

  private movePawn(pawn: number, prefix: readonly LudoEvent[] = []): void {
    const result = move(this.state, pawn);
    this.state = result.state;
    this.settleAt = null;
    this.commit([...prefix, ...toLudoEvents(result.events)]);
    if (this.state.phase === 'ENDED') this.context.endMatch();
  }

  /** The seat did not decide in time: count a missed turn, then play for them with the same die and the same rules. */
  private timeout(): void {
    this.timer = null;
    if (this.stopped || this.state.phase === 'ENDED' || this.state.current === null) return;
    const seat = this.state.current;
    const label = this.state.seats[seat]!.label;
    const missed = recordMiss(this.state, seat);
    this.state = note(missed.state, seat, `${label} ran out of time.`);
    const events: LudoEvent[] = [{ kind: 'AUTO_PLAYED', seat, reason: 'TIMEOUT' }];
    if (missed.away) events.push({ kind: 'AWAY_SET', seat });
    if (this.state.phase === 'ROLL') {
      this.autoReason = 'TIMEOUT';
      this.rollDie(events);
      return;
    }
    const pawn = autoChoice(this.state);
    if (pawn === null) { this.commit(events); return; }
    this.movePawn(pawn, [{ kind: 'AUTO_PLAYED', seat, reason: 'TIMEOUT', pawn }, ...events.slice(1)]);
  }

  private autoRoll(reason: AutoReason): void {
    this.timer = null;
    if (this.stopped || this.state.phase !== 'ROLL' || this.state.current === null) return;
    this.rollDie([{ kind: 'AUTO_PLAYED', seat: this.state.current, reason }]);
  }

  private autoMove(reason: AutoReason): void {
    this.timer = null;
    if (this.stopped || this.state.phase !== 'MOVE' || this.state.current === null) return;
    if (isStuck(this.state)) { this.resolveStuck(); return; }
    const pawn = autoChoice(this.state);
    if (pawn !== null) this.movePawn(pawn, [{ kind: 'AUTO_PLAYED', seat: this.state.current, reason, pawn }]);
  }

  /** Arms the one timer for what the match waits on next, then tells everyone what changed. */
  private commit(events: readonly LudoEvent[]): void {
    this.arm();
    this.context.publish(events as unknown as readonly JsonValue[]);
  }

  private arm(): void {
    this.clearTimer();
    this.deadline = null;
    if (this.state.phase !== 'MOVE') this.autoReason = null;
    if (this.stopped || this.state.phase === 'ENDED' || this.state.current === null) return;
    const seat = this.state.seats[this.state.current]!;
    const limit = this.settings.turnLimitSeconds * 1000;
    const now = this.context.clock.now();

    if (this.state.phase === 'ROLL') {
      if (seat.away) this.schedule(AUTO_PAUSE_MS, () => this.autoRoll('AWAY'));
      else if (limit > 0) { this.deadline = now + limit; this.schedule(limit, () => this.timeout()); }
      return;
    }
    const settleLeft = this.settleAt === null ? 0 : Math.max(0, this.settleAt - now);
    if (isStuck(this.state)) this.schedule(settleLeft + NO_MOVE_PAUSE_MS, () => this.resolveStuck());
    else if (seat.away) this.schedule(settleLeft + AUTO_PAUSE_MS, () => this.autoMove('AWAY'));
    else if (this.autoReason !== null) { const reason = this.autoReason; this.schedule(settleLeft + AUTO_PAUSE_MS, () => this.autoMove(reason)); }
    else if (limit > 0) { this.deadline = now + settleLeft + limit; this.schedule(settleLeft + limit, () => this.timeout()); }
  }

  private schedule(delay: number, callback: () => void): void {
    this.timer = this.context.clock.setTimeout(() => { this.timer = null; callback(); }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== null) this.context.clock.clearTimeout(this.timer);
    this.timer = null;
  }
}

/** The engine's own events are a subset of the wire events; only rolls need extra fields, added at the roll. */
function toLudoEvents(events: readonly EngineEvent[]): LudoEvent[] {
  return events.filter((event): event is Exclude<EngineEvent, { kind: 'ROLLED' }> => event.kind !== 'ROLLED');
}

import type { ActionResult, GameAction, JsonValue, MatchContext } from '@myarena/game-sdk';
import {
  NO_MOVE_PAUSE_MS, ROLL_ANIMATION_MS, advance, createMatch, isStuck, legalPawns, move, parseLudoAction, roll,
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

/** One running Ludo match in one room: owns the engine state, the die, the timers and the views. */
export class MatchRunner {
  private state: MatchState;
  private settleAt: number | null = null;
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
    this.publish([{ kind: 'TURN', seat: this.state.current! }]);
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  view(participantId: string): JsonValue {
    const now = this.context.clock.now();
    const view: LudoView = projectView({
      state: this.state, theme: this.settings.theme, turnLimitSeconds: this.settings.turnLimitSeconds,
      settleMsLeft: this.settleAt === null ? 0 : Math.max(0, this.settleAt - now), decisionMsLeft: null,
    }, participantId);
    return view as unknown as JsonValue;
  }

  act(participantId: string, action: GameAction): ActionResult {
    const parsed = parseLudoAction(action);
    if (!parsed) return REJECTIONS.INVALID_ACTION;
    const seat = this.state.seats.findIndex((candidate) => candidate.participantId === participantId && !candidate.left);
    if (seat < 0) return REJECTIONS.NOT_PLAYING;
    if (this.state.phase === 'ENDED') return REJECTIONS.MATCH_ENDED;
    if (parsed.type === 'resume') return REJECTIONS.NOT_AWAY;
    if (this.state.current !== seat) return REJECTIONS.NOT_YOUR_TURN;

    if (parsed.type === 'roll') {
      if (this.state.phase !== 'ROLL') return REJECTIONS.ALREADY_ROLLED;
      this.rollDie();
      return ACCEPTED;
    }
    if (this.state.phase !== 'MOVE') return REJECTIONS.MOVE_NOT_ALLOWED;
    if (this.settling()) return REJECTIONS.DIE_STILL_ROLLING;
    if (!legalPawns(this.state).includes(parsed.pawn)) return REJECTIONS.MOVE_NOT_ALLOWED;
    this.movePawn(parsed.pawn);
    return ACCEPTED;
  }

  private settling(): boolean {
    return this.settleAt !== null && this.context.clock.now() < this.settleAt;
  }

  private rollDie(): void {
    const value = this.dice.value();
    const seed = this.dice.seed();
    const { state } = roll(this.state, value);
    this.state = state;
    this.settleAt = this.context.clock.now() + ROLL_ANIMATION_MS;
    this.publish([{ kind: 'ROLLED', seat: state.current!, value, seed, durationMs: ROLL_ANIMATION_MS }]);
    // A roll that cannot be used is resolved after the die settles and the result has been seen.
    if (isStuck(state)) this.schedule(ROLL_ANIMATION_MS + NO_MOVE_PAUSE_MS, () => this.resolveStuck());
  }

  private resolveStuck(): void {
    if (this.stopped || !isStuck(this.state)) return;
    const result = advance(this.state);
    this.state = result.state;
    this.settleAt = null;
    this.publish(toLudoEvents(result.events));
  }

  private movePawn(pawn: number): void {
    const result = move(this.state, pawn);
    this.state = result.state;
    this.settleAt = null;
    this.clearTimer();
    this.publish(toLudoEvents(result.events));
    if (this.state.phase === 'ENDED') this.context.endMatch();
  }

  private schedule(delay: number, callback: () => void): void {
    this.clearTimer();
    this.timer = this.context.clock.setTimeout(() => { this.timer = null; callback(); }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== null) this.context.clock.clearTimeout(this.timer);
    this.timer = null;
  }

  private publish(events: readonly LudoEvent[]): void {
    this.context.publish(events as unknown as readonly JsonValue[]);
  }
}

/** The engine's own events are a subset of the wire events; only rolls need extra fields, added at the roll. */
function toLudoEvents(events: readonly EngineEvent[]): LudoEvent[] {
  return events.filter((event): event is Exclude<EngineEvent, { kind: 'ROLLED' }> => event.kind !== 'ROLLED');
}

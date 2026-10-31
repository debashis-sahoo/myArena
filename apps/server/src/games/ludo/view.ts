import { legalPawns, toMatchView, type LudoView, type MatchState } from '@myarena/ludo';

export interface ViewInput {
  state: MatchState;
  theme: string;
  turnLimitSeconds: number;
  settleMsLeft: number;
  decisionMsLeft: number | null;
}

/**
 * One member's projection of the match. A member without a seat (joined after the start, or released) gets
 * no board at all: Ludo has no hidden information, but a waiting member's role does not include watching.
 */
export function projectView(input: ViewInput, participantId: string): LudoView {
  const seat = input.state.seats.findIndex((candidate) => candidate.participantId === participantId && !candidate.left);
  if (seat < 0) return { kind: 'WAITING' };
  return toMatchView(input.state, {
    theme: input.theme, turnLimitSeconds: input.turnLimitSeconds, you: seat,
    legalPawns: legalPawns(input.state), decisionMsLeft: input.decisionMsLeft, settleMsLeft: input.settleMsLeft,
  });
}

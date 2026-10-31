import { describe, expect, it } from 'vitest';
import { createMatch, legalPawns, roll, toMatchView } from '@myarena/ludo';
import { pickPawn, summarizeActions } from '../src/ludo-bots.js';

describe('Ludo bots', () => {
  const people = [{ kind: 'HUMAN' as const, label: 'A', participantId: 'a' }, { kind: 'HUMAN' as const, label: 'B', participantId: 'b' }];

  it('picks the legal pawn that is furthest along, and nothing when none can move', () => {
    const state = createMatch(people, 0);
    state.seats[0]!.pawns = [3, 20, -1, 12];
    const rolled = roll(state, 4).state;
    const view = toMatchView(rolled, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(rolled), decisionMsLeft: null, settleMsLeft: 0 });
    expect(pickPawn(view)).toBe(1);
    const stuck = roll(createMatch(people, 0), 3).state;
    expect(pickPawn(toMatchView(stuck, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(stuck), decisionMsLeft: null, settleMsLeft: 0 }))).toBeNull();
  });

  it('summarizes action latency, broadcast latency and refusals', () => {
    const summary = summarizeActions({ acks: [5, 10, 20], broadcasts: [100, 200, 1500, 300], rejected: { NOT_YOUR_TURN: 2 }, actions: 3 });
    expect(summary.ackMs.max).toBe(20);
    expect(summary.broadcastMs.max).toBe(1500);
    expect(summary.percentBroadcastWithinOneSecond).toBe(75);
    expect(summary.rejected).toEqual({ NOT_YOUR_TURN: 2 });
  });
});

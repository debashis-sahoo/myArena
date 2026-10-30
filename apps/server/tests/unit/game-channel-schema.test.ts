import { describe, expect, it } from 'vitest';
import { ackSchema, clientIntentSchema, gameMessageSchema, parseClientFrame, serverMessageSchema, snapshotSchema } from '@myarena/protocol';

const id = '8f4c2f0e-5d0b-4f55-bd2e-6f6f9b1b7f10';
const matchId = '0c9c2c9c-1b1c-4d7a-9a2c-3f2f4b9f2a11';
const action = (value: unknown) => ({ v: 1, clientActionId: id, type: 'game.action', action: value });

describe('game.action intent', () => {
  it('accepts a typed action with an optional JSON payload', () => {
    expect(clientIntentSchema.safeParse(action({ type: 'roll' })).success).toBe(true);
    expect(clientIntentSchema.safeParse(action({ type: 'move', payload: { pawn: 2 } })).success).toBe(true);
    expect(clientIntentSchema.safeParse(action({ type: 'game.step', payload: [1, 'a', null] })).success).toBe(true);
  });

  it('requires an action type of 1 to 32 characters matching the pattern', () => {
    for (const type of ['', 'Roll', '1roll', 'roll now', 'roll-now', 'a'.repeat(33)]) {
      expect(clientIntentSchema.safeParse(action({ type })).success).toBe(false);
    }
    expect(clientIntentSchema.safeParse(action({ type: 'a'.repeat(32) })).success).toBe(true);
  });

  it('is strict about unknown fields and requires a client action id', () => {
    expect(clientIntentSchema.safeParse(action({ type: 'roll', extra: 1 })).success).toBe(false);
    expect(clientIntentSchema.safeParse({ ...action({ type: 'roll' }), participantId: id }).success).toBe(false);
    expect(clientIntentSchema.safeParse({ v: 1, type: 'game.action', action: { type: 'roll' } }).success).toBe(false);
  });

  it('keeps frames within 4 KB', () => {
    const frame = JSON.stringify(action({ type: 'roll', payload: 'x'.repeat(5000) }));
    expect(() => parseClientFrame(frame)).toThrow(/4 KB/);
    expect(parseClientFrame(JSON.stringify(action({ type: 'roll' })))).toMatchObject({ type: 'game.action' });
  });
});

describe('game server message', () => {
  const message = { v: 1, type: 'game', matchId, seq: 1, state: { kind: 'MATCH' }, events: [{ kind: 'ROLLED' }] };

  it('carries the match id, a sequence of at least 1, the full state and events', () => {
    expect(gameMessageSchema.safeParse(message).success).toBe(true);
    expect(serverMessageSchema.safeParse(message).success).toBe(true);
    expect(gameMessageSchema.safeParse({ ...message, seq: 0 }).success).toBe(false);
    expect(gameMessageSchema.safeParse({ ...message, matchId: 'not-a-uuid' }).success).toBe(false);
    expect(gameMessageSchema.safeParse({ ...message, extra: true }).success).toBe(false);
  });

  it('adds an optional game field to the snapshot', () => {
    const lobbyless = { v: 1, type: 'snapshot', version: 1 };
    expect(snapshotSchema.safeParse(lobbyless).success).toBe(false);
    const game = { matchId, seq: 0, state: { a: 1 } };
    expect(snapshotSchema.shape.game.safeParse(game).success).toBe(true);
    expect(snapshotSchema.shape.game.safeParse(null).success).toBe(true);
    expect(snapshotSchema.shape.game.safeParse(undefined).success).toBe(true);
    expect(snapshotSchema.shape.game.safeParse({ ...game, seq: -1 }).success).toBe(false);
  });
});

describe('GAME_ACTION_REJECTED ack', () => {
  it('is a valid rejection code with plain-language text', () => {
    const ack = { v: 1, type: 'ack', clientActionId: id, version: 3, status: 'REJECTED', code: 'GAME_ACTION_REJECTED', detail: 'It is not your turn.', nextStep: 'Wait for your turn.' };
    expect(ackSchema.safeParse(ack).success).toBe(true);
  });
});

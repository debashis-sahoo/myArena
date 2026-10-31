import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clientIntentSchema, gameMessageSchema, rejections, serverMessageSchema, snapshotSchema } from '@myarena/protocol';

const doc = readFileSync(new URL('../../../../specs/003-ludo-game/contracts/game-channel.md', import.meta.url), 'utf8');
const sdk = readFileSync(new URL('../../../../packages/game-sdk/src/lifecycle.ts', import.meta.url), 'utf8');

describe('game channel contract', () => {
  it('documents the intent, the server message, the snapshot field and the rejection code', () => {
    for (const name of ['game.action', '`game`', 'snapshot', 'GAME_ACTION_REJECTED', 'matchId', 'seq', 'viewFor']) {
      expect(doc).toContain(name);
    }
    expect(clientIntentSchema.options.some((option) => option.shape.type.value === 'game.action')).toBe(true);
    expect(Object.keys(rejections)).toContain('GAME_ACTION_REJECTED');
  });

  it('documents every SDK hook the platform calls', () => {
    for (const hook of ['publish', 'participants', 'viewFor', 'onParticipantLeft', 'releaseMatch']) {
      expect(doc).toContain(hook);
      expect(sdk).toContain(hook);
    }
  });

  it('defaults the rejection text as documented', () => {
    expect(rejections.GAME_ACTION_REJECTED).toEqual({
      detail: 'That action is not allowed right now.', nextStep: 'Check the game and try again.',
    });
    expect(doc).toContain('That action is not allowed right now.');
    expect(doc).toContain('Check the game and try again.');
  });

  it('accepts a game message and a snapshot with a game field through the shared union', () => {
    const matchId = '0c9c2c9c-1b1c-4d7a-9a2c-3f2f4b9f2a11';
    const message = { v: 1, type: 'game', matchId, seq: 2, state: { kind: 'WAITING' }, events: [] };
    expect(gameMessageSchema.safeParse(message).success).toBe(true);
    expect(serverMessageSchema.safeParse(message).success).toBe(true);
    expect(snapshotSchema.shape.game.safeParse({ matchId, seq: 0, state: { kind: 'WAITING' } }).success).toBe(true);
  });
});

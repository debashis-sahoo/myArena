import { describe, expect, it } from 'vitest';
import { setupLobby, stateOf } from './lobby-helpers.js';

const HOST_ONLY = [
  { type: 'game.select', gameId: 'test-stub' },
  { type: 'settings.update', changes: { maxParticipants: 5 } },
  { type: 'match.start' },
  { type: 'match.rematch' },
  { type: 'match.returnToLobby' },
  { type: 'invite.regenerate' },
  { type: 'host.transfer', targetParticipantId: '98cbf5c1-c22c-4da9-bfc6-df56b99430c8' },
  { type: 'member.remove', targetParticipantId: '98cbf5c1-c22c-4da9-bfc6-df56b99430c8' },
  { type: 'room.close' },
];

describe('lobby permissions', () => {
  it('rejects every host-only intent from a player without any state or version change', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const snapshot = stateOf(room);
      const version = room.version;
      const hostEvents = host.socket.events().length;

      for (const intent of HOST_ONLY) {
        expect(await players[0]!.socket.act(intent)).toMatchObject({ status: 'REJECTED', code: 'NOT_HOST', version, nextStep: expect.any(String) });
      }
      expect(room.version).toBe(version);
      expect(stateOf(room)).toBe(snapshot);

      await host.socket.act({ type: 'game.select', gameId: 'test-stub' });
      await host.socket.until(() => host.socket.events().length === hostEvents + 1);
      expect(host.socket.events().at(-1)).toMatchObject({ version: version + 1, kind: 'game.selected' });
    } finally { await lobby.close(); }
  });

  it('rejects changing another member\'s readiness and forged identity fields', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const version = room.version;
      const alex = players[0]!.socket;
      expect(await alex.act({ type: 'ready.set', ready: true, participantId: host.id })).toMatchObject({ status: 'REJECTED', code: 'FORBIDDEN_TARGET' });
      expect(await alex.act({ type: 'ready.set', ready: true, targetParticipantId: host.id })).toMatchObject({ code: 'FORBIDDEN_TARGET' });
      expect(await alex.act({ type: 'ready.set', ready: true, role: 'HOST' })).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(room.participants[0]!.ready).toBe(false);
      expect(room.participants[1]!.ready).toBe(false);
      expect(room.version).toBe(version);
    } finally { await lobby.close(); }
  });

  it('lets a player change only their own readiness and keeps the host able to use host-only intents', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      expect((await players[0]!.socket.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
      expect(room.participants[1]!.ready).toBe(true);
      expect(room.participants[0]!.ready).toBe(false);
      expect((await host.socket.act({ type: 'settings.update', changes: { maxParticipants: 5 } })).status).toBe('ACCEPTED');
      expect(room.settings.maxParticipants).toBe(5);
    } finally { await lobby.close(); }
  });
});

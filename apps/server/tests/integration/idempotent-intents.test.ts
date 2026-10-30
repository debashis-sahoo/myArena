import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { setupLobby } from './lobby-helpers.js';

describe('idempotent intents', () => {
  it('returns the original ack and applies a repeated clientActionId once', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const alex = players[0]!.socket;
      const clientActionId = randomUUID();
      const first = await alex.act({ type: 'ready.set', ready: true, clientActionId });
      const version = room.version;
      const second = await alex.act({ type: 'ready.set', ready: true, clientActionId });
      expect(second).toEqual(first);
      expect(room.version).toBe(version);
      await host.socket.until(() => host.socket.events().some((event) => event.kind === 'participant.ready'));
      expect(host.socket.events().filter((event) => event.kind === 'participant.ready')).toHaveLength(1);

      const chatId = randomUUID();
      await alex.act({ type: 'chat.send', text: 'once', clientActionId: chatId });
      await alex.act({ type: 'chat.send', text: 'once', clientActionId: chatId });
      expect(room.chat).toHaveLength(1);
    } finally { await lobby.close(); }
  });

  it('replays a rejection exactly, even after the situation would now allow it', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const clientActionId = randomUUID();
      const rejected = await host.socket.act({ type: 'match.start', clientActionId });
      expect(rejected).toMatchObject({ status: 'REJECTED', code: 'NO_GAME_SELECTED' });
      await host.socket.act({ type: 'game.select', gameId: 'test-stub' });
      await players[0]!.socket.act({ type: 'ready.set', ready: true });
      expect(await host.socket.act({ type: 'match.start', clientActionId })).toEqual(rejected);
      expect(room.status).toBe('LOBBY');
      expect((await host.socket.act({ type: 'match.start' })).status).toBe('ACCEPTED');
    } finally { await lobby.close(); }
  });

  it('does not treat the same id from two different participants as one action', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const clientActionId = randomUUID();
      const host = await lobby.host.socket.act({ type: 'ready.set', ready: true, clientActionId });
      const alex = await lobby.players[0]!.socket.act({ type: 'ready.set', ready: true, clientActionId });
      expect([host.status, alex.status]).toEqual(['ACCEPTED', 'ACCEPTED']);
      expect(lobby.room.participants.map((member) => member.ready)).toEqual([true, true]);
    } finally { await lobby.close(); }
  });
});

import { describe, expect, it } from 'vitest';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';

describe('superseded connections', () => {
  it('closes the older connection with 4009 and keeps the participant connected', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, roomId } = lobby;
      const alex = players[0]!;
      const version = room.version;
      const second = await alex.client.connect(roomId);
      expect(lobbyOf(await second.waitFor(isSnapshot)).self.id).toBe(alex.id);
      expect(await alex.socket.closed).toBe(4009);

      expect(room.participants[1]!.connection).toBe('CONNECTED');
      expect(room.version).toBe(version);
      expect(host.socket.events().some((event) => event.kind === 'participant.connection')).toBe(false);
      expect((await second.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
    } finally { await lobby.close(); }
  });
});

import { describe, expect, it } from 'vitest';
import { setupLobby } from './lobby-helpers.js';

describe('host member removal', () => {
  it('releases the seat at once, closes the socket with 4012, and leaves the others consistent', async () => {
    const lobby = await setupLobby(['Alex', 'Sam']);
    try {
      const { host, players, room, roomId } = lobby;
      const [alex, sam] = players as [typeof players[0], typeof players[0]];
      const version = room.version;

      expect(await alex.socket.act({ type: 'member.remove', targetParticipantId: sam.id })).toMatchObject({ code: 'NOT_HOST' });
      expect(await host.socket.act({ type: 'member.remove', targetParticipantId: host.id })).toMatchObject({ code: 'CANNOT_REMOVE_SELF' });
      expect(await host.socket.act({ type: 'member.remove', targetParticipantId: '98cbf5c1-c22c-4da9-bfc6-df56b99430c8' })).toMatchObject({ code: 'TARGET_NOT_FOUND' });
      expect(room.version).toBe(version);
      expect(room.participants).toHaveLength(3);

      expect((await host.socket.act({ type: 'member.remove', targetParticipantId: alex.id })).status).toBe('ACCEPTED');
      expect(await alex.socket.closed).toBe(4012);
      expect(alex.socket.log).toContainEqual({ v: 1, type: 'closing', reason: 'removed' });
      expect(room.participants.map((member) => member.id)).toEqual([host.id, sam.id]);

      for (const member of [host, sam]) {
        await member.socket.until(() => member.socket.events().some((event) => event.kind === 'participant.removed'));
        expect(member.socket.events().find((event) => event.kind === 'participant.removed')).toMatchObject({
          version: version + 1, data: { participantId: alex.id },
        });
      }

      await expect(alex.client.connect(roomId)).rejects.toThrow();
      const stale = await alex.client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: lobby.code, displayName: 'Alex' }) });
      expect(stale.status).toBe(410);
      expect((await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' })).status).toBe(204);
      const rejoin = await alex.client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: lobby.code, displayName: 'Alex' }) });
      expect(rejoin.status).toBe(200);
      const rejoined = await rejoin.json();
      expect(rejoined.participantId).not.toBe(alex.id);
      expect(room.participants).toHaveLength(3);
    } finally { await lobby.close(); }
  });

  it('stops the removed browser from returning once the invitation is regenerated', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, code, server } = lobby;
      await host.socket.act({ type: 'member.remove', targetParticipantId: players[0]!.id });
      await host.socket.act({ type: 'invite.regenerate' });
      const blocked = await players[0]!.client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code, displayName: 'Alex' }) });
      expect(blocked.status).toBe(404);
      expect(server.rooms.store.get(lobby.roomId)!.participants).toHaveLength(1);
    } finally { await lobby.close(); }
  });
});

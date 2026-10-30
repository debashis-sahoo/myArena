import { describe, expect, it } from 'vitest';
import { setupLobby } from './lobby-helpers.js';

const MINUTE = 60_000;

describe('explicit leave', () => {
  it('releases the seat at once, clears the cookie, and closes the socket with 4011', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, roomId } = lobby;
      const alex = players[0]!;
      const response = await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' });
      expect(response.status).toBe(204);
      const cleared = response.headers.getSetCookie().join(';');
      expect(cleared).toContain(`mah_m_${roomId}=;`);
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/i);

      expect(await alex.socket.closed).toBe(4011);
      expect(room.participants.map((member) => member.id)).toEqual([host.id]);
      await host.socket.until(() => host.socket.events().some((event) => event.kind === 'participant.left'));
      expect(host.socket.events().at(-1)).toMatchObject({ kind: 'participant.left', data: { participantId: alex.id } });
    } finally { await lobby.close(); }
  });

  it('is a no-op 204 when repeated with the old credential, and 401 without any credential', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { players, room, roomId, server } = lobby;
      const alex = players[0]!;
      const oldCookie = await alex.client.jar.getCookieString(server.baseUrl);
      await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' });
      const version = room.version;

      const repeated = await fetch(`${server.baseUrl}/api/rooms/${roomId}/leave`, { method: 'POST', headers: { Origin: server.origin, Cookie: oldCookie } });
      expect(repeated.status).toBe(204);
      expect(room.version).toBe(version);
      expect(room.participants).toHaveLength(1);
      expect((await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' })).status).toBe(401);
    } finally { await lobby.close(); }
  });

  it('cancels the recovery window of a participant who leaves while disconnected', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, clock, roomId } = lobby;
      const alex = players[0]!;
      alex.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      expect((await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' })).status).toBe(204);
      const version = room.version;
      clock.advance(10 * MINUTE);
      expect(room.version).toBe(version);
      expect(host.socket.events().filter((event) => event.kind === 'participant.left')).toHaveLength(1);
    } finally { await lobby.close(); }
  });

  it('rejects a cross-origin leave', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const response = await fetch(`${lobby.server.baseUrl}/api/rooms/${lobby.roomId}/leave`, {
        method: 'POST', headers: { Origin: 'https://evil.example', Cookie: await lobby.players[0]!.client.jar.getCookieString(lobby.server.baseUrl) },
      });
      expect(response.status).toBe(403);
      expect(lobby.room.participants).toHaveLength(2);
    } finally { await lobby.close(); }
  });
});

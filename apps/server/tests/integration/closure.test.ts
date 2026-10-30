import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { setupLobby, stateOf } from './lobby-helpers.js';

const MINUTE = 60_000;

describe('room closure', () => {
  it('deletes chat, members, recovery state and the invitation, and closes every socket with 4010', async () => {
    const lobby = await setupLobby(['Alex', 'Sam']);
    try {
      const { host, players, room, roomId, code, server, clock } = lobby;
      await players[0]!.socket.act({ type: 'chat.send', text: 'private words' });
      players[1]!.socket.raw.terminate();
      await host.socket.until(() => room.participants[2]!.connection === 'DISCONNECTED');
      const staleCookie = await players[1]!.client.jar.getCookieString(server.baseUrl);

      expect((await host.socket.act({ type: 'room.close' })).status).toBe('ACCEPTED');
      expect(await host.socket.closed).toBe(4010);
      expect(await players[0]!.socket.closed).toBe(4010);
      for (const member of [host, players[0]!]) {
        expect(member.socket.events().at(-1)).toMatchObject({ kind: 'room.closed' });
        expect(member.socket.log).toContainEqual({ v: 1, type: 'closing', reason: 'closed' });
      }

      expect(server.rooms.store.size).toBe(0);
      expect(room).toMatchObject({ status: 'CLOSED', chat: [], participants: [], invitation: { status: 'REVOKED' } });
      const after = JSON.stringify(room);
      expect(after).not.toContain('private words');
      clock.advance(10 * MINUTE);
      expect(JSON.stringify(room)).toBe(after);

      expect((await server.client().request(`/api/invitations/${code}`)).status).toBe(404);
      const join = await server.client().request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code, displayName: 'Late' }) });
      expect(join.status).toBe(404);
      const probe = await fetch(`${server.baseUrl}/api/rooms/${roomId}/session`, { headers: { Cookie: staleCookie } });
      expect(probe.status).toBe(410);
      const upgrade = await fetch(`${server.baseUrl}/ws?room=${roomId}`, { headers: { Origin: server.origin, Cookie: staleCookie } });
      expect(upgrade.status).toBe(410);
      const cleared = await fetch(`${server.baseUrl}/api/rooms/${roomId}/leave`, { method: 'POST', headers: { Origin: server.origin, Cookie: staleCookie } });
      expect(cleared.status).toBe(204);
      expect(cleared.headers.getSetCookie().join(';')).toContain(`mah_m_${roomId}=;`);
    } finally { await lobby.close(); }
  });

  it('is host-only and leaves the room untouched for anyone else', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const before = stateOf(lobby.room);
      expect(await lobby.players[0]!.socket.act({ type: 'room.close' })).toMatchObject({ status: 'REJECTED', code: 'NOT_HOST' });
      expect(stateOf(lobby.room)).toBe(before);
      expect(lobby.server.rooms.store.size).toBe(1);
    } finally { await lobby.close(); }
  });

  it('ends a running match without firing its end later', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, clock } = lobby;
      await players[0]!.socket.act({ type: 'ready.set', ready: true });
      await host.socket.act({ type: 'game.select', gameId: 'test-stub' });
      await host.socket.act({ type: 'match.start' });
      await host.socket.act({ type: 'room.close' });
      await host.socket.closed;
      clock.advance(60_000);
      expect(host.socket.events().some((event) => event.kind === 'match.ended')).toBe(false);
    } finally { await lobby.close(); }
  });

  it('forgets idempotency records so a replayed create makes a new room, not the closed one', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { server } = lobby;
      const client = server.client();
      const key = randomUUID();
      const request = () => client.request('/api/rooms', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ displayName: 'Again' }) });
      const first = await (await request()).json();
      const connection = await client.connect(first.roomId);
      await connection.act({ type: 'room.close' });
      await connection.closed;
      const second = await (await request()).json();
      expect(second.roomId).not.toBe(first.roomId);
      expect(server.rooms.store.get(second.roomId)).toBeDefined();
    } finally { await lobby.close(); }
  });

  it('closes when no seat holder remains or no handoff is possible', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, roomId, server } = lobby;
      await host.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' });
      expect(room.participants.map((member) => member.role)).toEqual(['HOST']);
      await players[0]!.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' });
      expect(server.rooms.store.size).toBe(0);
      expect(room.status).toBe('CLOSED');
    } finally { await lobby.close(); }
  });
});

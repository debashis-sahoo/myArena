import { describe, expect, it } from 'vitest';
import { setupLobby, stateOf } from './lobby-helpers.js';
import { startTestServer } from './helpers.js';

const TARGET = '98cbf5c1-c22c-4da9-bfc6-df56b99430c8';
const INTENTS: Record<string, unknown>[] = [
  { type: 'ready.set', ready: true }, { type: 'chat.send', text: 'hi' }, { type: 'game.select', gameId: 'test-stub' },
  { type: 'settings.update', changes: { maxParticipants: 5 } }, { type: 'match.start' }, { type: 'match.rematch' },
  { type: 'match.returnToLobby' }, { type: 'invite.regenerate' }, { type: 'host.transfer', targetParticipantId: TARGET },
  { type: 'member.remove', targetParticipantId: TARGET }, { type: 'room.close' }, { type: 'resync' }, { type: 'ping' },
];
const FORGED = [{ userId: 'someone' }, { hostId: 'someone' }, { role: 'HOST' }, { participantId: TARGET }, { isHost: true }];

describe('authority comes only from the session', () => {
  it('rejects any forged identity, host, or role field on every intent without changing state', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const before = stateOf(room);
      for (const actor of [host, players[0]!]) {
        for (const intent of INTENTS) {
          lobby.clock.advance(10_000);
          for (const forged of FORGED) {
            const ack = await actor.socket.act({ ...intent, ...forged });
            expect(ack, JSON.stringify({ intent, forged })).toMatchObject({ status: 'REJECTED' });
            expect(['VALIDATION_FAILED', 'FORBIDDEN_TARGET']).toContain((ack as { code: string }).code);
          }
        }
      }
      expect(await players[0]!.socket.act({ type: 'settings.update', changes: { maxParticipants: 5, role: 'HOST' } })).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(stateOf(room)).toBe(before);
      expect(room.participants.map((member) => member.role)).toEqual(['HOST', 'PLAYER']);
    } finally { await lobby.close(); }
  });

  it('rejects host-only intents from a former host and accepts them from the new one', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      expect((await host.socket.act({ type: 'host.transfer', targetParticipantId: players[0]!.id })).status).toBe('ACCEPTED');
      const before = stateOf(room);
      for (const intent of [{ type: 'game.select', gameId: 'test-stub' }, { type: 'match.start' }, { type: 'invite.regenerate' }, { type: 'room.close' }]) {
        expect(await host.socket.act(intent)).toMatchObject({ status: 'REJECTED', code: 'NOT_HOST' });
      }
      expect(stateOf(room)).toBe(before);
      expect(await host.socket.act({ type: 'host.transfer', targetParticipantId: host.id })).toMatchObject({ code: 'NOT_HOST' });
      expect((await players[0]!.socket.act({ type: 'game.select', gameId: 'test-stub' })).status).toBe('ACCEPTED');
    } finally { await lobby.close(); }
  });

  it('ignores identity-looking headers and rejects identity fields in REST bodies', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { server, code, host, room } = lobby;
      const join = (extra: Record<string, unknown>, headers: Record<string, string> = {}) =>
        server.client().request('/api/rooms/join', { method: 'POST', headers, body: JSON.stringify({ code, displayName: 'Eve', ...extra }) });
      for (const forged of FORGED) expect((await join(forged)).status).toBe(400);
      const spoofed = await join({}, { 'X-Role': 'HOST', 'X-Participant-Id': host.id, 'X-Forwarded-User': 'admin' });
      expect(spoofed.status).toBe(200);
      expect(await spoofed.json()).toMatchObject({ role: 'PLAYER' });
      expect(room.participants.filter((member) => member.role === 'HOST')).toHaveLength(1);
      expect((await server.client().request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Eve', role: 'HOST' }) })).status).toBe(400);
    } finally { await lobby.close(); }
  });

  it('refuses another room\'s credential presented under this room\'s cookie name', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { server, roomId } = lobby;
      const other = server.client();
      const created = await (await other.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Other' }) })).json();
      const foreignToken = (await other.jar.getCookieString(server.baseUrl)).split('=')[1]!;
      const response = await fetch(`${server.baseUrl}/ws?room=${roomId}`, { headers: { Origin: server.origin, Cookie: `mah_m_${roomId}=${foreignToken}` } });
      expect(response.status).toBe(410);
      const probe = await fetch(`${server.baseUrl}/api/rooms/${roomId}/session`, { headers: { Cookie: `mah_m_${roomId}=${foreignToken}` } });
      expect(probe.status).toBe(410);
      expect(created.roomId).not.toBe(roomId);
    } finally { await lobby.close(); }
  });

  it('has no administrator surface', async () => {
    const server = await startTestServer();
    try {
      for (const path of ['/api/admin', '/api/admin/rooms', '/api/rooms']) {
        const response = await fetch(`${server.baseUrl}${path}`, { headers: { Origin: server.origin } });
        expect([404, 405]).toContain(response.status);
      }
    } finally { await server.close(); }
  });
});

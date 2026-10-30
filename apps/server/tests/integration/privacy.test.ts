import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { LobbyView } from '@myarena/protocol';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

describe('privacy of other members\' views, errors, and logs', () => {
  it('never exposes credentials, invitation codes, or recovery data to other members', async () => {
    let logs = '';
    const logStream = new Writable({ write(chunk, _encoding, callback) { logs += chunk.toString(); callback(); } });
    const lobby = await setupLobby(['Alex', 'Sam'], { logStream });
    try {
      const { host, players, server, code, roomId } = lobby;
      const [alex, sam] = players as [typeof players[0], typeof players[0]];
      const secrets = new Set<string>([code]);
      const errorBodies: string[] = [];
      const collect = async (member: typeof host) => (await member.client.jar.getCookieString(server.baseUrl)).split(';').forEach((cookie) => secrets.add(cookie.split('=')[1]!));

      await Promise.all([host, alex, sam].map(collect));
      await alex.socket.act({ type: 'chat.send', text: 'hello' });
      await sam.socket.act({ type: 'ready.set', ready: true });
      sam.socket.raw.terminate();
      await host.socket.until(() => lobby.room.participants[2]!.connection === 'DISCONNECTED');
      const back = await sam.client.connect(roomId);
      await back.waitFor(isSnapshot);

      await host.socket.act({ type: 'invite.regenerate' });
      const rotated = lobby.room.invitation.code;
      secrets.add(rotated);
      await server.client().request(`/api/invitations/${code}`);
      const failures = [
        await server.client().request(`/api/invitations/${rotated.slice(0, 9)}`),
        await server.client().request('/api/rooms/join', json({ code, displayName: 'Eve' })),
        await server.client().request('/api/rooms/join', json({ code: rotated })),
        await server.client().request(`/api/rooms/${roomId}/session`),
      ];
      for (const response of failures) errorBodies.push(await response.text());

      for (const message of [...alex.socket.log, ...back.log]) {
        const text = JSON.stringify(message);
        for (const secret of secrets) expect(text, `${message.type} leaked a secret`).not.toContain(secret);
        expect(text).not.toMatch(/tokenHash|actionLog|disconnectedAt|recovery|mah_m_|invitation/i);
      }
      for (const message of host.socket.log) {
        const text = JSON.stringify(message);
        for (const secret of secrets) {
          if (secret === code || secret === rotated) continue;
          expect(text).not.toContain(secret);
        }
        expect(text).not.toMatch(/tokenHash|actionLog|disconnectedAt|recovery|mah_m_/i);
      }
      for (const body of errorBodies) for (const secret of secrets) expect(body).not.toContain(secret);
      for (const secret of secrets) expect(logs).not.toContain(secret);
      expect(logs).not.toMatch(/mah_m_|tokenHash/);
      expect(logs.length).toBeGreaterThan(0);
    } finally { await lobby.close(); }
  });

  it('limits a member\'s lobby view to the public fields', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const view: LobbyView = lobbyOf(lobby.players[0]!.socket.log.find(isSnapshot)!);
      expect(Object.keys(view).sort()).toEqual(['chat', 'id', 'matchStatus', 'participants', 'self', 'selectedGameId', 'settings', 'status', 'version'].sort());
      for (const participant of view.participants) expect(Object.keys(participant).sort()).toEqual(['connection', 'displayLabel', 'id', 'ready', 'role']);
      expect(Object.keys(view.self).sort()).toEqual(['id', 'role']);
    } finally { await lobby.close(); }
  });

  it('keeps room data out of every error a stranger can trigger', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { server, roomId, code, room } = lobby;
      room.settings.maxParticipants = 2;
      const stranger = server.client();
      const responses = [
        await stranger.request('/api/rooms/join', json({ code, displayName: 'Eve' })),
        await stranger.request(`/api/rooms/${roomId}/session`),
        await stranger.request(`/api/rooms/${roomId}/leave`, { method: 'POST' }),
        await fetch(`${server.baseUrl}/ws?room=${roomId}`, { headers: { Origin: server.origin } }),
      ];
      for (const response of responses) {
        const text = await response.text();
        expect(text).not.toContain(code);
        expect(text).not.toContain('Alex');
        expect(text).not.toContain('Host');
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    } finally { await lobby.close(); }
  });
});

import { describe, expect, it } from 'vitest';
import type { LobbyView } from '@myarena/protocol';
import { startTestServer } from './helpers.js';

type Client = ReturnType<Awaited<ReturnType<typeof startTestServer>>['client']>;
const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const lobbyOf = (message: { type: string }) => (message as { lobby: LobbyView }).lobby;

async function create(client: Client, displayName: string) {
  const response = await client.request('/api/rooms', json({ displayName }));
  expect(response.status).toBe(201);
  return response.json() as Promise<{ roomId: string; participantId: string; invitation: { code: string; link: string } }>;
}

describe('create and join', () => {
  it('shows the same member list to the host and to players who join by code and by link', async () => {
    const server = await startTestServer();
    try {
      const [hostClient, byCode, byLink] = [server.client(), server.client(), server.client()];
      const room = await create(hostClient, 'Sam');
      const hostSocket = await hostClient.connect(room.roomId);
      expect(lobbyOf(await hostSocket.waitFor((message) => message.type === 'snapshot')).invitation).toEqual(room.invitation);

      const joinedByCode = await byCode.request('/api/rooms/join', json({ code: room.invitation.code, displayName: 'Sam' }));
      expect(joinedByCode.status).toBe(200);
      const linkCode = room.invitation.link.split('/').pop();
      const joinedByLink = await byLink.request('/api/rooms/join', json({ code: linkCode, displayName: 'Alex' }));
      expect(joinedByLink.status).toBe(200);

      const events = [await hostSocket.waitFor((m) => m.type === 'event'), await hostSocket.waitFor((m) => m.type === 'event')];
      expect(events.map((event) => (event as { version: number }).version)).toEqual([1, 2]);

      const playerSocket = await byCode.connect(room.roomId);
      const playerLobby = lobbyOf(await playerSocket.waitFor((message) => message.type === 'snapshot'));
      const hostResync = await hostClient.connect(room.roomId);
      const hostLobby = lobbyOf(await hostResync.waitFor((message) => message.type === 'snapshot'));

      expect(playerLobby.participants.map((p) => p.displayLabel)).toEqual(['Sam', 'Sam (2)', 'Alex']);
      expect(playerLobby.participants).toEqual(hostLobby.participants);
      expect(new Set(playerLobby.participants.map((p) => p.id)).size).toBe(3);
      expect(playerLobby.version).toBe(hostLobby.version);
      expect(playerLobby.self.role).toBe('PLAYER');
      expect(playerLobby).not.toHaveProperty('invitation');
      expect(JSON.stringify(playerLobby)).not.toContain(room.invitation.code);
      expect(JSON.stringify(hostLobby)).not.toMatch(/tokenHash|actionLog|recovery/);
    } finally { await server.close(); }
  });
});

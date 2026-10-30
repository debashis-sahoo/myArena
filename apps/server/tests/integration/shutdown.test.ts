import { describe, expect, it } from 'vitest';
import { gracefulShutdown } from '../../src/shutdown.js';
import { setupLobby } from './lobby-helpers.js';
import { startTestServer } from './helpers.js';

describe('graceful shutdown', () => {
  it('stops accepting new rooms and closes every socket with 1001 after telling it why', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { server, host, players } = lobby;
      const closing = gracefulShutdown(server.app, server.rooms);
      expect(await host.socket.closed).toBe(1001);
      expect(await players[0]!.socket.closed).toBe(1001);
      await closing;
      for (const member of [host, players[0]!]) expect(member.socket.log).toContainEqual({ v: 1, type: 'closing', reason: 'shutdown' });
    } finally { await lobby.close(); }
  });

  it('refuses new rooms with a clear retry message as soon as shutdown begins', async () => {
    const server = await startTestServer();
    try {
      server.rooms.stopAcceptingRooms();
      const response = await server.client().request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Sam' }) });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: 'SERVICE_AT_CAPACITY', nextStep: expect.any(String) });
      expect(server.rooms.store.size).toBe(0);
    } finally { await server.close(); }
  });
});

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { startTestServer } from './helpers.js';

describe('gateway foundation', () => {
  it('refuses unauthenticated upgrades over real HTTP', async () => {
    const server = await startTestServer();
    try {
      const response = await fetch(`${server.baseUrl}/ws?room=${randomUUID()}`, { headers: { Origin: server.origin } });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
    } finally { await server.close(); }
  });
  it('validates envelopes and responds to authenticated keepalive', async () => {
    const roomId = randomUUID();
    const participantId = randomUUID();
    const server = await startTestServer({ gateway: { authenticate: () => ({ roomId, participantId }) } });
    try {
      const client = server.client();
      await client.jar.setCookie(`mah_m_${roomId}=test; Secure; HttpOnly; Path=/`, server.baseUrl);
      const socket = await client.connect(roomId);
      socket.send({ v: 1, type: 'ping', clientActionId: randomUUID() });
      expect(await socket.waitFor((message) => message.type === 'pong')).toEqual({ v: 1, type: 'pong' });
    } finally { await server.close(); }
  });
});
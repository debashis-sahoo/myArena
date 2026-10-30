import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { startTestServer } from './helpers.js';

const post = (body: unknown, key?: string) => ({
  method: 'POST', body: JSON.stringify(body), ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
});

describe('idempotent entry', () => {
  it('returns the original result for a repeated create without a second room', async () => {
    const server = await startTestServer();
    try {
      const client = server.client();
      const key = randomUUID();
      const first = await client.request('/api/rooms', post({ displayName: 'Sam' }, key));
      const second = await client.request('/api/rooms', post({ displayName: 'Sam' }, key));
      expect([first.status, second.status]).toEqual([201, 201]);
      const replayed = await second.json();
      expect(replayed).toEqual(await first.json());
      expect(server.rooms.store.size).toBe(1);
      expect(server.rooms.store.get(replayed.roomId)!.participants).toHaveLength(1);
      const socket = await client.connect(replayed.roomId);
      expect((await socket.waitFor((message) => message.type === 'snapshot')).type).toBe('snapshot');
    } finally { await server.close(); }
  });

  it('returns the original seat for a repeated join and refuses a changed request', async () => {
    const server = await startTestServer();
    try {
      const room = await (await server.client().request('/api/rooms', post({ displayName: 'Sam' }))).json();
      const player = server.client();
      const key = randomUUID();
      const join = (name: string) => player.request('/api/rooms/join', post({ code: room.invitation.code, displayName: name }, key));
      const first = await join('Alex');
      const second = await join('Alex');
      expect(second.status).toBe(200);
      expect(await second.json()).toEqual(await first.json());
      expect(server.rooms.store.get(room.roomId)!.participants).toHaveLength(2);

      const changed = await join('Someone else');
      expect(changed.status).toBe(400);
      expect(server.rooms.store.get(room.roomId)!.participants).toHaveLength(2);
    } finally { await server.close(); }
  });

  it('rejects a malformed key', async () => {
    const server = await startTestServer();
    try {
      const response = await server.client().request('/api/rooms', post({ displayName: 'Sam' }, 'not-a-uuid'));
      expect(response.status).toBe(400);
      expect(server.rooms.store.size).toBe(0);
    } finally { await server.close(); }
  });
});

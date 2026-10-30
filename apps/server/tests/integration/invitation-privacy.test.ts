import { describe, expect, it } from 'vitest';
import { startTestServer } from './helpers.js';

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

describe('invitation privacy', () => {
  it('returns one identical body for invalid, malformed, revoked, and closed invitations', async () => {
    const server = await startTestServer();
    try {
      const client = server.client();
      const create = async () => (await (await client.request('/api/rooms', json({ displayName: 'Sam' }))).json()) as {
        roomId: string; invitation: { code: string };
      };
      const revoked = await create();
      server.rooms.store.get(revoked.roomId)!.invitation.status = 'REVOKED';
      const closed = await create();
      server.rooms.store.get(closed.roomId)!.status = 'CLOSED';

      const codes = ['ZZZZZZZZZZ', 'abc', revoked.invitation.code, closed.invitation.code];
      const previews = await Promise.all(codes.map((code) => client.request(`/api/invitations/${code}`)));
      const joins = await Promise.all(codes.map((code) => client.request('/api/rooms/join', json({ code, displayName: 'Alex' }))));
      const bodies = await Promise.all([...previews, ...joins].map(async (response) => {
        expect(response.status).toBe(404);
        expect(response.headers.get('content-type')).toContain('application/problem+json');
        return response.json();
      }));

      for (const body of bodies) expect(body).toEqual(bodies[0]);
      expect(Object.keys(bodies[0]).sort()).toEqual(['code', 'detail', 'nextStep', 'status', 'title', 'type']);
      expect(bodies[0]).toMatchObject({ code: 'INVITATION_UNAVAILABLE' });
      expect(JSON.stringify(bodies)).not.toContain(revoked.roomId);
    } finally { await server.close(); }
  });

  it('only discloses a full room through the distinct ROOM_FULL result', async () => {
    const server = await startTestServer();
    try {
      const client = server.client();
      const room = await (await client.request('/api/rooms', json({ displayName: 'Sam' }))).json();
      server.rooms.store.get(room.roomId)!.settings.maxParticipants = 1;
      const join = await server.client().request('/api/rooms/join', json({ code: room.invitation.code, displayName: 'Alex' }));
      expect(join.status).toBe(409);
      expect(await join.json()).toMatchObject({ code: 'ROOM_FULL', nextStep: expect.any(String) });
    } finally { await server.close(); }
  });
});

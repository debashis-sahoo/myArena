import { describe, expect, it } from 'vitest';
import { RoomService } from '../../src/rooms/room-service.js';
import { startTestServer, testConfig } from './helpers.js';

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

describe('capacity', () => {
  it('gives exactly one seat to simultaneous joins on the last seat', async () => {
    const server = await startTestServer();
    try {
      const host = server.client();
      const room = await (await host.request('/api/rooms', json({ displayName: 'Sam' }))).json();
      server.rooms.store.get(room.roomId)!.settings.maxParticipants = 2;
      const responses = await Promise.all(['A', 'B'].map((name) =>
        server.client().request('/api/rooms/join', json({ code: room.invitation.code, displayName: name }))));
      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      const loser = responses.find((response) => response.status === 409)!;
      expect(await loser.json()).toMatchObject({ code: 'ROOM_FULL' });
      expect(server.rooms.store.get(room.roomId)!.participants).toHaveLength(2);
    } finally { await server.close(); }
  });

  it('holds at most 100 participants in one room', () => {
    const rooms = new RoomService({ config: testConfig() });
    const { room } = rooms.createRoom('Host');
    for (let index = 1; index < 100; index++) rooms.joinRoom(room.invitation.code, `Player ${index}`);
    expect(room.participants).toHaveLength(100);
    expect(() => rooms.joinRoom(room.invitation.code, 'One too many')).toThrowError(expect.objectContaining({ code: 'ROOM_FULL' }));
    expect(room.participants).toHaveLength(100);
  });

  it('rejects rooms and participants beyond the service limits with SERVICE_AT_CAPACITY', async () => {
    const config = testConfig({ MAX_ROOMS: '2', MAX_TOTAL_PARTICIPANTS: '3' });
    const server = await startTestServer({ config });
    try {
      const first = await (await server.client().request('/api/rooms', json({ displayName: 'One' }))).json();
      expect((await server.client().request('/api/rooms', json({ displayName: 'Two' }))).status).toBe(201);
      const third = await server.client().request('/api/rooms', json({ displayName: 'Three' }));
      expect(third.status).toBe(503);
      expect(await third.json()).toMatchObject({ code: 'SERVICE_AT_CAPACITY', nextStep: expect.any(String) });

      const join = (name: string) => server.client().request('/api/rooms/join', json({ code: first.invitation.code, displayName: name }));
      expect((await join('Seat 3')).status).toBe(200);
      const overflow = await join('Seat 4');
      expect(overflow.status).toBe(503);
      expect(await overflow.json()).toMatchObject({ code: 'SERVICE_AT_CAPACITY' });
    } finally { await server.close(); }
  });
});

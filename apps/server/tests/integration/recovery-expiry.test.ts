import { describe, expect, it } from 'vitest';
import { setupLobby } from './lobby-helpers.js';

const MINUTE = 60_000;
const join = (code: string, displayName: string) => ({ method: 'POST', body: JSON.stringify({ code, displayName }) });

describe('recovery expiry', () => {
  it('deletes the seat at 10 minutes, refuses the old credential, and restores nothing', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, clock, roomId, code, server } = lobby;
      const alex = players[0]!;
      alex.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');

      clock.advance(10 * MINUTE);
      expect(room.participants.map((member) => member.id)).toEqual([host.id]);
      await host.socket.until(() => host.socket.events().some((event) => event.kind === 'participant.left'));
      expect(host.socket.events().at(-1)).toMatchObject({ kind: 'participant.left', data: { participantId: alex.id } });

      const upgrade = await fetch(`${server.baseUrl}/ws?room=${roomId}`, { headers: { Origin: server.origin, Cookie: await alex.client.jar.getCookieString(server.baseUrl) } });
      expect(upgrade.status).toBe(410);
      expect(await upgrade.json()).toMatchObject({ code: 'RECOVERY_EXPIRED', nextStep: expect.any(String) });
      await expect(alex.client.connect(roomId)).rejects.toThrow();

      const rejoin = await alex.client.request('/api/rooms/join', join(code, 'Alex'));
      expect(rejoin.status).toBe(410);
      expect(await rejoin.json()).toMatchObject({ code: 'RECOVERY_EXPIRED' });
      expect(room.participants).toHaveLength(1);

      const fresh = await server.client().request('/api/rooms/join', join(code, 'Alex'));
      expect(fresh.status).toBe(200);
      expect((await fresh.json()).participantId).not.toBe(alex.id);
    } finally { await lobby.close(); }
  });

  it('keeps the seat until the last millisecond of the window', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, clock } = lobby;
      players[0]!.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      clock.advance(10 * MINUTE - 1);
      expect(room.participants).toHaveLength(2);
      clock.advance(1);
      expect(room.participants).toHaveLength(1);
    } finally { await lobby.close(); }
  });

  it('answers the session probe with 200, 401, or 410 as the seat allows', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, clock, roomId, server } = lobby;
      const alex = players[0]!;
      expect((await alex.client.request(`/api/rooms/${roomId}/session`)).status).toBe(200);
      expect((await server.client().request(`/api/rooms/${roomId}/session`)).status).toBe(401);
      alex.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      expect(await (await alex.client.request(`/api/rooms/${roomId}/session`)).json()).toMatchObject({ connection: 'DISCONNECTED' });
      clock.advance(10 * MINUTE);
      expect((await alex.client.request(`/api/rooms/${roomId}/session`)).status).toBe(410);
    } finally { await lobby.close(); }
  });
});

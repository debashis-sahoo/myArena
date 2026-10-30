import { describe, expect, it } from 'vitest';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';
import { TestClock } from './helpers.js';

const MINUTE = 60_000;

describe('recovery', () => {
  it('keeps a dropped participant seated and restores seat, role, and readiness on reconnect', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, clock, roomId } = lobby;
      const alex = players[0]!;
      await alex.socket.act({ type: 'ready.set', ready: true });
      alex.socket.raw.terminate();
      await host.socket.until(() => host.socket.events().some((event) => event.kind === 'participant.connection'));
      expect(host.socket.events().at(-1)).toMatchObject({ kind: 'participant.connection', data: { participantId: alex.id, connection: 'DISCONNECTED' } });
      expect(room.participants).toHaveLength(2);
      expect(room.participants[1]).toMatchObject({ connection: 'DISCONNECTED' });

      clock.advance(10 * MINUTE - 1);
      const back = await alex.client.connect(roomId);
      const snapshot = lobbyOf(await back.waitFor(isSnapshot));
      expect(snapshot.self).toEqual({ id: alex.id, role: 'PLAYER' });
      expect(snapshot.participants.find((member) => member.id === alex.id)).toMatchObject({ ready: true, connection: 'CONNECTED' });
      expect(snapshot.version).toBe(room.version);
      await host.socket.until(() => host.socket.events().filter((event) => event.kind === 'participant.connection').length === 2);
      expect(host.socket.events().at(-1)).toMatchObject({ version: snapshot.version, data: { connection: 'CONNECTED' } });
      expect(back.events().some((event) => event.kind === 'participant.connection')).toBe(false);

      clock.advance(11 * MINUTE);
      expect(room.participants).toHaveLength(2);
    } finally { await lobby.close(); }
  });

  it('marks a participant disconnected after two missed heartbeat intervals, not before', async () => {
    const heartbeat = new TestClock();
    const lobby = await setupLobby(['Alex'], { heartbeatClock: heartbeat, silentPlayers: true });
    try {
      const { host, room } = lobby;
      heartbeat.advance(20_000);
      heartbeat.advance(20_000);
      expect(room.participants[1]!.connection).toBe('CONNECTED');
      heartbeat.advance(20_000);
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      expect(room.participants).toHaveLength(2);
    } finally { await lobby.close(); }
  });

  it('does not mark a participant disconnected while pongs keep arriving', async () => {
    const heartbeat = new TestClock();
    const lobby = await setupLobby(['Alex'], { heartbeatClock: heartbeat });
    try {
      for (let tick = 0; tick < 6; tick++) {
        heartbeat.advance(20_000);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      expect(lobby.room.participants.every((member) => member.connection === 'CONNECTED')).toBe(true);
    } finally { await lobby.close(); }
  });
});

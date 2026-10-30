import { describe, expect, it } from 'vitest';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';

const MINUTE = 60_000;
const leave = (member: { client: { request(path: string, init?: RequestInit): Promise<Response> } }, roomId: string) =>
  member.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' });
const roles = (room: { participants: { role: string }[] }) => room.participants.map((member) => member.role);

describe('losing the host', () => {
  it('hands off to the earliest connected member when the host leaves, with one host at every version', async () => {
    const lobby = await setupLobby(['Alex', 'Sam', 'Kim']);
    try {
      const { host, players, room, roomId } = lobby;
      const [alex, sam, kim] = players as [typeof players[0], typeof players[0], typeof players[0]];
      alex.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      const version = room.version;

      expect((await leave(host, roomId)).status).toBe(204);
      expect(await host.socket.closed).toBe(4011);
      expect(room.participants.map((member) => [member.displayLabel, member.role])).toEqual([['Alex', 'PLAYER'], ['Sam', 'HOST'], ['Kim', 'PLAYER']]);

      for (const member of [sam, kim]) {
        await member.socket.until(() => member.socket.events().some((event) => event.kind === 'host.changed'));
        const tail = member.socket.events().slice(-2);
        expect(tail.map((event) => [event.version, event.kind])).toEqual([[version + 1, 'participant.left'], [version + 2, 'host.changed']]);
        expect(tail[1]).toMatchObject({ data: { hostParticipantId: sam.id, previousHostParticipantId: host.id } });
      }
      await sam.socket.until(() => sam.socket.log.filter(isSnapshot).length >= 2);
      const view = lobbyOf(sam.socket.log.filter(isSnapshot).at(-1)!);
      expect(view.self.role).toBe('HOST');
      expect(view.invitation).toBeDefined();
      expect(roles(room).filter((role) => role === 'HOST')).toHaveLength(1);
      expect((await sam.socket.act({ type: 'game.select', gameId: 'test-stub' })).status).toBe('ACCEPTED');
    } finally { await lobby.close(); }
  });

  it('hands off when the host stays disconnected past the 10-minute window', async () => {
    const lobby = await setupLobby(['Alex', 'Sam']);
    try {
      const { host, players, room, clock } = lobby;
      host.socket.raw.terminate();
      await players[0]!.socket.until(() => room.participants[0]!.connection === 'DISCONNECTED');
      clock.advance(10 * MINUTE - 1);
      expect(room.participants[0]!.role).toBe('HOST');
      clock.advance(1);

      expect(room.participants.map((member) => [member.displayLabel, member.role])).toEqual([['Alex', 'HOST'], ['Sam', 'PLAYER']]);
      await players[1]!.socket.until(() => players[1]!.socket.events().some((event) => event.kind === 'host.changed'));
      expect(players[1]!.socket.events().at(-1)).toMatchObject({ data: { hostParticipantId: players[0]!.id, previousHostParticipantId: host.id } });
      expect((await players[0]!.socket.act({ type: 'invite.regenerate' })).status).toBe('ACCEPTED');
    } finally { await lobby.close(); }
  });

  it('can hand the role to a disconnected seat holder, and closes once that seat expires', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, clock, roomId, server } = lobby;
      players[0]!.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      await leave(host, roomId);
      expect(room.participants.map((member) => member.role)).toEqual(['HOST']);
      clock.advance(10 * MINUTE);
      expect(server.rooms.store.size).toBe(0);
      expect(room.status).toBe('CLOSED');
    } finally { await lobby.close(); }
  });

  it('closes the room when the last member leaves', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, roomId, server } = lobby;
      await leave(players[0]!, roomId);
      await leave(host, roomId);
      expect(server.rooms.store.size).toBe(0);
      expect(room.participants).toHaveLength(0);
    } finally { await lobby.close(); }
  });

  it('never creates an administrator: every view only has the two room roles', async () => {
    const lobby = await setupLobby(['Alex', 'Sam']);
    try {
      await lobby.host.socket.act({ type: 'host.transfer', targetParticipantId: lobby.players[0]!.id });
      for (const member of lobby.members) {
        await member.socket.act({ type: 'resync' });
        const view = lobbyOf(member.socket.log.filter(isSnapshot).at(-1)!);
        expect(new Set(view.participants.map((participant) => participant.role))).toEqual(new Set(['HOST', 'PLAYER']));
        expect(view.participants.filter((participant) => participant.role === 'HOST')).toHaveLength(1);
      }
    } finally { await lobby.close(); }
  });
});

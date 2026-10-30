import { describe, expect, it } from 'vitest';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';

const hosts = (room: { participants: { role: string }[] }) => room.participants.filter((member) => member.role === 'HOST').length;

describe('explicit host transfer', () => {
  it('makes the target HOST and the former host PLAYER, visibly the same to everyone', async () => {
    const lobby = await setupLobby(['Alex', 'Sam']);
    try {
      const { host, players, room } = lobby;
      const [alex, sam] = players as [typeof players[0], typeof players[0]];
      const version = room.version;
      expect((await host.socket.act({ type: 'host.transfer', targetParticipantId: alex.id })).status).toBe('ACCEPTED');

      expect(room.participants.map((member) => [member.id, member.role])).toEqual([[host.id, 'PLAYER'], [alex.id, 'HOST'], [sam.id, 'PLAYER']]);
      for (const member of lobby.members) {
        await member.socket.until(() => member.socket.events().some((event) => event.kind === 'host.changed'));
        expect(member.socket.events().find((event) => event.kind === 'host.changed')).toMatchObject({
          version: version + 1, data: { hostParticipantId: alex.id, previousHostParticipantId: host.id },
        });
      }

      await alex.socket.until(() => alex.socket.log.filter(isSnapshot).length >= 2);
      const pushed = lobbyOf(alex.socket.log.filter(isSnapshot).at(-1)!);
      expect(pushed.self.role).toBe('HOST');
      expect(pushed.invitation).toBeDefined();

      const former = host.socket.log.length;
      await host.socket.act({ type: 'resync' });
      expect(lobbyOf(host.socket.log.slice(former).find(isSnapshot)!)).not.toHaveProperty('invitation');

      expect((await alex.socket.act({ type: 'invite.regenerate' })).status).toBe('ACCEPTED');
    } finally { await lobby.close(); }
  });

  it('only accepts a current seat holder other than the host as the target', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const version = room.version;
      expect(await host.socket.act({ type: 'host.transfer', targetParticipantId: '98cbf5c1-c22c-4da9-bfc6-df56b99430c8' })).toMatchObject({ code: 'TARGET_NOT_ELIGIBLE' });
      expect(await host.socket.act({ type: 'host.transfer', targetParticipantId: host.id })).toMatchObject({ code: 'TARGET_NOT_ELIGIBLE' });
      expect(await players[0]!.socket.act({ type: 'host.transfer', targetParticipantId: players[0]!.id })).toMatchObject({ code: 'NOT_HOST' });
      expect(room.version).toBe(version);
      expect(hosts(room)).toBe(1);
    } finally { await lobby.close(); }
  });

  it('keeps exactly one host when a transfer races with another room action', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { players, room } = lobby;
      let current = lobby.host;
      let other = players[0]!;
      for (let round = 0; round < 12; round++) {
        const start = room.version;
        const [transfer, raced] = await Promise.all([
          current.socket.act({ type: 'host.transfer', targetParticipantId: other.id }),
          other.socket.act({ type: 'game.select', gameId: 'test-stub' }),
        ]);
        expect(transfer.status).toBe('ACCEPTED');
        expect(hosts(room)).toBe(1);
        if (raced.status === 'ACCEPTED') {
          expect(raced.version).toBe(start + 2);
          expect(room.participants.find((member) => member.role === 'HOST')!.id).toBe(other.id);
        } else {
          expect(raced).toMatchObject({ code: 'NOT_HOST', version: start });
        }
        [current, other] = [other, current];
        room.selectedGameId = null;
      }
      const versions = lobby.host.socket.events().map((event) => event.version);
      expect(versions).toEqual(versions.map((_, index) => versions[0]! + index));
    } finally { await lobby.close(); }
  });
});

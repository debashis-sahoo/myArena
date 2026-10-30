import { describe, expect, it } from 'vitest';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';

describe('lobby flow', () => {
  it('keeps every member on the same ordered versions and state through start, end, rematch, and return', async () => {
    const lobby = await setupLobby(['Alex', 'Sam']);
    try {
      const { host, players, clock, room } = lobby;
      const sockets = lobby.members.map((member) => member.socket);
      const startVersion = room.version;

      for (const player of players) expect((await player.socket.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
      expect((await host.socket.act({ type: 'game.select', gameId: 'test-stub' })).status).toBe('ACCEPTED');
      expect((await host.socket.act({ type: 'settings.update', changes: { maxParticipants: 10 } })).status).toBe('ACCEPTED');
      expect((await host.socket.act({ type: 'match.start' })).status).toBe('ACCEPTED');
      clock.advance(30_000);
      await host.socket.until(() => host.socket.events().some((event) => event.kind === 'match.ended'));
      expect((await host.socket.act({ type: 'match.rematch' })).status).toBe('ACCEPTED');
      clock.advance(30_000);
      await host.socket.until(() => host.socket.events().filter((event) => event.kind === 'match.ended').length === 2);
      expect((await host.socket.act({ type: 'match.returnToLobby' })).status).toBe('ACCEPTED');

      const expectedKinds = [
        'participant.ready', 'participant.ready', 'game.selected', 'settings.updated', 'match.started',
        'match.ended', 'match.rematch', 'match.ended', 'match.returnedToLobby',
      ];
      for (const socket of sockets) await socket.until(() => socket.events().length >= expectedKinds.length);
      const sequences = sockets.map((socket) => socket.events().slice(socket.events().length - expectedKinds.length).map((event) => [event.version, event.kind]));
      const versions = expectedKinds.map((_, index) => startVersion + index + 1);
      for (const sequence of sequences) {
        expect(sequence.map(([version]) => version)).toEqual(versions);
        expect(sequence.map(([, kind]) => kind)).toEqual(expectedKinds);
      }
      expect(room.status).toBe('LOBBY');
      expect(room.matchStatus).toBe('NONE');

      const views = [];
      for (const socket of sockets) {
        const before = socket.log.length;
        await socket.act({ type: 'resync' });
        views.push(lobbyOf(socket.log.slice(before).find(isSnapshot)!));
      }
      for (const view of views) {
        expect(view.version).toBe(room.version);
        expect({ ...view, self: undefined, invitation: undefined }).toEqual({ ...views[0], self: undefined, invitation: undefined });
      }
      expect(views[0]!.settings.maxParticipants).toBe(10);
      expect(views[0]!.participants.every((member) => member.role === 'HOST' || member.ready)).toBe(true);
    } finally { await lobby.close(); }
  });

  it('explains what blocks a start and changes nothing', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      const version = room.version;
      expect(await host.socket.act({ type: 'match.start' })).toMatchObject({ status: 'REJECTED', code: 'NO_GAME_SELECTED', nextStep: expect.any(String) });
      await host.socket.act({ type: 'game.select', gameId: 'test-stub' });
      expect(await host.socket.act({ type: 'match.start' })).toMatchObject({ status: 'REJECTED', code: 'START_BLOCKED_NOT_READY' });
      expect(await host.socket.act({ type: 'game.select', gameId: 'missing' })).toMatchObject({ code: 'GAME_UNAVAILABLE' });
      expect(await host.socket.act({ type: 'match.rematch' })).toMatchObject({ code: 'MATCH_NOT_ENDED' });
      expect(await host.socket.act({ type: 'match.returnToLobby' })).toMatchObject({ code: 'MATCH_NOT_ENDED' });
      expect(await host.socket.act({ type: 'settings.update', changes: { maxParticipants: 1 } })).toMatchObject({ code: 'VALIDATION_FAILED' });

      room.participants[1]!.connection = 'DISCONNECTED';
      await players[0]!.socket.act({ type: 'ready.set', ready: true });
      expect(await host.socket.act({ type: 'match.start' })).toMatchObject({ code: 'START_BLOCKED_DISCONNECTED' });
      expect(room.version).toBe(version + 2);
      expect(room.status).toBe('LOBBY');
      expect(room.matchStatus).toBe('NONE');
    } finally { await lobby.close(); }
  });

  it('regenerates the invitation, revokes the old code, and only shows the new one to the host', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, code, server } = lobby;
      const startHost = host.socket.events().length;
      expect((await host.socket.act({ type: 'invite.regenerate' })).status).toBe('ACCEPTED');
      await players[0]!.socket.until(() => players[0]!.socket.events().some((event) => event.kind === 'invite.regenerated'));
      const hostEvent = host.socket.events().find((event) => event.kind === 'invite.regenerated');
      const playerEvent = players[0]!.socket.events().find((event) => event.kind === 'invite.regenerated');
      expect(hostEvent).toMatchObject({ data: { invitation: { code: expect.not.stringMatching(code) } } });
      expect(playerEvent!.data).toEqual({});
      expect(playerEvent!.version).toBe(hostEvent!.version);
      expect(host.socket.events().length).toBeGreaterThan(startHost);
      const stale = await server.client().request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code, displayName: 'Late' }) });
      expect(stale.status).toBe(404);
    } finally { await lobby.close(); }
  });
});

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { RoomService } from '../../src/rooms/room-service.js';
import { isSnapshot, lobbyOf, setupLobby } from './lobby-helpers.js';
import { startTestServer, testConfig } from './helpers.js';

describe('room chat', () => {
  it('takes the sender from the session and delivers the same message to every member', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room } = lobby;
      expect((await players[0]!.socket.act({ type: 'chat.send', text: '  hello  ' })).status).toBe('ACCEPTED');
      for (const member of lobby.members) await member.socket.until(() => member.socket.events().some((event) => event.kind === 'chat.message'));
      const [hostSees, playerSees] = [host.socket, players[0]!.socket].map((socket) => socket.events().find((event) => event.kind === 'chat.message'));
      expect(hostSees).toEqual(playerSees);
      expect(hostSees!.data).toMatchObject({ message: { text: 'hello', senderLabel: 'Alex', senderParticipantId: players[0]!.id } });
      expect(room.chat).toHaveLength(1);
    } finally { await lobby.close(); }
  });

  it('enforces 1 to 500 characters and ignores any sender field', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const socket = lobby.players[0]!.socket;
      expect((await socket.act({ type: 'chat.send', text: 'a'.repeat(500) })).status).toBe('ACCEPTED');
      expect(await socket.act({ type: 'chat.send', text: 'a'.repeat(501) })).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(await socket.act({ type: 'chat.send', text: '' })).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(await socket.act({ type: 'chat.send', text: '   ' })).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(await socket.act({ type: 'chat.send', text: 'hi', senderLabel: 'Host' })).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(lobby.room.chat).toHaveLength(1);
    } finally { await lobby.close(); }
  });

  it('keeps only the last 200 messages', () => {
    const rooms = new RoomService({ config: testConfig() });
    const { room, participant } = rooms.createRoom('Host');
    for (let index = 0; index < 205; index++) {
      rooms.perform(room, participant, { v: 1, type: 'chat.send', clientActionId: randomUUID(), text: `m${index}` });
    }
    expect(room.chat).toHaveLength(200);
    expect(room.chat[0]!.text).toBe('m5');
    expect(room.chat.at(-1)!.text).toBe('m204');
  });

  it('limits each participant to 5 chat messages and 20 intents per 10 seconds', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { clock, players, host } = lobby;
      const socket = players[0]!.socket;
      for (let index = 0; index < 5; index++) expect((await socket.act({ type: 'chat.send', text: `m${index}` })).status).toBe('ACCEPTED');
      expect(await socket.act({ type: 'chat.send', text: 'too fast' })).toMatchObject({ status: 'REJECTED', code: 'RATE_LIMITED' });
      expect(lobby.room.chat).toHaveLength(5);
      expect((await host.socket.act({ type: 'chat.send', text: 'host is separate' })).status).toBe('ACCEPTED');
      clock.advance(10_000);
      expect((await socket.act({ type: 'chat.send', text: 'later' })).status).toBe('ACCEPTED');

      clock.advance(10_000);
      for (let index = 0; index < 20; index++) expect((await socket.act({ type: 'ready.set', ready: index % 2 === 0 })).status).toBe('ACCEPTED');
      expect(await socket.act({ type: 'ready.set', ready: true })).toMatchObject({ code: 'RATE_LIMITED' });
    } finally { await lobby.close(); }
  });

  it('is visible only to members, including the history a late member receives', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      await lobby.host.socket.act({ type: 'chat.send', text: 'secret plans' });
      const outsider = await fetch(`${lobby.server.baseUrl}/ws?room=${lobby.roomId}`, { headers: { Origin: lobby.server.origin } });
      expect(outsider.status).toBe(401);
      expect(await outsider.text()).not.toContain('secret plans');

      const client = lobby.server.client();
      await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: lobby.code, displayName: 'Late' }) });
      const socket = await client.connect(lobby.roomId);
      expect(lobbyOf(await socket.waitFor(isSnapshot)).chat.map((message) => message.text)).toEqual(['secret plans']);
    } finally { await lobby.close(); }
  });

  it('refuses chat from a connection that is not a member', async () => {
    const server = await startTestServer();
    try {
      const response = await fetch(`${server.baseUrl}/ws?room=${randomUUID()}`, { headers: { Origin: server.origin } });
      expect(response.status).toBe(401);
    } finally { await server.close(); }
  });
});

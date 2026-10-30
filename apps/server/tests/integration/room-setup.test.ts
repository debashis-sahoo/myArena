import { describe, expect, it } from 'vitest';
import type { LobbyView } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { createOnlineStubGame, createStubGame } from '../../src/games/stub-game.js';
import { startTestServer } from './helpers.js';

type Client = ReturnType<Awaited<ReturnType<typeof startTestServer>>['client']>;
const games = () => new GameRegistry([createStubGame(), createOnlineStubGame()]);
const post = (client: Client, path: string, body: unknown, headers: Record<string, string> = {}) =>
  client.request(path, { method: 'POST', body: JSON.stringify(body), headers });
const lobbyOf = (message: { type: string }) => (message as { lobby: LobbyView }).lobby;

describe('creating a room for a game with a chosen player count', () => {
  it('opens the lobby with the game selected, the limit applied and the game defaults', async () => {
    const server = await startTestServer({ games: games() });
    try {
      const host = server.client();
      const response = await post(host, '/api/rooms', { displayName: 'Sam', gameId: 'test-online', maxParticipants: 3 });
      expect(response.status).toBe(201);
      const room = await response.json() as { roomId: string; invitation: { code: string } };
      const lobby = lobbyOf(await (await host.connect(room.roomId)).waitFor((message) => message.type === 'snapshot'));
      expect(lobby.selectedGameId).toBe('test-online');
      expect(lobby.settings.maxParticipants).toBe(3);
      expect(lobby.settings.gameSettings).toMatchObject({ durationSeconds: 30 });
      expect(room.invitation.code).toBeTruthy();
    } finally { await server.close(); }
  });

  it('uses the game default count when none is chosen', async () => {
    const server = await startTestServer({ games: games() });
    try {
      const host = server.client();
      const room = await (await post(host, '/api/rooms', { displayName: 'Sam', gameId: 'test-online' })).json() as { roomId: string };
      const lobby = lobbyOf(await (await host.connect(room.roomId)).waitFor((message) => message.type === 'snapshot'));
      expect(lobby.settings.maxParticipants).toBe(4);
    } finally { await server.close(); }
  });

  it('holds exactly the chosen number of players and turns the next one away', async () => {
    const server = await startTestServer({ games: games() });
    try {
      const room = await (await post(server.client(), '/api/rooms', { displayName: 'Host', gameId: 'test-online', maxParticipants: 3 })).json() as { invitation: { code: string } };
      const code = room.invitation.code;
      expect((await post(server.client(), '/api/rooms/join', { code, displayName: 'Two' })).status).toBe(200);
      expect((await post(server.client(), '/api/rooms/join', { code, displayName: 'Three' })).status).toBe(200);
      const extra = await post(server.client(), '/api/rooms/join', { code, displayName: 'Four' });
      expect(extra.status).toBe(409);
      expect(await extra.json()).toMatchObject({ code: 'ROOM_FULL' });
    } finally { await server.close(); }
  });

  it('refuses an unknown game or a count outside the range and creates no room', async () => {
    const server = await startTestServer({ games: games() });
    try {
      const unknown = await post(server.client(), '/api/rooms', { displayName: 'Sam', gameId: 'missing' });
      expect(unknown.status).toBe(409);
      expect(await unknown.json()).toMatchObject({ code: 'GAME_UNAVAILABLE' });
      for (const maxParticipants of [1, 7]) {
        const bad = await post(server.client(), '/api/rooms', { displayName: 'Sam', gameId: 'test-online', maxParticipants });
        expect(bad.status).toBe(400);
        expect(await bad.json()).toMatchObject({ code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'maxParticipants' }] });
      }
      const withoutGame = await post(server.client(), '/api/rooms', { displayName: 'Sam', maxParticipants: 4 });
      expect(withoutGame.status).toBe(400);
      expect(server.rooms.store.size).toBe(0);
    } finally { await server.close(); }
  });

  it('still creates a plain room from the old body', async () => {
    const server = await startTestServer({ games: games() });
    try {
      const host = server.client();
      const room = await (await post(host, '/api/rooms', { displayName: 'Sam' })).json() as { roomId: string };
      const lobby = lobbyOf(await (await host.connect(room.roomId)).waitFor((message) => message.type === 'snapshot'));
      expect(lobby.selectedGameId).toBeNull();
      expect(lobby.settings.maxParticipants).toBe(100);
    } finally { await server.close(); }
  });

  it('returns one room for a retry with the same key and rejects the key with different choices', async () => {
    const server = await startTestServer({ games: games() });
    try {
      const host = server.client();
      const key = crypto.randomUUID();
      const body = { displayName: 'Sam', gameId: 'test-online', maxParticipants: 3 };
      const first = await (await post(host, '/api/rooms', body, { 'Idempotency-Key': key })).json() as { roomId: string };
      const retry = await (await post(host, '/api/rooms', body, { 'Idempotency-Key': key })).json() as { roomId: string };
      expect(retry.roomId).toBe(first.roomId);
      expect(server.rooms.store.size).toBe(1);
      for (const changed of [{ ...body, maxParticipants: 4 }, { ...body, gameId: 'test-stub' }]) {
        const response = await post(host, '/api/rooms', changed, { 'Idempotency-Key': key });
        expect(response.status).toBe(400);
      }
    } finally { await server.close(); }
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';
import { GameRegistry } from '../../src/games/registry.js';
import { createOnlineStubGame, createStubGame } from '../../src/games/stub-game.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig, testOrigin } from '../integration/helpers.js';
import { validateResponse } from './helpers.js';

let app: FastifyInstance;
beforeEach(async () => {
  const config = testConfig();
  app = await buildApp({ config, rooms: new RoomService({ config, games: new GameRegistry([createStubGame(), createOnlineStubGame()]) }), logger: false });
});
afterEach(() => app.close());

const post = (body: unknown) =>
  app.inject({ method: 'POST', url: '/api/rooms', headers: { origin: testOrigin, 'content-type': 'application/json' }, payload: JSON.stringify(body) });

describe('POST /api/rooms with a game and player count', () => {
  it('returns 201 matching the contract', async () => {
    const response = await post({ displayName: 'Sam', gameId: 'test-online', maxParticipants: 4 });
    expect(response.statusCode).toBe(201);
    validateResponse('/api/rooms', 'post', 201, response.json());
  });

  it('returns 400 with field errors for a count outside the range', async () => {
    const response = await post({ displayName: 'Sam', gameId: 'test-online', maxParticipants: 9 });
    expect(response.statusCode).toBe(400);
    validateResponse('/api/rooms', 'post', 400, response.json());
    expect(response.json().fieldErrors).toEqual([{ field: 'maxParticipants', message: 'Choose a number of players from 2 to 6.' }]);
  });

  it('returns 409 GAME_UNAVAILABLE for an unknown game', async () => {
    const response = await post({ displayName: 'Sam', gameId: 'nope' });
    expect(response.statusCode).toBe(409);
    validateResponse('/api/rooms', 'post', 409, response.json());
    expect(response.json().code).toBe('GAME_UNAVAILABLE');
  });
});

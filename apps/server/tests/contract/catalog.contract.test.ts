import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';
import { GameRegistry } from '../../src/games/registry.js';
import { createOnlineStubGame, createStubGame } from '../../src/games/stub-game.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig } from '../integration/helpers.js';
import { validateResponse } from './helpers.js';

let app: FastifyInstance;
afterEach(() => app.close());

async function catalog(games: GameRegistry) {
  const config = testConfig();
  app = await buildApp({ config, rooms: new RoomService({ config, games }), logger: false });
  return app.inject('/api/catalog');
}

describe('GET /api/catalog', () => {
  it('matches the contract with the test games registered', async () => {
    const response = await catalog(new GameRegistry([createStubGame(), createOnlineStubGame()]));
    expect(response.statusCode).toBe(200);
    validateResponse('/api/catalog', 'get', 200, response.json());
    expect(response.json().entries.slice(0, 2).map((entry: { id: string }) => entry.id)).toEqual(['test-stub', 'test-online']);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('matches the contract with no playable game and shows every entry as coming soon', async () => {
    const response = await catalog(new GameRegistry());
    validateResponse('/api/catalog', 'get', 200, response.json());
    expect(response.json().entries.every((entry: { status: string }) => entry.status === 'COMING_SOON')).toBe(true);
  });

  it('keeps GET /api/games limited to online-capable games with the four lobby fields', async () => {
    await catalog(new GameRegistry([createStubGame(), createOnlineStubGame()]));
    const games = (await app.inject('/api/games')).json().games;
    expect(games).toEqual([
      { id: 'test-stub', name: 'Test match', minParticipants: 2, maxParticipants: 100 },
      { id: 'test-online', name: 'Test room game', minParticipants: 2, maxParticipants: 6 },
    ]);
  });
});

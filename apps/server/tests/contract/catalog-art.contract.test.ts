import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';
import { GameRegistry } from '../../src/games/registry.js';
import { createLudoGame } from '../../src/games/ludo/ludo-game.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig } from '../integration/helpers.js';
import { validateResponse } from './helpers.js';

let app: FastifyInstance;
afterEach(() => app.close());

describe('GET /api/catalog with the Ludo picture', () => {
  it('returns Ludo as playable, in both modes, with the LUDO picture, and matches the contract', async () => {
    const config = testConfig();
    app = await buildApp({ config, rooms: new RoomService({ config, games: new GameRegistry([createLudoGame()]) }), logger: false });
    const response = await app.inject('/api/catalog');
    expect(response.statusCode).toBe(200);
    validateResponse('/api/catalog', 'get', 200, response.json());
    const entries: Array<{ id: string; status: string; modes: string[]; art: { image?: string } }> = response.json().entries;
    const ludo = entries.filter((entry) => entry.id === 'ludo');
    expect(ludo).toHaveLength(1);
    expect(ludo[0]).toMatchObject({ status: 'PLAYABLE', art: { image: 'LUDO' } });
    expect([...ludo[0]!.modes].sort()).toEqual(['ONLINE', 'SOLO_AI']);
  });

  it('leaves the picture off every other entry', async () => {
    const config = testConfig();
    app = await buildApp({ config, rooms: new RoomService({ config, games: new GameRegistry([createLudoGame()]) }), logger: false });
    const entries: Array<{ id: string; art: { image?: string } }> = (await app.inject('/api/catalog')).json().entries;
    expect(entries.filter((entry) => entry.id !== 'ludo').every((entry) => entry.art.image === undefined)).toBe(true);
  });
});

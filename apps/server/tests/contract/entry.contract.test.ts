import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';
import { GameRegistry } from '../../src/games/registry.js';
import { createStubGame } from '../../src/games/stub-game.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig, testOrigin } from '../integration/helpers.js';
import { validateResponse } from './helpers.js';

let app: FastifyInstance;
let rooms: RoomService;

beforeEach(async () => {
  const config = testConfig();
  rooms = new RoomService({ config, games: new GameRegistry([createStubGame()]) });
  app = await buildApp({ config, rooms, logger: false });
});
afterEach(() => app.close());

const post = (url: string, body: unknown) =>
  app.inject({ method: 'POST', url, headers: { origin: testOrigin, 'content-type': 'application/json' }, payload: JSON.stringify(body) });

describe('POST /api/rooms', () => {
  it('creates a room, sets the member cookie, and returns the host invitation', async () => {
    const response = await post('/api/rooms', { displayName: 'Sam' });
    const body = response.json();
    expect(response.statusCode).toBe(201);
    validateResponse('/api/rooms', 'post', 201, body);
    expect(body).toMatchObject({ role: 'HOST', invitation: { link: `/join/${body.invitation.code}` } });
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain(`mah_m_${body.roomId}=`);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) expect(cookie).toContain(flag);
  });

  it('rejects invalid names and unknown fields with field errors', async () => {
    for (const payload of [{ displayName: '<b>' }, { displayName: 'Sam', role: 'HOST' }, {}]) {
      const response = await post('/api/rooms', payload);
      expect(response.statusCode).toBe(400);
      validateResponse('/api/rooms', 'post', 400, response.json());
      expect(response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    expect((await post('/api/rooms', { displayName: '<b>' })).json().fieldErrors).toEqual([
      { field: 'displayName', message: expect.any(String) },
    ]);
  });
});

describe('GET /api/invitations/{code}', () => {
  it('confirms a usable invitation without room data and refuses caching', async () => {
    const { invitation } = (await post('/api/rooms', { displayName: 'Sam' })).json();
    const response = await app.inject(`/api/invitations/${invitation.code}`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ available: true });
    expect(response.headers['cache-control']).toBe('no-store');
    validateResponse('/api/invitations/{code}', 'get', 200, response.json());
  });

  it('returns the unavailable problem for unknown codes and ROOM_FULL for full rooms', async () => {
    const unknown = await app.inject('/api/invitations/ZZZZZZZZZZ');
    expect(unknown.statusCode).toBe(404);
    validateResponse('/api/invitations/{code}', 'get', 404, unknown.json());
    const { roomId, invitation } = (await post('/api/rooms', { displayName: 'Sam' })).json();
    rooms.store.get(roomId)!.settings.maxParticipants = 1;
    const full = await app.inject(`/api/invitations/${invitation.code}`);
    expect(full.statusCode).toBe(409);
    validateResponse('/api/invitations/{code}', 'get', 409, full.json());
    expect(full.json().code).toBe('ROOM_FULL');
  });
});

describe('POST /api/rooms/join', () => {
  it('seats a player without disclosing the invitation', async () => {
    const { invitation } = (await post('/api/rooms', { displayName: 'Sam' })).json();
    const response = await post('/api/rooms/join', { code: invitation.code, displayName: 'Alex' });
    expect(response.statusCode).toBe(200);
    validateResponse('/api/rooms/join', 'post', 200, response.json());
    expect(response.json()).toMatchObject({ role: 'PLAYER' });
    expect(response.json()).not.toHaveProperty('invitation');
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
  });

  it('maps validation, unavailable, and full-room failures to the contract', async () => {
    const missingName = await post('/api/rooms/join', { code: 'ZZZZZZZZZZ' });
    expect(missingName.statusCode).toBe(400);
    validateResponse('/api/rooms/join', 'post', 400, missingName.json());
    const unknown = await post('/api/rooms/join', { code: 'ZZZZZZZZZZ', displayName: 'Alex' });
    expect(unknown.statusCode).toBe(404);
    validateResponse('/api/rooms/join', 'post', 404, unknown.json());
    const { roomId, invitation } = (await post('/api/rooms', { displayName: 'Sam' })).json();
    rooms.store.get(roomId)!.settings.maxParticipants = 1;
    const full = await post('/api/rooms/join', { code: invitation.code, displayName: 'Alex' });
    expect(full.statusCode).toBe(409);
    validateResponse('/api/rooms/join', 'post', 409, full.json());
  });
});

describe('GET /api/games', () => {
  it('lists descriptors without schemas', async () => {
    const response = await app.inject('/api/games');
    expect(response.statusCode).toBe(200);
    validateResponse('/api/games', 'get', 200, response.json());
    expect(response.json().games).toEqual([{ id: 'test-stub', name: 'Test match', minParticipants: 2, maxParticipants: 100 }]);
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig, testOrigin } from '../integration/helpers.js';
import { validateResponse } from './helpers.js';

let app: FastifyInstance;
let rooms: RoomService;
let roomId: string;
let cookie: string;

beforeEach(async () => {
  const config = testConfig();
  rooms = new RoomService({ config });
  app = await buildApp({ config, rooms, logger: false });
  const created = await app.inject({ method: 'POST', url: '/api/rooms', headers: { origin: testOrigin, 'content-type': 'application/json' }, payload: JSON.stringify({ displayName: 'Sam' }) });
  roomId = created.json().roomId;
  cookie = String(created.headers['set-cookie']).split(';')[0]!;
});
afterEach(() => app.close());

const get = (url: string, withCookie = true) => app.inject({ url, headers: withCookie ? { cookie } : {} });
const leave = (url: string, withCookie = true) => app.inject({ method: 'POST', url, headers: { origin: testOrigin, ...(withCookie ? { cookie } : {}) } });

describe('GET /api/rooms/{roomId}/session', () => {
  it('confirms a held seat', async () => {
    const response = await get(`/api/rooms/${roomId}/session`);
    expect(response.statusCode).toBe(200);
    validateResponse('/api/rooms/{roomId}/session', 'get', 200, response.json());
    expect(response.json()).toMatchObject({ roomId, role: 'HOST', connection: 'CONNECTED' });
  });

  it('answers 401 without a credential and 410 once the seat is gone', async () => {
    const missing = await get(`/api/rooms/${roomId}/session`, false);
    expect(missing.statusCode).toBe(401);
    validateResponse('/api/rooms/{roomId}/session', 'get', 401, missing.json());
    rooms.store.get(roomId)!.participants.length = 0;
    const gone = await get(`/api/rooms/${roomId}/session`);
    expect(gone.statusCode).toBe(410);
    validateResponse('/api/rooms/{roomId}/session', 'get', 410, gone.json());
    expect(gone.json()).toMatchObject({ code: 'RECOVERY_EXPIRED', nextStep: expect.any(String) });
  });
});

describe('POST /api/rooms/{roomId}/leave', () => {
  it('returns 204 with no body, and repeats as 204', async () => {
    const first = await leave(`/api/rooms/${roomId}/leave`);
    expect(first.statusCode).toBe(204);
    validateResponse('/api/rooms/{roomId}/leave', 'post', 204, first.body === '' ? undefined : first.body);
    expect((await leave(`/api/rooms/${roomId}/leave`)).statusCode).toBe(204);
  });

  it('answers 401 without a credential', async () => {
    const response = await leave(`/api/rooms/${roomId}/leave`, false);
    expect(response.statusCode).toBe(401);
    validateResponse('/api/rooms/{roomId}/leave', 'post', 401, response.json());
  });
});

describe('POST /api/rooms/join with a credential for the room', () => {
  const join = () => app.inject({
    method: 'POST', url: '/api/rooms/join', headers: { origin: testOrigin, 'content-type': 'application/json', cookie },
    payload: JSON.stringify({ code: rooms.store.get(roomId)!.invitation.code, displayName: 'Sam' }),
  });

  it('returns the existing seat while it is held and 410 once it is gone', async () => {
    const held = await join();
    expect(held.statusCode).toBe(200);
    expect(held.json().participantId).toBe(rooms.store.get(roomId)!.participants[0]!.id);
    expect(rooms.store.get(roomId)!.participants).toHaveLength(1);

    rooms.store.get(roomId)!.participants.length = 0;
    const expired = await join();
    expect(expired.statusCode).toBe(410);
    validateResponse('/api/rooms/join', 'post', 410, expired.json());
  });
});

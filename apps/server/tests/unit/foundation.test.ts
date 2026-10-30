import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';
import { issueToken, hashToken, verifyToken } from '../../src/auth/tokens.js';
import { memberCookieOptions, memberCookieName } from '../../src/auth/cookies.js';
import { createLogger } from '../../src/observability/logger.js';
import { MemoryRoomStore } from '../../src/store/memory-room-store.js';
import { buildApp } from '../../src/http/app.js';
import { GameRegistry } from '../../src/games/registry.js';
import { createStubGame } from '../../src/games/stub-game.js';
import { TestClock } from '../integration/helpers.js';

describe('server foundation', () => {
  it('exposes descriptors without schemas and ends the stub match through the injected clock', () => {
    const game = createStubGame();
    const registry = new GameRegistry([game]);
    expect(registry.list()).toEqual([{ id: 'test-stub', name: 'Test match', minParticipants: 2, maxParticipants: 100 }]);
    expect(game.descriptor.settingsSchema.safeParse({}).success).toBe(true);
    expect(game.descriptor.settingsSchema.safeParse({ durationSeconds: 0 }).success).toBe(false);
    expect(() => new GameRegistry([game, game])).toThrow();
    const clock = new TestClock();
    let ended = false;
    game.onMatchStart({ roomId: 'test', participantIds: ['one', 'two'], settings: { durationSeconds: 1 }, clock, endMatch: () => { ended = true; game.onMatchEnd('test'); } });
    clock.advance(999);
    expect(ended).toBe(false);
    clock.advance(1);
    expect(ended).toBe(true);
  });
  it('uses the published limits and rejects unsafe production origins', () => {
    expect(parseEnv({})).toMatchObject({ port: 3000, maxRooms: 20, maxTotalParticipants: 200, recoveryWindowMs: 600_000, heartbeatMs: 20_000 });
    expect(() => parseEnv({ PORT: 'NaN' })).toThrow();
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow();
    expect(() => parseEnv({ ALLOWED_ORIGINS: '*' })).toThrow();
  });
  it('issues opaque 256-bit credentials and verifies hashes', () => {
    const token = issueToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(issueToken()).not.toBe(token);
    expect(verifyToken(token, hashToken(token))).toBe(true);
    expect(verifyToken(issueToken(), hashToken(token))).toBe(false);
    expect(verifyToken(token, Buffer.alloc(1))).toBe(false);
  });
  it('always uses the required cookie flags', () => {
    expect(memberCookieName('room')).toBe('mah_m_room');
    expect(memberCookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  });
  it('redacts credentials by key and invitation paths', () => {
    let output = '';
    const stream = new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } });
    const logger = createLogger(stream);
    logger.info({ nested: { token: 'secret-token', cookie: 'secret-cookie', invitation: { code: 'ABCDEFGH23' } }, url: '/join/ABCDEFGH23?token=secret-query' }, 'request');
    logger.info({ req: { method: 'GET', url: '/api/invitations/ABCDEFGH23' } }, 'request');
    for (const secret of ['secret-token', 'secret-cookie', 'ABCDEFGH23', 'secret-query']) expect(output).not.toContain(secret);
  });
  it('removes invitation lookups when rooms are deleted or revoked', () => {
    const store = new MemoryRoomStore();
    const room = { id: randomUUID(), invitation: { code: 'ABCDEFGH23', status: 'ACTIVE' as 'ACTIVE' | 'REVOKED' } };
    store.set(room);
    expect(store.byInvitation(room.invitation.code)).toBe(room);
    room.invitation.status = 'REVOKED';
    expect(store.byInvitation(room.invitation.code)).toBeUndefined();
    store.delete(room.id);
    expect(store.get(room.id)).toBeUndefined();
    expect(store.size).toBe(0);
  });
  it('serves health, CSP, and rejects state-changing requests without an allowed origin', async () => {
    const app = await buildApp({ logger: false });
    try {
      const health = await app.inject('/healthz');
      expect(health.json()).toEqual({ status: 'ok' });
      expect(health.headers['content-security-policy']).toContain("script-src 'self'");
      const denied = await app.inject({ method: 'POST', url: '/api/unknown', headers: { origin: 'https://evil.example' } });
      expect(denied.statusCode).toBe(403);
      expect(denied.headers['content-type']).toContain('application/problem+json');
      expect(denied.json()).toMatchObject({ code: 'ORIGIN_NOT_ALLOWED', nextStep: expect.any(String) });
    } finally { await app.close(); }
  });
});
import Fastify from 'fastify';
import type { DestinationStream } from 'pino';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { parseEnv, type Environment } from '../config/env.js';
import { createLogger } from '../observability/logger.js';
import { ProblemError, sendProblem } from './problem.js';
import { registerGateway, type GatewayOptions } from '../realtime/gateway.js';
import { broadcast } from '../realtime/broadcast.js';
import { RoomService } from '../rooms/room-service.js';
import { eventFor } from '../rooms/projection.js';
import { createIntentHandlers } from '../realtime/intents.js';
import { IntentRateLimiter } from '../realtime/rate-limit.js';
import { IdempotencyStore } from './idempotency.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import { registerGameRoutes } from './routes/games.js';
import { registerInvitationRoutes } from './routes/invitations.js';
import { registerRoomRoutes } from './routes/rooms.js';
import { registerSessionRoutes } from './routes/session.js';

declare module 'fastify' {
  interface FastifyInstance { closeSockets(): void; }
}

export interface AppOptions {
  config?: Environment;
  logger?: false;
  logStream?: DestinationStream;
  rooms?: RoomService;
  gateway?: Omit<GatewayOptions, 'allowedOrigins' | 'heartbeatMs'>;
}

export async function buildApp(options: AppOptions = {}) {
  const config = options.config ?? parseEnv();
  const rooms = options.rooms ?? new RoomService({ config });
  const idempotency = new IdempotencyStore();
  const limiter = new IntentRateLimiter();
  const intents = createIntentHandlers({ rooms, limiter });
  const app = Fastify({
    ...(options.logger === false ? { logger: false } : { loggerInstance: createLogger(options.logStream) }),
    bodyLimit: 4096, trustProxy: (_address, hop) => hop < 1,
  });
  await app.register(helmet, {
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
      connectSrc: ["'self'"], imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"],
      baseUri: ["'none'"], frameAncestors: ["'none'"], formAction: ["'self'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
    } },
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false, max: 30, timeWindow: '1 minute',
    errorResponseBuilder: () => new ProblemError('RATE_LIMITED'),
  });
  app.addHook('onRequest', async (request, reply) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && !config.allowedOrigins.includes(request.headers.origin ?? '')) {
      return sendProblem(reply, 'ORIGIN_NOT_ALLOWED');
    }
  });
  app.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode === 429) reply.type('application/problem+json');
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    return payload;
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ProblemError) return sendProblem(reply, error.code, error.fieldErrors);
    if (error instanceof ZodError) {
      return sendProblem(reply, 'VALIDATION_FAILED', error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
    }
    if (error instanceof Error && 'statusCode' in error && [400, 413].includes(Number(error.statusCode))) return sendProblem(reply, 'VALIDATION_FAILED');
    request.log.error({ err: error }, 'Request failed.');
    return reply.code(500).type('application/problem+json').send({
      type: 'urn:myarena:problem:internal', title: 'The request could not be completed.', status: 500,
      detail: 'The request could not be completed.', nextStep: 'Try again later.',
    });
  });
  app.get('/healthz', async () => ({ status: 'ok' }));
  registerGameRoutes(app, rooms.games);
  registerCatalogRoutes(app, rooms.games, config.rateLimits.preview);
  registerInvitationRoutes(app, rooms, config.rateLimits.preview);
  registerRoomRoutes(app, { rooms, idempotency, limits: config.rateLimits });
  registerSessionRoutes(app, rooms);
  const connections = await registerGateway(app, {
    authenticate: (roomId, token) => rooms.authenticate(roomId, token),
    onConnect: (identity, sockets) => {
      rooms.markConnected(identity);
      const snapshot = rooms.snapshotFor(identity);
      if (snapshot) sockets.send(identity, snapshot);
    },
    onDisconnect: (identity) => rooms.markDisconnected(identity),
    onIntent: intents.onIntent,
    onInvalid: intents.onInvalid,
    ...options.gateway,
    allowedOrigins: config.allowedOrigins,
    heartbeatMs: config.heartbeatMs,
  });
  app.decorate('closeSockets', () => connections.dispose());
  rooms.publish = (roomId, event, except) => broadcast(connections, roomId, (recipient) => {
    if (recipient.participantId === except) return undefined;
    const viewer = rooms.findParticipant(roomId, recipient.participantId)?.participant;
    return viewer ? eventFor(event, viewer) : undefined;
  });
  rooms.publishGame = (roomId, { matchId, seq, events }) => broadcast(connections, roomId, (recipient) => {
    const state = rooms.gameView(roomId, recipient.participantId);
    return state === null ? undefined : { v: 1, type: 'game', matchId, seq, state, events: [...events] };
  });
  rooms.onMatchLifecycle = (event) => app.log.info({ matchLifecycle: event }, 'Match lifecycle.');
  rooms.onSeatReleased = (roomId, participantId, reason) => {
    const identity = { roomId, participantId };
    limiter.forget(participantId);
    if (reason === 'expired') return;
    connections.send(identity, { v: 1, type: 'closing', reason });
    connections.close(identity, reason === 'left' ? 4011 : 4012, reason === 'left' ? 'Left the room.' : 'Removed by the host.');
  };
  rooms.onHostChanged = (roomId, hostParticipantId) => {
    const identity = { roomId, participantId: hostParticipantId };
    const snapshot = rooms.snapshotFor(identity);
    if (snapshot) connections.send(identity, snapshot);
  };
  rooms.onRoomClosed = (roomId, participantIds) => {
    idempotency.deleteRoom(roomId);
    for (const participantId of participantIds) {
      const identity = { roomId, participantId };
      limiter.forget(participantId);
      connections.send(identity, { v: 1, type: 'closing', reason: 'closed' });
      connections.close(identity, 4010, 'Room closed.');
    }
  };
  const webRoot = fileURLToPath(new URL('../../../web/dist/', import.meta.url));
  if (existsSync(webRoot)) {
    await app.register(staticFiles, { root: webRoot });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/') && request.url !== '/ws' && !request.url.startsWith('/assets/')) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.code(404).send({ message: 'Not found.' });
    });
  }
  return app;
}
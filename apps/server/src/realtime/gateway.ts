import websocket from '@fastify/websocket';
import { z } from 'zod';
import { parseClientFrame, rejections, type ClientIntent } from '@myarena/protocol';
import type { Clock } from '@myarena/game-sdk';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { memberCookieName } from '../auth/cookies.js';
import { ProblemError } from '../http/problem.js';
import { Connections, type ConnectionIdentity } from './connections.js';

export interface GatewayOptions {
  allowedOrigins: string[];
  heartbeatMs: number;
  clock?: Clock;
  authenticate?: (roomId: string, token: string) => ConnectionIdentity;
  onConnect?: (identity: ConnectionIdentity, connections: Connections) => void;
  onDisconnect?: (identity: ConnectionIdentity) => void;
  onIntent?: (identity: ConnectionIdentity, intent: ClientIntent, connections: Connections) => void;
  onInvalid?: (identity: ConnectionIdentity, frame: string, connections: Connections) => boolean;
}

export async function registerGateway(app: FastifyInstance, options: GatewayOptions) {
  const connections = new Connections(options.onDisconnect, options.clock, options.heartbeatMs);
  const identities = new WeakMap<FastifyRequest, ConnectionIdentity>();
  await app.register(websocket, { options: { maxPayload: 4096 } });
  app.get('/ws', {
    websocket: true,
    preValidation: async (request) => {
      if (!options.allowedOrigins.includes(request.headers.origin ?? '')) throw new ProblemError('ORIGIN_NOT_ALLOWED');
      const { room } = z.strictObject({ room: z.uuid() }).parse(request.query);
      const token = request.cookies[memberCookieName(room)];
      if (!token || !options.authenticate) throw new ProblemError('UNAUTHENTICATED');
      identities.set(request, options.authenticate(room, token));
    },
  }, (socket, request) => {
    const identity = identities.get(request)!;
    connections.attach(identity, socket);
    socket.on('message', (frame, isBinary) => {
      if (isBinary) { socket.close(1003, 'Only JSON text frames are supported.'); return; }
      let intent: ClientIntent;
      const text = frame.toString();
      try { intent = parseClientFrame(text); }
      catch {
        if (!options.onInvalid?.(identity, text, connections)) socket.close(1008, 'Invalid room message.');
        return;
      }
      if (intent.type === 'ping') {
        connections.send(identity, { v: 1, type: 'pong' });
        connections.send(identity, { v: 1, type: 'ack', clientActionId: intent.clientActionId, status: 'ACCEPTED', version: 0 });
      } else if (options.onIntent) {
        options.onIntent(identity, intent, connections);
      } else {
        connections.send(identity, { v: 1, type: 'ack', clientActionId: intent.clientActionId, status: 'REJECTED', version: 0, code: 'ROOM_CLOSED', ...rejections.ROOM_CLOSED });
      }
    });
    options.onConnect?.(identity, connections);
  });
  app.addHook('preClose', async () => { connections.dispose(); });
  return connections;
}
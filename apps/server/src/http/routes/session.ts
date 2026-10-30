import { z } from '@myarena/protocol';
import type { FastifyInstance } from 'fastify';
import { clearMemberCookie, memberCookieName } from '../../auth/cookies.js';
import { ProblemError } from '../../errors.js';
import type { RoomService } from '../../rooms/room-service.js';

const params = z.object({ roomId: z.uuid() });

export function registerSessionRoutes(app: FastifyInstance, rooms: RoomService): void {
  app.get('/api/rooms/:roomId/session', async (request) => {
    const { roomId } = params.parse(request.params);
    const token = request.cookies[memberCookieName(roomId)];
    if (!token) throw new ProblemError('UNAUTHENTICATED');
    const { participant } = rooms.sessionFor(roomId, token);
    return { roomId, participantId: participant.id, role: participant.role, connection: participant.connection };
  });

  app.post('/api/rooms/:roomId/leave', async (request, reply) => {
    const { roomId } = params.parse(request.params);
    const token = request.cookies[memberCookieName(roomId)];
    if (!token) throw new ProblemError('UNAUTHENTICATED');
    rooms.leaveRoom(roomId, token);
    clearMemberCookie(reply, roomId);
    return reply.code(204).send();
  });
}

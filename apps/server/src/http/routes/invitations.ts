import { z } from '@myarena/protocol';
import type { FastifyInstance } from 'fastify';
import type { RoomService } from '../../rooms/room-service.js';

export function registerInvitationRoutes(app: FastifyInstance, rooms: RoomService, limit: number): void {
  app.get('/api/invitations/:code', { config: { rateLimit: { max: limit, timeWindow: '1 minute' } } }, async (request) => {
    const { code } = z.object({ code: z.string() }).parse(request.params);
    rooms.previewInvitation(code);
    return { available: true };
  });
}

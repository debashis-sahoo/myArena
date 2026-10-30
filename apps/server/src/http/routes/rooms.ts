import { displayNameSchema, z } from '@myarena/protocol';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { memberCookieName, setMemberCookie } from '../../auth/cookies.js';
import { ProblemError } from '../../errors.js';
import { normalizeInvitationCode } from '../../rooms/invitation.js';
import type { Entry, RoomService } from '../../rooms/room-service.js';
import { validateRoomSetup } from '../../rooms/room-setup.js';
import type { IdempotencyStore } from '../idempotency.js';

const createBody = z.strictObject({
  displayName: displayNameSchema,
  gameId: z.string().min(1).max(64).optional(),
  maxParticipants: z.number().optional(),
});
const joinBody = z.strictObject({ code: z.string().min(1).max(64), displayName: displayNameSchema });
const keySchema = z.uuid().optional();

export interface EntryRoutesDeps { rooms: RoomService; idempotency: IdempotencyStore; limits: { create: number; join: number }; }

export function registerRoomRoutes(app: FastifyInstance, { rooms, idempotency, limits }: EntryRoutesDeps): void {
  function enter(request: FastifyRequest, reply: FastifyReply, scope: string, fingerprint: string, status: number, admit: () => Entry) {
    const parsedKey = keySchema.safeParse(request.headers['idempotency-key']);
    if (!parsedKey.success) throw new ProblemError('VALIDATION_FAILED');
    const key = parsedKey.data;
    const record = key ? idempotency.get(scope, key) : undefined;
    if (record) {
      if (record.fingerprint !== fingerprint) throw new ProblemError('VALIDATION_FAILED');
      const existing = rooms.findParticipant(record.roomId, record.participantId);
      if (existing) {
        setMemberCookie(reply, existing.room.id, rooms.rotateToken(existing.participant));
        return reply.code(status).send(rooms.entryResult(existing.room, existing.participant));
      }
      idempotency.delete(scope, key!);
    }
    const { room, participant, token } = admit();
    if (key) idempotency.set(scope, key, { fingerprint, roomId: room.id, participantId: participant.id });
    setMemberCookie(reply, room.id, token);
    return reply.code(status).send(rooms.entryResult(room, participant));
  }

  app.post('/api/rooms', { config: { rateLimit: { max: limits.create, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { displayName, gameId, maxParticipants } = createBody.parse(request.body);
    const checked = validateRoomSetup(rooms.games, { gameId, maxParticipants });
    if (!checked.ok) throw new ProblemError(checked.code, checked.fieldErrors);
    const fingerprint = `${displayName}|${gameId ?? ''}|${maxParticipants ?? ''}`;
    return enter(request, reply, 'create', fingerprint, 201, () => rooms.createRoom(displayName, checked.setup));
  });

  app.post('/api/rooms/join', { config: { rateLimit: { max: limits.join, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { code, displayName } = joinBody.parse(request.body);
    const normalized = normalizeInvitationCode(code);
    return enter(request, reply, 'join', `${normalized}|${displayName}`, 200, () =>
      rooms.joinRoom(normalized, displayName, (roomId) => request.cookies[memberCookieName(roomId)]));
  });
}

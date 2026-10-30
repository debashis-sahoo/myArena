import { rejections, z, type Ack, type ClientIntent, type RejectionCode } from '@myarena/protocol';
import { authorize } from './authorize.js';
import type { Connections, ConnectionIdentity } from './connections.js';
import type { IntentRateLimiter } from './rate-limit.js';
import type { RoomService } from '../rooms/room-service.js';
import { reject } from '../rooms/outcome.js';

export const rejectionAck = (clientActionId: string, version: number, code: RejectionCode): Ack =>
  ({ v: 1, type: 'ack', clientActionId, status: 'REJECTED', version, code, ...rejections[code] });

const frameHeader = z.looseObject({ clientActionId: z.uuid(), type: z.string().optional() });
const IMPERSONATION_FIELDS = ['participantId', 'targetParticipantId', 'userId'];

export interface IntentDeps { rooms: RoomService; limiter: IntentRateLimiter; }

export function createIntentHandlers({ rooms, limiter }: IntentDeps) {
  const versionOf = (roomId: string) => rooms.store.get(roomId)?.version ?? 0;

  function onIntent(identity: ConnectionIdentity, intent: ClientIntent, connections: Connections): void {
    const found = rooms.findParticipant(identity.roomId, identity.participantId);
    if (!found) { connections.send(identity, rejectionAck(intent.clientActionId, 0, 'ROOM_CLOSED')); return; }
    const { room, participant } = found;
    const now = rooms.now();

    const replay = participant.actionLog.get(intent.clientActionId, now);
    if (replay) { connections.send(identity, replay); return; }
    if (!limiter.allow(participant.id, intent.type === 'chat.send', now)) {
      connections.send(identity, rejectionAck(intent.clientActionId, room.version, 'RATE_LIMITED'));
      return;
    }

    const denied = authorize(participant, intent);
    const outcome = denied ? reject(denied) : rooms.perform(room, participant, intent);
    const ack: Ack = outcome.ok
      ? { v: 1, type: 'ack', clientActionId: intent.clientActionId, status: 'ACCEPTED', version: room.version }
      : rejectionAck(intent.clientActionId, room.version, outcome.code);
    participant.actionLog.record(intent.clientActionId, ack, now);

    if (intent.type === 'resync' && outcome.ok) {
      const snapshot = rooms.snapshotFor(identity);
      if (snapshot) connections.send(identity, snapshot);
    }
    connections.send(identity, ack);
    if (outcome.ok) outcome.after?.();
  }

  // Invalid frames that still name an action get a rejection instead of dropping the connection.
  function onInvalid(identity: ConnectionIdentity, frame: string, connections: Connections): boolean {
    let value: unknown;
    try { value = JSON.parse(frame); } catch { return false; }
    const header = frameHeader.safeParse(value);
    if (!header.success) return false;
    const { clientActionId, type } = header.data;
    const impersonation = type === 'ready.set' && IMPERSONATION_FIELDS.some((field) => field in header.data);
    const limited = !limiter.allow(identity.participantId, false, rooms.now());
    const code: RejectionCode = limited ? 'RATE_LIMITED' : impersonation ? 'FORBIDDEN_TARGET' : 'VALIDATION_FAILED';
    connections.send(identity, rejectionAck(clientActionId, versionOf(identity.roomId), code));
    return true;
  }

  return { onIntent, onInvalid };
}

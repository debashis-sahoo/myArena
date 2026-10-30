import type { ClientIntent, RejectionCode } from '@myarena/protocol';
import type { Participant } from '../rooms/participant.js';

const HOST_ONLY = new Set<ClientIntent['type']>([
  'game.select', 'settings.update', 'match.start', 'match.rematch', 'match.returnToLobby',
  'invite.regenerate', 'host.transfer', 'member.remove', 'room.close',
]);

// Authority comes only from the session's participant role, never from message fields.
export function authorize(actor: Participant, intent: ClientIntent): RejectionCode | null {
  return HOST_ONLY.has(intent.type) && actor.role !== 'HOST' ? 'NOT_HOST' : null;
}

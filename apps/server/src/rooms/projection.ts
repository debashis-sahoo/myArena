import type { LobbyView, ParticipantView, RoomEvent } from '@myarena/protocol';
import { inviteLink } from './invitation.js';
import type { Participant } from './participant.js';
import type { Room } from './room.js';

export const participantView = ({ id, displayLabel, role, ready, connection }: Participant): ParticipantView =>
  ({ id, displayLabel, role, ready, connection });

// Non-hosts still receive the event so versions stay contiguous, but without the invitation.
export function eventFor(event: RoomEvent, viewer: Participant): RoomEvent {
  return event.kind === 'invite.regenerated' && viewer.role !== 'HOST' ? { ...event, data: {} } : event;
}

// The only place room state is turned into something a member may see.
export function lobbyFor(room: Room, viewer: Participant): LobbyView {
  return {
    id: room.id,
    version: room.version,
    status: room.status,
    selectedGameId: room.selectedGameId,
    settings: room.settings,
    matchStatus: room.matchStatus,
    ...(viewer.role === 'HOST' ? { invitation: { code: room.invitation.code, link: inviteLink(room.invitation.code) } } : {}),
    participants: room.participants.map(participantView),
    chat: room.chat,
    self: { id: viewer.id, role: viewer.role },
  };
}

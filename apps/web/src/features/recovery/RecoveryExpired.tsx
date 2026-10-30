import { useEffect } from 'react';
import { Link } from 'react-router';
import { apiRequest } from '../../platform/api-client';
import { clearLastRoom } from '../../platform/last-room';
import type { LostReason } from '../../platform/reconnect';

const COPY: Record<LostReason, { title: string; detail: string; next: string }> = {
  expired: {
    title: 'Your seat is no longer available',
    detail: 'You were disconnected for more than 10 minutes, so the room released your seat.',
    next: 'Create a new room, or ask the host for an invitation and join from a private browser window.',
  },
  unavailable: {
    title: 'This room is unavailable',
    detail: 'The room may have closed, or you are not a member of it.',
    next: 'Create a new room or join another one.',
  },
  removed: {
    title: 'You were removed from the room',
    detail: 'The host removed you from this room.',
    next: 'You can join again only with a valid invitation, as a new member.',
  },
  closed: {
    title: 'This room has closed',
    detail: 'The host closed the room, so its chat and members are gone.',
    next: 'Create a new room or join another one.',
  },
  left: {
    title: 'You left this room',
    detail: 'Your seat was released.',
    next: 'Create a new room or join another one.',
  },
  superseded: {
    title: 'This room is open in another window',
    detail: 'You joined from another tab or device, so this one was disconnected.',
    next: 'Continue in the other window, or reload this page to use it here.',
  },
};

export function RecoveryExpired({ reason, roomId }: { reason: LostReason; roomId: string }) {
  const copy = COPY[reason];
  // A removed member or a closed room leaves a credential to clear; an expired seat must not call Leave.
  useEffect(() => {
    // Only another window holding the seat keeps it; every other reason means this device has no seat to return to.
    if (reason !== 'superseded') clearLastRoom();
    if (reason === 'removed' || reason === 'closed') apiRequest(`/api/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST' }).catch(() => undefined);
  }, [reason, roomId]);

  return (
    <section role="alert" className="panel stack">
      <h1>{copy.title}</h1>
      <p>{copy.detail} {copy.next}</p>
      <p><Link to="/" className="touch-link">Back to the start</Link></p>
    </section>
  );
}

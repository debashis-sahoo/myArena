import { useEffect, useRef } from 'react';
import type { LobbyView } from '@myarena/protocol';
import { useAnnouncer } from '../../a11y/announcer';
import type { LostReason } from '../../platform/reconnect';

// Tells every member, through the live region, when the host changes or the room closes.
export function useRoomAnnouncements(lobby: LobbyView | null, lost: LostReason | null): void {
  const announce = useAnnouncer();
  const previousHost = useRef<string | null>(null);
  const host = lobby?.participants.find((member) => member.role === 'HOST');
  const hostId = host?.id ?? null;
  const hostLabel = host?.displayLabel ?? '';
  const selfId = lobby?.self.id ?? null;

  useEffect(() => {
    if (!hostId) return;
    if (previousHost.current && previousHost.current !== hostId) {
      announce(hostId === selfId ? 'You are now the host.' : `${hostLabel} is now the host.`);
    }
    previousHost.current = hostId;
  }, [hostId, hostLabel, selfId, announce]);

  useEffect(() => { if (lost === 'closed') announce('The host closed the room.'); }, [lost, announce]);
}

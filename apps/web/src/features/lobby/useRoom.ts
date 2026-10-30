import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnnouncer } from '../../a11y/announcer';
import { createIntentQueue, type IntentDraft, type IntentQueue } from '../../platform/intent-queue';
import { createReconnectingConnection, type ConnectionStatus, type LostReason } from '../../platform/reconnect';
import { initialRoomState, type RoomState } from '../../platform/room-state';
import { probeSession } from '../../platform/session';
import { connectRoom } from '../../platform/ws-client';

export type Lost = LostReason;

export function useRoom(roomId: string) {
  const announce = useAnnouncer();
  const [state, setState] = useState<RoomState>(initialRoomState);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lost, setLost] = useState<Lost | null>(null);
  const queue = useRef<IntentQueue | null>(null);

  useEffect(() => {
    setState(initialRoomState);
    setStatus('connecting');
    setLost(null);
    const connection = createReconnectingConnection({
      roomId,
      connect: connectRoom,
      probe: probeSession,
      handlers: {
        onState: setState,
        onMessage: (message) => {
          if (message.type === 'ack') queue.current?.handleAck(message);
          if (message.type === 'snapshot') queue.current?.resendPending();
        },
        onStatus: setStatus,
        onLost: setLost,
      },
    });
    queue.current = createIntentQueue((intent) => connection.send(intent));
    return () => { queue.current = null; connection.dispose(); };
  }, [roomId]);

  // Resolves to a plain-language problem with a next step, or null when the server accepted the intent.
  const run = useCallback(async (draft: IntentDraft): Promise<string | null> => {
    if (!queue.current) return 'You are not connected to the room. Reload the page to reconnect.';
    const ack = await queue.current.submit(draft);
    if (ack.status === 'ACCEPTED') return null;
    const text = `${ack.detail} ${ack.nextStep}`;
    announce(text);
    return text;
  }, [announce]);

  return { state, status, lost, run };
}
export type RunIntent = ReturnType<typeof useRoom>['run'];

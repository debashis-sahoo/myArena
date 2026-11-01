import type { ReactElement } from 'react';
import type { RoomState } from '@myarena/shared';
import { kickPlayer } from '../../state/roomStore';
import { toast } from '../common/Toast';
import { HostControls } from './HostControls';
import { InviteBar } from './InviteBar';
import { PlayerList } from './PlayerList';

interface Props {
  room: RoomState;
  youId: string;
  invitePath: string | null;
}

/** Everything about who is here and what the host can do. Chat is separate (ChatPanel / ChatDrawer). */
export function Lobby({ room, youId, invitePath }: Props): ReactElement {
  const isHost = room.hostPlayerId === youId;
  const inLobby = room.state === 'lobby';

  return (
    <div className="lobby">
      {invitePath && inLobby && <InviteBar invitePath={invitePath} />}
      <section aria-label="Players">
        <h3 className="panel-title">
          Players{' '}
          <span className="count">
            {room.seats.filter((s) => s.occupant).length}/{room.capacity}
          </span>
        </h3>
        <PlayerList
          room={room}
          youId={youId}
          onKick={
            isHost && inLobby
              ? (id) => {
                  void kickPlayer(id).then((res) => {
                    if (!res.ok) toast(res.message);
                  });
                }
              : undefined
          }
        />
      </section>
      {isHost && inLobby && <HostControls room={room} />}
      {!isHost && inLobby && (
        <p className="hint waiting" role="status">
          Waiting for the host to start the match...
        </p>
      )}
      {!inLobby && (
        <p className="hint waiting" role="status">
          Match in progress.
        </p>
      )}
    </div>
  );
}

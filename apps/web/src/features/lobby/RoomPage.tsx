import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ChatPanel } from '../chat/ChatPanel';
import { apiRequest } from '../../platform/api-client';
import { ConnectionBanner } from '../recovery/ConnectionBanner';
import { RecoveryExpired } from '../recovery/RecoveryExpired';
import { GameSelect, type GameSummary } from './GameSelect';
import { HostActions } from './HostActions';
import { InvitePanel } from './InvitePanel';
import { LeaveButton } from './LeaveButton';
import { MatchControls } from './MatchControls';
import { MemberList } from './MemberList';
import { ReadyToggle } from './ReadyToggle';
import { SettingsPanel } from './SettingsPanel';
import { useRoom } from './useRoom';
import { useRoomAnnouncements } from './useRoomAnnouncements';

export function RoomPage() {
  const { roomId = '' } = useParams();
  const { state, status, lost, run } = useRoom(roomId);
  const [games, setGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    apiRequest<{ games: GameSummary[] }>('/api/games').then((result) => setGames(result.games)).catch(() => setGames([]));
  }, []);

  useRoomAnnouncements(state.lobby, lost);
  if (lost) return <RecoveryExpired reason={lost} roomId={roomId} />;
  const lobby = state.lobby;
  if (!lobby) return <p role="status">Connecting to the room…</p>;
  const isHost = lobby.self.role === 'HOST';
  const self = lobby.participants.find((member) => member.id === lobby.self.id);
  const inLobby = lobby.status === 'LOBBY';
  return (
    <div className="stack">
      <ConnectionBanner status={status} />
      <div className="cluster room-header">
        <h1>Room lobby</h1>
        <LeaveButton roomId={roomId} />
      </div>
      {lobby.invitation ? <InvitePanel invitation={lobby.invitation} run={run} /> : null}
      <div className="room-grid">
        <div className="stack">
          <MemberList participants={lobby.participants} selfId={lobby.self.id} isHost={isHost} run={run} />
          <ReadyToggle ready={self?.ready ?? false} run={run} />
          {isHost ? <HostActions participants={lobby.participants} selfId={lobby.self.id} run={run} /> : null}
        </div>
        <div className="stack">
          <GameSelect games={games} selectedGameId={lobby.selectedGameId} isHost={isHost} editable={inLobby} run={run} />
          <SettingsPanel settings={lobby.settings} seats={lobby.participants.length} isHost={isHost} editable={inLobby} run={run} />
          <MatchControls lobby={lobby} run={run} />
        </div>
        <ChatPanel messages={lobby.chat} run={run} className="room-chat" />
      </div>
    </div>
  );
}

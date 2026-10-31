import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'react-router';
import { ChatPanel } from '../chat/ChatPanel';
import { apiRequest } from '../../platform/api-client';
import { onlineGame } from '../games/registry';
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
  const online = onlineGame(lobby.selectedGameId);
  const showMatch = online !== null && (lobby.status === 'IN_MATCH' || lobby.matchStatus === 'ENDED');
  return (
    <div className="stack">
      <ConnectionBanner status={status} />
      <div className="cluster room-header">
        <h1>Room lobby</h1>
        <LeaveButton roomId={roomId} />
      </div>
      {lobby.invitation ? <InvitePanel invitation={lobby.invitation} run={run} /> : null}
      {online && showMatch ? (
        <Suspense fallback={<p role="status">Preparing the game…</p>}>
          <online.Match lobby={lobby} game={state.game} run={run} />
        </Suspense>
      ) : null}
      <div className="room-grid">
        <div className="stack">
          <MemberList participants={lobby.participants} selfId={lobby.self.id} isHost={isHost} run={run} />
          <ReadyToggle ready={self?.ready ?? false} run={run} />
          {isHost ? <HostActions participants={lobby.participants} selfId={lobby.self.id} run={run} /> : null}
        </div>
        <div className="stack">
          <GameSelect games={games} selectedGameId={lobby.selectedGameId} isHost={isHost} editable={inLobby} run={run} />
          {online ? (
            <Suspense fallback={<p role="status">Loading the game settings…</p>}>
              <online.Settings settings={lobby.settings} seats={lobby.participants.length} isHost={isHost} editable={inLobby} run={run} />
            </Suspense>
          ) : (
            <SettingsPanel settings={lobby.settings} seats={lobby.participants.length} isHost={isHost} editable={inLobby} run={run} />
          )}
          <MatchControls lobby={lobby} run={run} />
        </div>
        {online?.ownsChat && showMatch ? null : <ChatPanel messages={lobby.chat} run={run} className="room-chat" />}
      </div>
    </div>
  );
}

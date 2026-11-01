import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { formatRoomCode, getGame } from '@myarena/shared';
import { getMatchScreen } from '../../games/registry';
import { leaveRoom, useRoom } from '../../state/roomStore';
import { useLayoutMode } from '../../state/viewport';
import { ChatDrawer } from './ChatDrawer';
import { ChatPanel } from './ChatPanel';
import { GameStage } from './GameStage';
import { Lobby } from './Lobby';

/**
 * Universal room wrapper. It owns the lobby, invites, host controls and chat, and mounts the game's board
 * in the stage (constitution Principle IV). Layout follows the screen: board left and panel right in landscape,
 * board on top in portrait, chat docked when wide enough and a bottom drawer on phones.
 */
export function RoomShell(): ReactElement | null {
  const { room, you, invitePath, chat } = useRoom();
  const layout = useLayoutMode();
  const navigate = useNavigate();
  if (!room || !you) return null;

  const MatchScreen = room.state === 'in_progress' ? getMatchScreen(room.gameId) : undefined;
  if (MatchScreen) return <MatchScreen room={room} youId={you} invitePath={invitePath} chat={chat} />;

  const game = getGame(room.gameId);
  const leave = (): void => {
    leaveRoom();
    navigate('/');
  };

  return (
    <div className={`room-shell ${layout.side ? 'side' : 'stack'} ${layout.dockedChat ? 'docked' : 'drawer-mode'}`}>
      <header className="room-head">
        <button type="button" className="btn ghost small" onClick={leave}>
          <span aria-hidden="true">←</span> Leave
        </button>
        <div className="room-title">
          <strong>{game?.name ?? 'Game'}</strong>
          <span className="tag mode-tag">{room.mode === 'ai' ? 'vs AI' : 'Private room'}</span>
        </div>
        <span className="code-chip" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
          {formatRoomCode(room.roomId)}
        </span>
      </header>

      <section className="stage-area" aria-label="Game area">
        <GameStage room={room} playerId={you} />
      </section>

      <aside className="room-panel">
        <div className="panel-scroll">
          <Lobby room={room} youId={you} invitePath={invitePath} />
        </div>
        {layout.dockedChat && <ChatPanel messages={chat} youId={you} className="docked-chat" />}
      </aside>

      {!layout.dockedChat && <ChatDrawer messages={chat} youId={you} />}
    </div>
  );
}

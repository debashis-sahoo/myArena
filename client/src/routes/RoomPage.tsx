import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router';
import { normalizeRoomCode } from '@myarena/shared';
import { JoinGate } from '../components/room/JoinGate';
import { RoomShell } from '../components/room/RoomShell';
import { RoomStatusScreen } from '../components/room/RoomStatusScreen';
import { clearStatus, getRoomView, joinRoom, leaveRoom, useRoom, wasInRoom } from '../state/roomStore';

/** /room/:gameId/:roomId: join gate on a direct load, then the room, or a friendly status screen. */
export function RoomPage(): ReactElement {
  const params = useParams();
  const navigate = useNavigate();
  const gameId = params.gameId ?? '';
  const roomId = normalizeRoomCode(params.roomId ?? '');
  const view = useRoom();
  const leaving = useRef(false);

  // Arriving from "Play Online" or a refresh of a room already joined skips the name gate.
  const [gateDone, setGateDone] = useState(() => getRoomView().room?.roomId === roomId || wasInRoom(roomId));

  useEffect(() => {
    if (!gateDone || leaving.current) return;
    // Switching to a different room's link while still in another: leave first, then join this one.
    if (view.phase === 'in_room' && view.room && view.room.roomId !== roomId) {
      leaveRoom();
      return;
    }
    if (view.phase !== 'idle') return;
    void joinRoom(gameId, roomId);
  }, [gateDone, view.phase, view.room, gameId, roomId]);

  // Leaving the page (back button, link) frees the seat and drops the connection.
  useEffect(
    () => () => {
      leaving.current = true;
      leaveRoom();
    },
    [],
  );

  const toHub = (): void => {
    leaving.current = true;
    leaveRoom();
    navigate('/');
  };

  if (view.phase === 'in_room' && view.room?.roomId === roomId) return <RoomShell />;
  if (view.phase === 'status' && view.status) {
    return (
      <RoomStatusScreen
        status={view.status}
        onBack={toHub}
        onRetry={() => {
          setGateDone(true);
          clearStatus();
        }}
      />
    );
  }
  if (!gateDone) {
    return <JoinGate gameId={gameId} roomId={roomId} onJoin={() => setGateDone(true)} onCancel={toHub} />;
  }
  return (
    <main className="status-screen">
      <div className="status-card" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <h1 className="status-title">Joining room...</h1>
      </div>
    </main>
  );
}

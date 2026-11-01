import type { ReactElement } from 'react';
import type { RoomState } from '@myarena/shared';
import { Modal } from '../../components/common/Modal';
import { InviteBar } from '../../components/room/InviteBar';
import { Lobby } from '../../components/room/Lobby';

interface LobbyProps {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  youId: string;
  invitePath: string | null;
}

/** Players, invite link, and room details without leaving or pausing the match. */
export function LobbyDialog({ open, onClose, room, youId, invitePath }: LobbyProps): ReactElement | null {
  return (
    <Modal open={open} title="Lobby" onClose={onClose}>
      <h2 className="modal-title">Lobby</h2>
      {invitePath && <InviteBar invitePath={invitePath} />}
      <Lobby room={room} youId={youId} invitePath={null} />
    </Modal>
  );
}

interface QuitProps {
  open: boolean;
  onClose: () => void;
  onQuit: () => void;
}

/** Quit asks first: leaving frees the seat and returns to the Hub. */
export function QuitDialog({ open, onClose, onQuit }: QuitProps): ReactElement | null {
  return (
    <Modal open={open} title="Quit the match" onClose={onClose}>
      <h2 className="modal-title">Quit the match?</h2>
      <p className="hint">Your seat will be freed and your pawns removed from the board. The others keep playing.</p>
      <div className="dialog-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Stay
        </button>
        <button type="button" className="btn danger" onClick={onQuit}>
          Quit
        </button>
      </div>
    </Modal>
  );
}

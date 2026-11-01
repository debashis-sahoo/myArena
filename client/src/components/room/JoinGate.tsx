import { useState, type ReactElement } from 'react';
import { DISPLAY_NAME_MAX, formatRoomCode, getGame } from '@myarena/shared';
import { Avatar, AVATARS } from '../../art/Avatars';
import { sfx } from '../../audio/sfx';
import { cleanName, updateGuest, useGuest } from '../../state/guest';

interface Props {
  gameId: string;
  roomId: string;
  onJoin: () => void;
  onCancel: () => void;
}

/** Shown on a direct load of an invite link: confirm name and avatar, then join (FR-015). */
export function JoinGate({ gameId, roomId, onJoin, onCancel }: Props): ReactElement {
  const guest = useGuest();
  const [name, setName] = useState(guest.displayName);
  const game = getGame(gameId);

  return (
    <main className="status-screen">
      <form
        className="status-card"
        onSubmit={(e) => {
          e.preventDefault();
          sfx.tap();
          updateGuest({ displayName: cleanName(name) });
          onJoin();
        }}
      >
        <span className="status-emoji" aria-hidden="true">
          🎲
        </span>
        <h1 className="status-title">Join {game?.name ?? 'the'} room</h1>
        <p className="hint">
          Room <span className="code-chip">{formatRoomCode(roomId)}</span>
        </p>
        <div className="gate-form">
          <label htmlFor="gate-name">Your name</label>
          <input
            id="gate-name"
            className="field"
            value={name}
            maxLength={DISPLAY_NAME_MAX}
            autoComplete="nickname"
            spellCheck={false}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="gate-avatars" role="group" aria-label="Choose an avatar">
            {AVATARS.map((k) => (
              <button key={k} type="button" aria-label={k} aria-pressed={guest.avatar === k} onClick={() => updateGuest({ avatar: k })}>
                <Avatar k={k} size={42} />
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn lime">
          Join room
        </button>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Back to Hub
        </button>
      </form>
    </main>
  );
}

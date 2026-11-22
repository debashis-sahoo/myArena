import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { ROOM_ID_LENGTH, isRoomCode, normalizeRoomCode } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { joinRoomByCode } from '../../state/roomStore';

export function JoinRoomPanel(): ReactElement {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (busy) return;
    const roomId = normalizeRoomCode(code);
    if (!isRoomCode(roomId)) {
      setError('Enter the six-character room code from your host.');
      return;
    }
    setBusy(true);
    setError(null);
    sfx.tap();
    const result = await joinRoomByCode(roomId);
    if (!result.ok) {
      sfx.error();
      setError(result.message);
      setBusy(false);
      return;
    }
    sfx.success();
    navigate(`/room/${result.gameId}/${result.roomId}`);
  };

  return (
    <section className="join-room-panel" aria-labelledby="join-room-title">
      <div className="join-room-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="presentation">
          <circle cx="24" cy="17" r="7" />
          <circle cx="10" cy="20" r="5" />
          <circle cx="38" cy="20" r="5" />
          <path d="M12 39c0-7 5-12 12-12s12 5 12 12" />
          <path d="M2 38c0-6 3-10 9-11M46 38c0-6-3-10-9-11" />
        </svg>
      </div>
      <div className="join-room-copy">
        <h1 id="join-room-title">Join with a room code</h1>
        <p className="hint">Private room code</p>
      </div>
      <form
        className="join-room-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="room-code" className="sr-only">
          Private room code
        </label>
        <div className="join-room-input-row">
          <input
            id="room-code"
            className="field room-code-input"
            value={code}
            maxLength={ROOM_ID_LENGTH + 2}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="K7M2Q9"
            aria-describedby={error ? 'room-code-error' : undefined}
            aria-invalid={error !== null}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''));
              setError(null);
            }}
          />
          <button type="submit" className="btn lime join-room-submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner small" aria-hidden="true" /> Joining...
              </>
            ) : (
              'Join room'
            )}
          </button>
        </div>
        {error && (
          <p id="room-code-error" className="error-text" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

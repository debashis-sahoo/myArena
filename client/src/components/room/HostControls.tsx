import { useState, type ReactElement } from 'react';
import type { RoomState } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { setCapacity, startMatch } from '../../state/roomStore';

/** Host-only lobby controls: capacity and Start (FR-016, FR-019, FR-020). Shown to the host in a lobby only. */
export function HostControls({ room }: { room: RoomState }): ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seated = room.seats.filter((s) => s.occupant).length;
  const canStart = seated >= room.minPlayers;
  const online = room.inviteEnabled;

  const change = async (capacity: number): Promise<void> => {
    sfx.tap();
    setError(null);
    const res = await setCapacity(capacity);
    if (!res.ok) {
      sfx.error();
      setError(res.message);
    }
  };

  const start = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const res = await startMatch();
    setBusy(false);
    if (!res.ok) {
      sfx.error();
      setError(res.message);
    }
  };

  const minusBlocked = room.capacity <= room.minPlayers;
  const plusBlocked = room.capacity >= room.maxPlayers;
  const shrinkBlockedByPlayers = room.capacity - 1 < seated;

  return (
    <section className="host-controls" aria-label="Host controls">
      <h3 className="panel-title">
        <span aria-hidden="true">👑</span> Host controls
      </h3>
      <div className="host-row">
        {online && (
          <div className="capacity">
            <span id="cap-label">Players</span>
            <div className="stepper" role="group" aria-labelledby="cap-label">
              <button
                type="button"
                className="btn ghost icon small"
                aria-label="Fewer players"
                disabled={minusBlocked}
                onClick={() => void change(room.capacity - 1)}
              >
                <span aria-hidden="true">−</span>
              </button>
              <output aria-live="polite" className="stepper-value">
                {room.capacity}
              </output>
              <button
                type="button"
                className="btn ghost icon small"
                aria-label="More players"
                disabled={plusBlocked}
                onClick={() => void change(room.capacity + 1)}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>
        )}
        <button type="button" className="btn lime start-btn" disabled={!canStart || busy} onClick={() => void start()}>
          {busy ? 'Starting...' : 'Start match'}
        </button>
      </div>
      {online && shrinkBlockedByPlayers && !minusBlocked && (
        <p className="hint">To lower the player count below {seated}, remove a player first.</p>
      )}
      {!canStart && (
        <p className="hint" role="status">
          Need at least {room.minPlayers} players to start. Share the invite link to bring friends in.
        </p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

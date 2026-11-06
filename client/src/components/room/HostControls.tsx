import { useEffect, useRef, useState, type ReactElement } from 'react';
import { getGame, type RoomState } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { fillWithAi, setCapacity, startMatch } from '../../state/roomStore';

/** Host-only lobby controls: capacity, Start and, where the game allows it, Fill with AI (FR-016, FR-019, FR-020). Shown to the host in a lobby only. */
export function HostControls({ room }: { room: RoomState }): ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [filling, setFilling] = useState(false);
  const fillRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  const seated = room.seats.filter((s) => s.occupant).length;
  const canStart = seated >= room.minPlayers;
  const online = room.inviteEnabled;
  const game = getGame(room.gameId);
  const roster = game?.roster === true;
  const empty = room.capacity - seated;
  const canFill = room.mode === 'online' && game?.launch?.hostFillWithAi === true && empty > 0;
  const slots = empty === 1 ? 'slot' : 'slots';
  const [draft, setDraft] = useState(String(room.capacity));

  useEffect(() => {
    setDraft(String(room.capacity));
  }, [room.capacity]);

  // A changed seat count cancels a pending confirmation so the host never confirms a different number.
  useEffect(() => {
    setAsking(false);
  }, [empty]);

  useEffect(() => {
    if (asking) cancelRef.current?.focus();
    else if (wasAsking.current) fillRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

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

  const fill = async (): Promise<void> => {
    setFilling(true);
    setError(null);
    const res = await fillWithAi();
    setFilling(false);
    if (!res.ok) {
      sfx.error();
      setError(res.message);
      setAsking(false);
    }
  };

  const commitDraft = (): void => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(room.capacity));
      return;
    }
    const clamped = Math.min(room.maxPlayers, Math.max(room.minPlayers, n));
    setDraft(String(clamped));
    if (clamped !== room.capacity) void change(clamped);
  };

  const presets = [10, 25, 50, 100, 200].filter((p) => p <= room.maxPlayers);

  const minusBlocked = room.capacity <= room.minPlayers;
  const plusBlocked = room.capacity >= room.maxPlayers;
  const shrinkBlockedByPlayers = room.capacity - 1 < seated;

  return (
    <section className="host-controls" aria-label="Host controls">
      <h3 className="panel-title">
        <span aria-hidden="true">👑</span> Host controls
      </h3>
      <div className="host-row">
        {online && roster && (
          <div className="capacity roster-capacity">
            <label htmlFor="cap-input">Players</label>
            <input
              id="cap-input"
              className="capacity-input"
              type="number"
              inputMode="numeric"
              aria-label="Player limit"
              min={room.minPlayers}
              max={room.maxPlayers}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDraft();
                }
              }}
            />
            <div className="capacity-presets" role="group" aria-label="Player limit presets">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn small ${room.capacity === p ? 'lime' : 'ghost'}`}
                  aria-pressed={room.capacity === p}
                  onClick={() => void change(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {online && !roster && (
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
        <button
          type="button"
          className="btn lime start-btn"
          disabled={!canStart || busy || filling}
          onClick={() => void start()}
        >
          {busy ? 'Starting...' : 'Start match'}
        </button>
      </div>
      {canFill && !asking && (
        <button
          ref={fillRef}
          type="button"
          className="btn ghost fill-ai-btn"
          disabled={busy}
          onClick={() => {
            sfx.tap();
            setAsking(true);
          }}
        >
          <span aria-hidden="true">🤖</span> Fill {empty} empty {slots} with AI
        </button>
      )}
      {canFill && asking && (
        <div className="fill-ai" role="group" aria-label="Confirm filling empty slots with AI">
          <p className="fill-ai-q">
            Fill {empty} {slots} with AI and start now?
          </p>
          <div className="fill-ai-actions">
            <button ref={cancelRef} type="button" className="btn ghost" disabled={filling} onClick={() => setAsking(false)}>
              Cancel
            </button>
            <button type="button" className="btn lime" disabled={filling} onClick={() => void fill()}>
              {filling ? 'Starting...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
      {online && !roster && shrinkBlockedByPlayers && !minusBlocked && (
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

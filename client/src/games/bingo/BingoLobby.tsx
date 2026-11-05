import './bingo.css';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import {
  AUTO_INTERVALS_MS,
  BINGO_CARD_CEILING_MAX,
  BINGO_DEFAULT_PATTERN_IDS,
  BINGO_PATTERNS,
  BINGO_PATTERN_GROUPS,
  formatRoomCode,
  type BingoLobby as LobbyState,
  type ChatMessage,
  type RoomState,
} from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { toast } from '../../components/common/Toast';
import { ChatDrawer } from '../../components/room/ChatDrawer';
import { ChatPanel } from '../../components/room/ChatPanel';
import { InviteBar } from '../../components/room/InviteBar';
import { PlayerList } from '../../components/room/PlayerList';
import { kickPlayer, leaveRoom, setCapacity, startMatch } from '../../state/roomStore';
import { useMediaQuery } from '../../state/viewport';
import { act } from './bingoStore';
import { PatternPicture } from './PatternPicture';

interface Props {
  room: RoomState;
  youId: string;
  invitePath: string | null;
  chat: ChatMessage[];
}

interface SegProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange?: (value: T) => void;
}

function Seg<T extends string | number>({ label, value, options, onChange }: SegProps<T>): ReactElement {
  return (
    <div className="bz-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          disabled={!onChange}
          onClick={() => onChange?.(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const DEFAULTS: LobbyState = {
  ceiling: 1,
  hostPlays: true,
  patterns: [...BINGO_DEFAULT_PATTERN_IDS],
  caller: { mode: 'manual' },
  choices: {},
};

const PRESETS = [10, 25, 50, 100, 200];

/** Players row: number field with presets, clamped to the room's limits (the platform's room:setCapacity). */
function PlayersField({ room }: { room: RoomState }): ReactElement {
  const [draft, setDraft] = useState(String(room.capacity));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(room.capacity));
  }, [room.capacity]);

  const change = async (capacity: number): Promise<void> => {
    sfx.tap();
    setError(null);
    const res = await setCapacity(capacity);
    if (!res.ok) {
      sfx.error();
      setError(res.message);
      setDraft(String(room.capacity));
    }
  };

  const commit = (): void => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(room.capacity));
      return;
    }
    const clamped = Math.min(room.maxPlayers, Math.max(room.minPlayers, n));
    setDraft(String(clamped));
    if (clamped !== room.capacity) void change(clamped);
  };

  return (
    <div className="bz-row wide">
      <label className="bz-label" htmlFor="bz-cap">
        Players
      </label>
      <input
        id="bz-cap"
        className="bz-field"
        type="number"
        inputMode="numeric"
        aria-label="Player limit"
        min={room.minPlayers}
        max={room.maxPlayers}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <div className="bz-seg" role="group" aria-label="Player limit presets">
        {PRESETS.filter((p) => p >= room.minPlayers && p <= room.maxPlayers).map((p) => (
          <button key={p} type="button" aria-pressed={room.capacity === p} onClick={() => void change(p)}>
            {p}
          </button>
        ))}
      </div>
      {error && (
        <p className="bz-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Start with the reason it is unavailable (no pattern chosen, or nobody else seated). */
function StartPanel({ room, lobby }: { room: RoomState; lobby: LobbyState }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seated = room.seats.filter((s) => s.occupant).length;
  const reason =
    lobby.patterns.length === 0 ? 'Pick at least one pattern.' : seated < room.minPlayers ? 'Wait for at least one more person.' : null;

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

  return (
    <div className="bz-start">
      <button type="button" className="bz-btn gold" disabled={reason !== null || busy} onClick={() => void start()}>
        {busy ? 'Starting...' : 'Start match'}
      </button>
      {reason && (
        <p className="bz-hint" role="status">
          {reason}
        </p>
      )}
      {error && (
        <p className="bz-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Bingo setup screen: host settings and the pattern chooser, card choice, and the roster (contracts/match-screen-layout.md). */
export function BingoLobby({ room, youId, invitePath, chat }: Props): ReactElement {
  const navigate = useNavigate();
  const narrow = useMediaQuery('(max-width: 900px), (max-aspect-ratio: 1/1)');
  const lobby = (room.gameLobby as LobbyState | undefined) ?? DEFAULTS;
  const isHost = room.hostPlayerId === youId;
  const picked = new Set(lobby.patterns);
  const cardsOf = (id: string): number => Math.min(lobby.choices[id] ?? 1, lobby.ceiling);
  const myCards = cardsOf(youId);
  const iPlay = !isHost || lobby.hostPlays;
  const seated = room.seats.filter((s) => s.occupant).length;

  // Tell a player when the host's lower maximum reduced their own count.
  const [notice, setNotice] = useState<string | null>(null);
  const last = useRef({ mine: myCards, ceiling: lobby.ceiling });
  useEffect(() => {
    if (!isHost && lobby.ceiling < last.current.ceiling && myCards < last.current.mine) {
      setNotice(`The host lowered the maximum, so your cards were reduced to ${myCards}.`);
    }
    last.current = { mine: myCards, ceiling: lobby.ceiling };
  }, [isHost, myCards, lobby.ceiling]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const setPatterns = (ids: Set<string>): void => {
    act({ type: 'setPatterns', ids: BINGO_PATTERNS.filter((p) => ids.has(p.id)).map((p) => p.id) });
  };
  const togglePattern = (id: string): void => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPatterns(next);
  };
  const setGroup = (ids: string[], on: boolean): void => {
    const next = new Set(picked);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    setPatterns(next);
  };

  const callerValue = lobby.caller.mode === 'auto' ? String(lobby.caller.intervalMs ?? 8000) : 'manual';
  const setCaller = (v: string): void => {
    if (v === 'manual') act({ type: 'setCaller', mode: 'manual' });
    else act({ type: 'setCaller', mode: 'auto', intervalMs: Number(v) });
  };
  const callerLabel = lobby.caller.mode === 'auto' ? `Auto ${(lobby.caller.intervalMs ?? 8000) / 1000}s` : 'Manual';

  const leave = (): void => {
    leaveRoom();
    navigate('/');
  };

  const ceilingOptions = Array.from({ length: BINGO_CARD_CEILING_MAX }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const myOptions = ceilingOptions.filter((o) => o.value <= lobby.ceiling);

  const settings = isHost ? (
    <div className="bz-panel">
      <h2 className="bz-title">Set up the match</h2>
      <div className="bz-rows">
        <PlayersField room={room} />
        <div className="bz-row">
          <span className="bz-label">Max cards each</span>
          <Seg
            label="Maximum cards each"
            value={lobby.ceiling}
            options={ceilingOptions}
            onChange={(v) => act({ type: 'setCeiling', value: v })}
          />
        </div>
        <div className="bz-row">
          <span className="bz-label" id="bz-plays">
            I also play
          </span>
          <button
            type="button"
            className="bz-switch"
            role="switch"
            aria-checked={lobby.hostPlays}
            aria-labelledby="bz-plays"
            onClick={() => act({ type: 'setHostPlays', value: !lobby.hostPlays })}
          />
        </div>
        <div className="bz-row">
          <span className="bz-label">Calling</span>
          <Seg
            label="Ball calling"
            value={callerValue}
            options={[
              { value: 'manual', label: 'Manual' },
              ...AUTO_INTERVALS_MS.map((ms) => ({ value: String(ms), label: `${ms / 1000}s` })),
            ]}
            onChange={setCaller}
          />
        </div>
        {iPlay && (
          <div className="bz-row">
            <span className="bz-label">My cards</span>
            <Seg label="My cards" value={myCards} options={myOptions} onChange={(v) => act({ type: 'setCards', count: v })} />
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="bz-panel">
      <h2 className="bz-title">Match settings</h2>
      <div className="bz-summary" aria-label="Match settings">
        <span className="bz-chip">Players: {room.capacity}</span>
        <span className="bz-chip">Max cards each: {lobby.ceiling}</span>
        <span className="bz-chip">Host plays: {lobby.hostPlays ? 'Yes' : 'No'}</span>
        <span className="bz-chip">Calling: {callerLabel}</span>
      </div>
      {iPlay && (
        <div className="bz-row" style={{ marginTop: 8 }}>
          <span className="bz-label">My cards</span>
          <Seg label="My cards" value={myCards} options={myOptions} onChange={(v) => act({ type: 'setCards', count: v })} />
        </div>
      )}
      {notice && (
        <p className="bz-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );

  return (
    <div className="bz bz-lobby">
      <header className="bz-lobby-head">
        <button type="button" className="bz-btn small" onClick={leave}>
          Leave
        </button>
        <h1>BINGO</h1>
        <span className="bz-chip" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
          {formatRoomCode(room.roomId)}
        </span>
        <span className="spacer" />
        <span className="bz-chip" aria-label={`${seated} of ${room.capacity} people`}>
          {seated} / {room.capacity}<span className="bz-people-word"> people</span>
        </span>
      </header>

      <div className="bz-lobby-body">
        <section className="bz-setup" aria-label="Match setup">
          {settings}

          <div className="bz-panel bz-chooser">
            <div className="bz-chooser-head">
              <h2 className="bz-title">Patterns</h2>
              <span className="bz-chip">
                {lobby.patterns.length} of {BINGO_PATTERNS.length}
              </span>
              {isHost && (
                <button type="button" className="bz-btn small" onClick={() => act({ type: 'setPatterns', ids: [...BINGO_DEFAULT_PATTERN_IDS] })}>
                  Reset to defaults
                </button>
              )}
            </div>
            <div className="bz-chooser-scroll">
              {BINGO_PATTERN_GROUPS.map((group) => {
                const allOn = group.ids.every((id) => picked.has(id));
                const visible = isHost ? group.ids : group.ids.filter((id) => picked.has(id));
                if (visible.length === 0) return null;
                return (
                  <div key={group.id} className="bz-group">
                    <div className="bz-group-head">
                      <span>{group.label.toUpperCase()}</span>
                      {isHost && (
                        <button type="button" className="bz-btn small" onClick={() => setGroup(group.ids, !allOn)}>
                          {allOn ? 'None' : 'All'}
                        </button>
                      )}
                    </div>
                    <div className="bz-pats">
                      {visible.map((id) => {
                        const pattern = BINGO_PATTERNS.find((p) => p.id === id);
                        if (!pattern) return null;
                        return isHost ? (
                          <button key={id} type="button" className="bz-pat" aria-pressed={picked.has(id)} onClick={() => togglePattern(id)}>
                            <PatternPicture pattern={pattern} size="sm" />
                            <span>{pattern.name}</span>
                          </button>
                        ) : (
                          <div key={id} className="bz-pat static">
                            <PatternPicture pattern={pattern} size="sm" />
                            <span>{pattern.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bz-people" aria-label="People">
          {invitePath ? <InviteBar invitePath={invitePath} /> : <span />}
          {isHost ? (
            <StartPanel room={room} lobby={lobby} />
          ) : (
            <p className="bz-hint" role="status">
              Waiting for the host to start the match...
            </p>
          )}
          <div className="bz-panel" style={{ overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)' }}>
            <h2 className="bz-title">People</h2>
            <PlayerList
              room={room}
              youId={youId}
              onKick={
                isHost
                  ? (id) => {
                      void kickPlayer(id).then((res) => {
                        if (!res.ok) toast(res.message);
                      });
                    }
                  : undefined
              }
              badge={(id) =>
                id === room.hostPlayerId && !lobby.hostPlays ? (
                  <span className="bz-tix">Caller</span>
                ) : (
                  <span className="bz-tix">
                    {cardsOf(id)}
                    <small>{cardsOf(id) === 1 ? 'card' : 'cards'}</small>
                  </span>
                )
              }
            />
          </div>
          {!narrow && (
            <div className="bz-chatbox">
              <ChatPanel messages={chat} youId={youId} className="docked-chat" />
            </div>
          )}
        </section>
      </div>

      {narrow && <ChatDrawer messages={chat} youId={youId} />}
    </div>
  );
}

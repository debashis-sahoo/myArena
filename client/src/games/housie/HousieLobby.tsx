import './housie.css';
import { useEffect, useRef, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import {
  AUTO_INTERVALS_MS,
  DEFAULT_PATTERN_IDS,
  PATTERNS,
  PATTERN_GROUPS,
  TICKET_CEILING_MAX,
  formatRoomCode,
  type ChatMessage,
  type HousieAction,
  type HousieLobby,
  type RoomState,
} from '@myarena/shared';
import { toast } from '../../components/common/Toast';
import { ChatPanel } from '../../components/room/ChatPanel';
import { HostControls } from '../../components/room/HostControls';
import { InviteBar } from '../../components/room/InviteBar';
import { PlayerList } from '../../components/room/PlayerList';
import { kickPlayer, leaveRoom, sendGameAction } from '../../state/roomStore';
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
    <div className="hz-seg" role="group" aria-label={label}>
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

function act(action: HousieAction): void {
  void sendGameAction(action).then((res) => {
    if (!res.ok) toast(res.message);
  });
}

const DEFAULTS: HousieLobby = {
  ceiling: 1,
  hostPlays: true,
  patterns: [...DEFAULT_PATTERN_IDS],
  caller: { mode: 'manual' },
  choices: {},
};

/** Housie setup screen: host settings and the combination chooser, ticket choice, and the roster (contracts/match-screen-layout.md). */
export function HousieLobby({ room, youId, invitePath, chat }: Props): ReactElement {
  const navigate = useNavigate();
  const lobby = (room.gameLobby as HousieLobby | undefined) ?? DEFAULTS;
  const isHost = room.hostPlayerId === youId;
  const picked = new Set(lobby.patterns);
  const ticketsOf = (id: string): number => Math.min(lobby.choices[id] ?? 1, lobby.ceiling);
  const myTickets = ticketsOf(youId);
  const iPlay = !isHost || lobby.hostPlays;

  // Tell the player when the host's lower ceiling reduced their own choice.
  const lastMine = useRef(myTickets);
  useEffect(() => {
    if (myTickets < lastMine.current) toast(`Your tickets were reduced to ${myTickets}`);
    lastMine.current = myTickets;
  }, [myTickets]);

  const togglePattern = (id: string): void => {
    const next = picked.has(id) ? lobby.patterns.filter((p) => p !== id) : [...lobby.patterns, id];
    act({ type: 'setPatterns', ids: next });
  };
  const setGroup = (ids: string[], on: boolean): void => {
    const rest = lobby.patterns.filter((p) => !ids.includes(p));
    act({ type: 'setPatterns', ids: on ? [...rest, ...ids] : rest });
  };

  const callerValue = lobby.caller.mode === 'auto' ? String(lobby.caller.intervalMs ?? 8000) : 'manual';
  const setCaller = (v: string): void => {
    if (v === 'manual') act({ type: 'setCaller', mode: 'manual' });
    else act({ type: 'setCaller', mode: 'auto', intervalMs: Number(v) });
  };

  const leave = (): void => {
    leaveRoom();
    navigate('/');
  };

  const ceilingOptions = Array.from({ length: TICKET_CEILING_MAX }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const myOptions = ceilingOptions.filter((o) => o.value <= lobby.ceiling);

  return (
    <div className="hz hz-lobby">
      <header className="hz-lobby-head">
        <button type="button" className="hz-btn small" onClick={leave}>
          Leave
        </button>
        <h1>HOUSIE</h1>
        <span className="hz-chip" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
          {formatRoomCode(room.roomId)}
        </span>
        <span className="spacer" />
        <span className="hz-chip">
          {room.seats.filter((s) => s.occupant).length} / {room.capacity} people
        </span>
      </header>

      <div className="hz-lobby-body">
        <section className="hz-setup" aria-label="Match setup">
          <div className="hz-panel">
            <h2 className="hz-title">{isHost ? 'Set up the match' : 'Match settings'}</h2>
            <div className="hz-rows">
              <div className="hz-row">
                <span className="hz-label">Max tickets each</span>
                <Seg
                  label="Maximum tickets each"
                  value={lobby.ceiling}
                  options={ceilingOptions}
                  onChange={isHost ? (v) => act({ type: 'setCeiling', value: v }) : undefined}
                />
              </div>
              <div className="hz-row">
                <span className="hz-label">Calling</span>
                <Seg
                  label="Ball calling"
                  value={callerValue}
                  options={[
                    { value: 'manual', label: 'Manual' },
                    ...AUTO_INTERVALS_MS.map((ms) => ({ value: String(ms), label: `${ms / 1000}s` })),
                  ]}
                  onChange={isHost ? setCaller : undefined}
                />
              </div>
              <div className="hz-row">
                <span className="hz-label">Host also plays</span>
                <Seg
                  label="Host also plays"
                  value={lobby.hostPlays ? 'yes' : 'no'}
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                  onChange={isHost ? (v) => act({ type: 'setHostPlays', value: v === 'yes' }) : undefined}
                />
              </div>
              {iPlay && (
                <div className="hz-row">
                  <span className="hz-label">My tickets</span>
                  <Seg
                    label="My tickets"
                    value={myTickets}
                    options={myOptions}
                    onChange={(v) => act({ type: 'setTickets', count: v })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="hz-panel hz-chooser">
            <div className="hz-chooser-head">
              <h2 className="hz-title" style={{ margin: 0 }}>
                Combinations
              </h2>
              <span className="hz-chip">
                {lobby.patterns.length} of {PATTERNS.length}
              </span>
              {isHost && (
                <button
                  type="button"
                  className="hz-btn small"
                  onClick={() => act({ type: 'setPatterns', ids: [...DEFAULT_PATTERN_IDS] })}
                >
                  Reset to defaults
                </button>
              )}
            </div>
            <div className="hz-chooser-scroll">
              {PATTERN_GROUPS.map((group) => {
                const allOn = group.ids.every((id) => picked.has(id));
                const visible = isHost ? group.ids : group.ids.filter((id) => picked.has(id));
                if (visible.length === 0) return null;
                return (
                  <div key={group.id} className="hz-group">
                    <div className="hz-group-head">
                      <span>{group.label.toUpperCase()}</span>
                      {isHost && (
                        <button type="button" className="hz-btn small" onClick={() => setGroup(group.ids, !allOn)}>
                          {allOn ? 'None' : 'All'}
                        </button>
                      )}
                    </div>
                    <div className="hz-pats">
                      {visible.map((id) => {
                        const pattern = PATTERNS.find((p) => p.id === id);
                        if (!pattern) return null;
                        return isHost ? (
                          <button
                            key={id}
                            type="button"
                            className="hz-pat"
                            aria-pressed={picked.has(id)}
                            onClick={() => togglePattern(id)}
                          >
                            <PatternPicture pattern={pattern} size="sm" />
                            <span>{pattern.name}</span>
                          </button>
                        ) : (
                          <div key={id} className="hz-pat static" aria-pressed="true">
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

        <section className="hz-people" aria-label="People">
          {invitePath ? <InviteBar invitePath={invitePath} /> : <span />}
          {isHost ? (
            <HostControls room={room} />
          ) : (
            <p className="hint waiting" role="status">
              Waiting for the host to start the match...
            </p>
          )}
          <div className="hz-panel" style={{ overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)' }}>
            <h2 className="hz-title">People</h2>
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
              badge={(id) => {
                const isCaller = id === room.hostPlayerId && !lobby.hostPlays;
                return isCaller ? (
                  <span className="hz-tix">Caller</span>
                ) : (
                  <span className="hz-tix">
                    {ticketsOf(id)}
                    <small>tix</small>
                  </span>
                );
              }}
            />
          </div>
          <div className="hz-chatbox">
            <ChatPanel messages={chat} youId={youId} className="docked-chat" />
          </div>
        </section>
      </div>
    </div>
  );
}

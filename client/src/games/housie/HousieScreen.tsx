import './housie.css';
import { useEffect, useState, type CSSProperties, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { formatRoomCode, type ChatMessage, type RoomState } from '@myarena/shared';
import { Modal } from '../../components/common/Modal';
import { leaveRoom, resetRoom } from '../../state/roomStore';
import { toast } from '../../components/common/Toast';
import { useMediaQuery } from '../../state/viewport';
import { LobbyDialog } from '../ludo/MatchDialogs';
import { BallConsole } from './BallConsole';
import { CallerConsole } from './CallerConsole';
import { ChatDock, useChatMinimized } from './ChatDock';
import { CombinationTiles } from './CombinationTiles';
import { MasterBoard } from './MasterBoard';
import { ResultsOverlay } from './ResultsOverlay';
import { TicketArea } from './TicketArea';
import { act, claim, selectTicket, toggleMark, useHousie } from './housieStore';

interface Props {
  room: RoomState;
  youId: string;
  invitePath: string | null;
  chat: ChatMessage[];
}

/** Remaining milliseconds until `until` (epoch ms), ticking once a second while it is in the future. */
function useRemaining(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);
  return Math.max(0, until - now);
}

/** Share of the left column the combination tiles need: a few tiles take little, a full set takes more. */
function tilesWeight(count: number): number {
  if (count <= 6) return 0.45;
  if (count <= 12) return 0.7;
  return 1;
}

/** The Housie match screen: tickets and combinations on the left, ball console and chat on the right (contracts/match-screen-layout.md). */
export function HousieScreen({ room, youId, invitePath, chat }: Props): ReactElement {
  const navigate = useNavigate();
  const { view, marks, selected, bogus, lockedUntil, celebrate } = useHousie();
  const wide = useMediaQuery('(min-width: 720px) and (min-aspect-ratio: 5/4)');
  const minimized = useChatMinimized();
  const [tab, setTab] = useState<'board' | 'tickets'>('board');
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const lockedMs = useRemaining(lockedUntil);

  const isHost = room.hostPlayerId === youId;
  const playing = view?.you.playing ?? false;
  // A host who is not playing only calls; a playing host switches between the master board and their tickets.
  const showTickets = playing && (!isHost || tab === 'tickets');

  const leave = (): void => {
    leaveRoom();
    navigate('/');
  };

  const people = room.seats.filter((s) => s.occupant).length;

  if (!view) {
    return (
      <div className="hz hz-match">
        <p className="hz-wait" role="status">
          Getting your tickets...
        </p>
      </div>
    );
  }

  const finished = view.phase === 'finished';
  const current = view.called[view.called.length - 1] ?? null;

  const leftTop = showTickets ? (
    <TicketArea
      tickets={view.you.tickets}
      marks={marks}
      selected={selected}
      onSelect={selectTicket}
      onToggle={toggleMark}
    />
  ) : (
    <div className="hz-board-wrap">
      <MasterBoard called={view.called} current={current} />
    </div>
  );

  const ballRegion = isHost ? (
    <CallerConsole caller={view.caller} called={view.called} finished={finished} onAction={act} />
  ) : (
    <BallConsole called={view.called} />
  );

  return (
    <div
      className={`hz hz-match ${wide ? 'wide' : 'narrow'} ${minimized && wide ? 'chat-min' : ''} ${isHost ? 'is-host' : ''}`}
      style={{ '--hz-tiles': `${tilesWeight(view.combos.length)}fr`, '--hz-tiles-n': `${tilesWeight(view.combos.length) * 0.9}fr` } as CSSProperties}
    >
      <header className="hz-head">
        <button type="button" className="hz-btn small" onClick={() => setQuitOpen(true)}>
          Quit
        </button>
        <strong className="hz-brand">HOUSIE</strong>
        <span className="hz-chip" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
          {formatRoomCode(room.roomId)}
        </span>
        <span className="hz-spacer" />
        {isHost && playing && (
          <div className="hz-seg" role="group" aria-label="Left area">
            <button type="button" aria-pressed={tab === 'board'} onClick={() => setTab('board')}>
              Board
            </button>
            <button type="button" aria-pressed={tab === 'tickets'} onClick={() => setTab('tickets')}>
              {wide ? 'My Tickets' : 'Tickets'} ({view.you.tickets.length})
            </button>
          </div>
        )}
        <span className="hz-chip">
          {people} / {room.capacity}
        </span>
        <button type="button" className="hz-btn small" onClick={() => setLobbyOpen(true)}>
          Lobby
        </button>
      </header>

      <div className="hz-main">
        <div className="hz-left">
          <div className="hz-left-top hz-panel">{leftTop}</div>
          <div className="hz-left-bottom hz-panel">
            <CombinationTiles
              combos={view.combos}
              selectedTicket={selected}
              canClaim={playing && !finished}
              lockedMs={lockedMs}
              bogus={bogus}
              celebrate={celebrate}
              onClaim={claim}
            />
          </div>
        </div>
        <div className="hz-right">
          <div className="hz-ball hz-panel">{ballRegion}</div>
          {wide && (
            <div className="hz-chat">
              <ChatDock messages={chat} youId={youId} mode="dock" />
            </div>
          )}
        </div>
      </div>

      {!wide && <ChatDock messages={chat} youId={youId} mode="drawer" />}

      <LobbyDialog open={lobbyOpen} onClose={() => setLobbyOpen(false)} room={room} youId={youId} invitePath={invitePath} />
      <Modal open={quitOpen} title="Quit the match" onClose={() => setQuitOpen(false)}>
        <h2 className="modal-title">Quit the match?</h2>
        <p className="hint">Your seat will be freed and your tickets stop playing. The others keep playing.</p>
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={() => setQuitOpen(false)}>
            Stay
          </button>
          <button type="button" className="btn danger" onClick={leave}>
            Quit
          </button>
        </div>
      </Modal>

      {finished && view.results && (
        <ResultsOverlay
          results={view.results}
          calledCount={view.called.length}
          isHost={isHost}
          onLeave={leave}
          onNewRound={() => {
            void resetRoom().then((res) => {
              if (!res.ok) toast(res.message);
            });
          }}
        />
      )}
    </div>
  );
}

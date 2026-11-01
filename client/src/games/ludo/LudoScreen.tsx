import './ludo.css';
import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { COLOR_HEX, COLOR_ORDER, formatRoomCode, type ChatMessage, type LudoColor, type RoomState } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import { toast } from '../../components/common/Toast';
import { leaveRoom, useRoom } from '../../state/roomStore';
import { useMediaQuery, useReducedMotion } from '../../state/viewport';
import { Board, type CornerLabel } from './Board';
import { DiceConsole } from './DiceConsole';
import { updateLayoutPrefs, useLayoutPrefs } from './layoutPrefs';
import { LobbyDialog, QuitDialog } from './MatchDialogs';
import { PlayerPanels } from './PlayerPanels';
import { usePlayerInfo, type PlayerInfo } from './playerInfo';
import { Pawns, type Fx } from './Pawns';
import { ResultsOverlay } from './ResultsOverlay';
import { SidePanel } from './SidePanel';
import { useBoardFit } from './useBoardFit';
import { useLudo, type ReadyLudo } from './useLudo';

export interface MatchScreenProps {
  room: RoomState;
  youId: string;
  invitePath: string | null;
  chat: ChatMessage[];
}

const NO_FX: Fx = { route: new Set(), landing: null };

async function copyInvite(invitePath: string): Promise<void> {
  const link = `${window.location.origin}${invitePath}`;
  try {
    await navigator.clipboard.writeText(link);
    toast('Invite link copied');
  } catch {
    toast('Could not copy. Open Lobby to see the link.');
  }
}

function Header(props: {
  room: RoomState;
  info: Map<string, PlayerInfo>;
  invitePath: string | null;
  onLobby: () => void;
  onQuit: () => void;
}): ReactElement {
  const { room, info, invitePath, onLobby, onQuit } = props;
  return (
    <header className="ludo-head">
      <span className="brand" aria-label="myArena Hub">
        <span className="brand-my">my</span>
        <span className="brand-arena">Arena</span>
      </span>
      <div className="head-title">
        <strong>LUDO ROOM</strong>
        <span className="code-chip" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
          {formatRoomCode(room.roomId)}
        </span>
      </div>
      {invitePath && (
        <button type="button" className="btn ghost small copy-invite" onClick={() => void copyInvite(invitePath)}>
          Copy invite link
        </button>
      )}
      <ul className="head-avatars" aria-label="Players in the room">
        {room.seats.flatMap((s) =>
          s.occupant ? [s.occupant] : [],
        ).map((p) => (
          <li key={p.playerId} title={p.displayName}>
            <Avatar k={info.get(p.playerId)?.avatar ?? p.avatar} size={26} ring={COLOR_HEX[p.color]} />
          </li>
        ))}
      </ul>
      <div className="head-actions">
        <button type="button" className="btn ghost small" onClick={onLobby}>
          Lobby
        </button>
        <button type="button" className="btn danger small" onClick={onQuit}>
          Quit
        </button>
      </div>
    </header>
  );
}

/** The Ludo match screen: three columns in landscape, stacked with a peek drawer in portrait; the board is always the largest square. */
export function LudoScreen({ room, youId, invitePath, chat }: MatchScreenProps): ReactElement {
  const navigate = useNavigate();
  const ludo = useLudo(youId);
  const info = usePlayerInfo(room);
  const reduced = useReducedMotion();
  const prefs = useLayoutPrefs();
  const { unread } = useRoom();
  const landscape = useMediaQuery('(orientation: landscape) and (min-width: 560px)');
  const shortHeight = useMediaQuery('(max-height: 520px)');
  const smallPortrait = useMediaQuery('(max-height: 699px)');
  const compact = landscape ? shortHeight : smallPortrait;
  // On a short landscape phone the board needs the width, so chat starts collapsed until the player chooses.
  const chatOpen = prefs.chatOpen ?? !(landscape && shortHeight);
  const fit = useBoardFit(!landscape);
  const [fx, setFx] = useState<Fx>(NO_FX);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [drawerOpen, setDrawerExpanded] = useState(false);
  const [announce, setAnnounce] = useState('');

  // The match owns the whole viewport: nothing scrolls.
  useEffect(() => {
    document.documentElement.classList.add('ludo-active');
    return () => document.documentElement.classList.remove('ludo-active');
  }, []);

  const lastEntry = ludo.state?.activity[ludo.state.activity.length - 1];
  useEffect(() => {
    if (lastEntry) setAnnounce(lastEntry.text);
  }, [lastEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toHub = (): void => {
    leaveRoom();
    navigate('/');
  };

  const state = ludo.state;
  const ready: ReadyLudo | null = state ? { ...ludo, state } : null;

  const corners = {} as Record<LudoColor, CornerLabel | null>;
  for (const c of COLOR_ORDER) corners[c] = null;
  for (const p of state?.players ?? []) {
    if (p.status === 'active') corners[p.color] = { text: `P${p.slot}`, host: !!info.get(p.playerId)?.isHost };
  }

  const board =
    ready && fit.side > 0 ? (
      <Board side={fit.side} route={fx.route} landing={fx.landing} corners={corners}>
        <Pawns
          state={ready.state}
          side={fit.side}
          youId={youId}
          eligible={ready.eligible}
          anim={ready.anim}
          reduced={reduced}
          onMove={ready.move}
          onFx={setFx}
        />
      </Board>
    ) : null;

  const dice = ready ? <DiceConsole ludo={ready} info={info} compact={compact} row={!landscape || compact || smallPortrait} /> : null;
  const panels = ready ? <PlayerPanels state={ready.state} info={info} youId={youId} compact={compact} /> : null;

  const sideVisible = landscape ? chatOpen : drawerOpen;
  const side = (
    <SidePanel messages={chat} youId={youId} activity={state?.activity ?? []} visible={sideVisible} />
  );

  const modeClass = landscape ? 'landscape' : 'portrait';

  return (
    <div className={`ludo-screen ${modeClass} ${compact ? 'compact' : ''}`}>
      <Header room={room} info={info} invitePath={invitePath} onLobby={() => setLobbyOpen(true)} onQuit={() => setQuitOpen(true)} />

      {landscape ? (
        <div className="ludo-body">
          <div className="board-region" ref={fit.ref}>
            {board}
          </div>
          <aside className="right-col" aria-label="Dice, players, and chat">
            {dice}
            {panels}
            <section className={`chat-dock ${chatOpen ? 'open' : 'minimized'}`} aria-label="Chat and activity">
              <button
                type="button"
                className="dock-bar"
                aria-expanded={chatOpen}
                aria-controls="chat-dock-body"
                onClick={() => updateLayoutPrefs({ chatOpen: !chatOpen })}
              >
                <span aria-hidden="true">💬</span>
                <span>Chat &amp; activity</span>
                {!chatOpen && unread > 0 && (
                  <span className="unread" aria-label={`${unread} unread messages`}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
                <span className="dock-toggle">{chatOpen ? 'Minimize ▾' : 'Open ▴'}</span>
              </button>
              <div id="chat-dock-body" className="dock-body" hidden={!chatOpen}>
                {side}
              </div>
            </section>
          </aside>
        </div>
      ) : (
        <div className="ludo-body">
          <div className="board-region" ref={fit.ref}>
            {board}
          </div>
          <div className="dice-section">{dice}</div>
          <div className="panels-section">{panels}</div>
          <div className="drawer-room" aria-hidden="true" />
          <div className={`peek-drawer ${drawerOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="drawer-handle"
              aria-expanded={drawerOpen}
              aria-controls="peek-body"
              onClick={() => setDrawerExpanded(!drawerOpen)}
            >
              <span aria-hidden="true">💬</span>
              <span>Chat &amp; activity</span>
              {!drawerOpen && unread > 0 && (
                <span className="unread" aria-label={`${unread} unread messages`}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              <span className="drawer-chevron" aria-hidden="true">
                {drawerOpen ? '▾' : '▴'}
              </span>
            </button>
            <div id="peek-body" className="peek-body" hidden={!drawerOpen}>
              {side}
            </div>
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {state && <ResultsOverlay state={state} info={info} youId={youId} onHub={toHub} />}
      <LobbyDialog open={lobbyOpen} onClose={() => setLobbyOpen(false)} room={room} youId={youId} invitePath={invitePath} />
      <QuitDialog open={quitOpen} onClose={() => setQuitOpen(false)} onQuit={toHub} />
      {!state && (
        <div className="ludo-waiting" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" /> Waiting for the server...
        </div>
      )}
    </div>
  );
}

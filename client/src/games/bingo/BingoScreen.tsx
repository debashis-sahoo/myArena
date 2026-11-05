import './bingo.css';
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { ballLetter, formatRoomCode, getBingoPattern, type BingoView, type ChatMessage, type RoomState } from '@myarena/shared';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { SoundToggle } from '../../components/hub/SoundToggle';
import { leaveRoom, resetRoom } from '../../state/roomStore';
import { useMediaQuery } from '../../state/viewport';
import { LobbyDialog } from '../ludo/MatchDialogs';
import { BallConsole } from './BallConsole';
import { BingoChat } from './BingoChat';
import { CallerConsole } from './CallerConsole';
import { CardArea } from './CardArea';
import { MasterBoard } from './MasterBoard';
import { PatternDashboard } from './PatternDashboard';
import { ResultsOverlay } from './ResultsOverlay';
import { act, selectCard, toggleDaub, useBingo } from './bingoStore';
import {
  MIN_CARD_CELL,
  MIN_CARD_CELL_H,
  cardsHeightFor,
  cardsWidth,
  patternHeights,
  planCards,
  useRegionSize,
  type BingoLayout,
} from './useFit';

interface Props {
  room: RoomState;
  youId: string;
  invitePath: string | null;
  chat: ChatMessage[];
}

// Region sizing (px); mirrors the paddings and gaps in bingo.css (a panel's padding plus its 1 px border) so the rows can follow the pattern count.
// `.bz .bz-panel` keeps the wide layout's 10/12 padding; narrow and short set their own.
const GAP: Record<BingoLayout, number> = { wide: 8, narrow: 4, short: 4 };
const DASH_FRAME: Record<BingoLayout, { w: number; h: number }> = { wide: { w: 26, h: 22 }, narrow: { w: 10, h: 10 }, short: { w: 10, h: 10 } };
const TOP_FRAME: Record<BingoLayout, { w: number; h: number }> = { wide: { w: 26, h: 22 }, narrow: { w: 6, h: 6 }, short: { w: 10, h: 10 } };
const PD_GAP = 4; // between the dashboard's header or bar and its tiles
const TITLE_H = 20;
const CLAIM_H = 44; // BINGO! header (wide) or bar
const SWITCH_H = 48; // Board | My Cards switch and its gap
const BOARD_PREF_H = 200;
const BOARD_MIN_H = 140;
const LEFT_SHARE = 0.58;
const SHORT_RIGHT_MIN = 296; // two tile columns, the console and the BINGO! bar
const SHORT_LEFT_MIN = 5 * MIN_CARD_CELL + 4 * 3 + 16 + 10;
const SHORT_BOARD_LEFT = 380;

interface DashBounds {
  natural: number;
  two: number;
  one: number;
}

/** Height the pattern dashboard needs for all tiles (natural), for two tile rows and for a single one. */
function dashBounds(innerW: number, count: number, claim: boolean, layout: BingoLayout): DashBounds {
  const tiles = patternHeights(innerW, count, layout);
  const head = layout === 'wide' ? (claim ? CLAIM_H : TITLE_H) + PD_GAP : claim ? CLAIM_H + PD_GAP : 0;
  const chrome = DASH_FRAME[layout].h + head;
  return { natural: chrome + tiles.natural, two: chrome + tiles.two, one: chrome + tiles.one };
}

/** All tiles while the cards keep their preferred height; else two tile rows while the cards keep their minimum; else one row. */
function dashHeight(avail: number, b: DashBounds, prefTop: number, minTop: number): number {
  const dash = Math.max(Math.min(b.natural, avail - prefTop), Math.min(b.two, avail - minTop), b.one);
  return Math.max(0, Math.min(dash, avail));
}

/** The Bingo match screen (contracts/match-screen-layout.md). */
export function BingoScreen(props: Props): ReactElement {
  const { view } = useBingo();
  if (!view) {
    return (
      <div className="bz bz-match">
        <p className="bz-wait" role="status">
          Getting your cards...
        </p>
      </div>
    );
  }
  return <BingoMatch {...props} view={view} />;
}

function BingoMatch({ room, youId, invitePath, chat, view }: Props & { view: BingoView }): ReactElement {
  const navigate = useNavigate();
  const { daubs, freeTapped, selected, ballKey, celebrate } = useBingo();
  const landscape = useMediaQuery('(min-width: 720px) and (min-aspect-ratio: 5/4)');
  // Landscape phones are too short for the wide layout; short takes precedence over wide and narrow.
  const short = useMediaQuery('(max-height: 520px) and (min-aspect-ratio: 5/4) and (min-width: 560px)');
  const layout: BingoLayout = short ? 'short' : landscape ? 'wide' : 'narrow';
  const wide = layout === 'wide';
  const main = useRegionSize<HTMLDivElement>();
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [tab, setTab] = useState<'board' | 'cards'>('board');
  const [announcement, setAnnouncement] = useState('');
  const lastBall = useRef(ballKey);
  const lastClaim = useRef(celebrate?.key);

  const isHost = room.hostPlayerId === youId;
  const playing = view.you.playing;
  const finished = view.phase === 'finished';
  const cardCount = view.you.cards.length;
  const people = room.seats.filter((s) => s.occupant).length;
  const current = view.called[view.called.length - 1] ?? null;

  // A host who does not play only calls; a playing host switches between the master board and their cards.
  const showSwitch = isHost && playing;
  const showBoard = isHost && (!playing || tab === 'board');
  const showCards = playing && !showBoard;

  useEffect(() => {
    if (ballKey === lastBall.current) return;
    lastBall.current = ballKey;
    const n = view.called[view.called.length - 1];
    if (n !== undefined) setAnnouncement(`Ball ${ballLetter(n)} ${n}`);
  }, [ballKey, view.called]);

  useEffect(() => {
    if (!celebrate || celebrate.key === lastClaim.current) return;
    lastClaim.current = celebrate.key;
    const winner = view.patterns.find((p) => celebrate.patterns.includes(p.id))?.claimedBy?.name ?? 'Someone';
    const names = celebrate.patterns.map((id) => getBingoPattern(id)?.name ?? id).join(', ');
    setAnnouncement(`${winner} won ${names}`);
  }, [celebrate, view.patterns]);

  const leave = (): void => {
    leaveRoom();
    navigate('/');
  };

  const newRound = (): void => {
    void resetRoom().then((res) => {
      if (!res.ok) toast(res.message);
    });
  };

  // Dashboard row: as tall as its tiles need, but never so tall that the cards or board drop below their preferred height (40 px cells) while two tile rows still fit.
  const patternCount = view.settings.patterns.length;
  const topExtra = TOP_FRAME[layout].h + (showSwitch ? SWITCH_H : 0);
  const prefTop = (showCards ? cardsHeightFor(cardCount, MIN_CARD_CELL) : BOARD_PREF_H) + topExtra;
  const minTop = (showCards ? cardsHeightFor(cardCount, MIN_CARD_CELL_H) : BOARD_MIN_H) + topExtra;
  let mainStyle: CSSProperties | undefined;
  let leftStyle: CSSProperties | undefined;
  if (main.width > 0 && main.height > 0) {
    const gap = GAP[layout];
    if (layout === 'wide') {
      const innerW = Math.floor((main.width - gap) * LEFT_SHARE) - DASH_FRAME.wide.w;
      const dash = dashHeight(main.height - gap, dashBounds(innerW, patternCount, playing, 'wide'), prefTop, minTop);
      leftStyle = { gridTemplateRows: `minmax(0, 1fr) ${dash}px` };
    } else if (layout === 'narrow') {
      const hostH = showCards ? Math.min(120, Math.max(92, Math.round(main.height * 0.17))) : Math.max(150, Math.round(main.height * 0.25));
      const ballH = isHost ? hostH : Math.min(120, Math.max(62, Math.round(main.height * 0.13)));
      const b = dashBounds(main.width - DASH_FRAME.narrow.w, patternCount, playing, 'narrow');
      const dash = dashHeight(main.height - ballH - 2 * gap, b, prefTop, minTop);
      mainStyle = { gridTemplateRows: `${ballH}px minmax(0, 1fr) ${dash}px` };
    } else {
      // Left column: just wide enough for the cards (cells up to 1.5:1 at the available height) or half the width for the board; the rest is the console over the dashboard.
      const maxLeft = Math.max(0, main.width - gap - SHORT_RIGHT_MIN);
      let left = Math.min(Math.round((main.width - gap) * 0.5), SHORT_BOARD_LEFT);
      if (showCards) {
        const innerH = main.height - topExtra;
        left = cardsWidth(planCards(Math.max(0, maxLeft - TOP_FRAME.short.w), innerH, cardCount), cardCount) + TOP_FRAME.short.w;
      }
      left = Math.min(Math.max(left, SHORT_LEFT_MIN), maxLeft);
      const b = dashBounds(main.width - gap - left - DASH_FRAME.short.w, patternCount, playing, 'short');
      const room = main.height - gap;
      const ballMin = isHost ? (showCards ? 96 : 136) : 62;
      const ballMax = isHost ? (showCards ? 120 : 150) : 128;
      const ballH = Math.min(Math.max(ballMin, Math.min(ballMax, room - b.natural)), Math.max(0, room - b.one));
      mainStyle = { gridTemplateColumns: `${left}px minmax(0, 1fr)`, gridTemplateRows: `${ballH}px minmax(0, 1fr)` };
    }
  }

  const leftTopContent = showBoard ? (
    <MasterBoard called={view.called} current={current} />
  ) : showCards ? (
    <CardArea cards={view.you.cards} daubs={daubs} freeTapped={freeTapped} selected={selected} onSelect={selectCard} onToggle={toggleDaub} />
  ) : (
    <div className="bz-caller-note" role="status">
      <strong>You are watching</strong>
      <span>You do not hold cards in this match.</span>
    </div>
  );

  const ballRegion = isHost ? (
    <CallerConsole caller={view.caller} called={view.called} ballKey={ballKey} finished={finished} onAction={act} />
  ) : (
    <BallConsole called={view.called} ballKey={ballKey} />
  );

  return (
    <div className={`bz bz-match ${layout} ${isHost ? 'is-host' : ''}`}>
      <header className="bz-head">
        <button type="button" className="bz-btn small" onClick={() => setQuitOpen(true)}>
          Quit
        </button>
        <strong className="bz-brand">BINGO</strong>
        <span className="bz-chip" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
          {formatRoomCode(room.roomId)}
        </span>
        <span className="bz-spacer" />
        <span className="bz-chip" aria-label={`${people} of ${room.capacity} players`}>
          {people} / {room.capacity}
        </span>
        <button type="button" className="bz-btn small" onClick={() => setLobbyOpen(true)}>
          Lobby
        </button>
        {!wide && <BingoChat messages={chat} youId={youId} mode="drawer" />}
        <SoundToggle />
      </header>

      <div ref={main.ref} className="bz-main" style={mainStyle}>
        <div className="bz-left" style={leftStyle}>
          <div className={`bz-left-top bz-panel${showSwitch ? ' has-head' : ''}`} data-region="cards">
            {showSwitch && (
              <div className="bz-lt-head">
                <div className="bz-seg" role="group" aria-label="Left area">
                  <button type="button" aria-pressed={tab === 'board'} onClick={() => setTab('board')}>
                    Board
                  </button>
                  <button type="button" aria-pressed={tab === 'cards'} onClick={() => setTab('cards')}>
                    My Cards{cardCount > 1 ? ` (${cardCount})` : ''}
                  </button>
                </div>
              </div>
            )}
            <div className="bz-lt-body">{leftTopContent}</div>
          </div>
          <div className="bz-left-bottom bz-panel" data-region="pattern-dashboard">
            <PatternDashboard layout={layout} />
          </div>
        </div>
        <div className="bz-right">
          <div className="bz-right-top bz-panel" data-region="ball-console">
            {ballRegion}
          </div>
          {wide && (
            <div className="bz-right-bottom" data-region="chat">
              <BingoChat messages={chat} youId={youId} mode="dock" />
            </div>
          )}
        </div>
      </div>

      <div className="bz-sr-only" aria-live="polite" role="status">
        {announcement}
      </div>

      {finished && (
        <ResultsOverlay results={view.results ?? []} calledCount={view.called.length} isHost={isHost} onLeave={leave} onNewRound={newRound} />
      )}

      <LobbyDialog open={lobbyOpen} onClose={() => setLobbyOpen(false)} room={room} youId={youId} invitePath={invitePath} />
      <Modal open={quitOpen} title="Quit the match" onClose={() => setQuitOpen(false)}>
        <h2 className="modal-title">Quit the match?</h2>
        <p className="hint">Your seat will be freed and your cards stop playing. The others keep playing.</p>
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={() => setQuitOpen(false)}>
            Stay
          </button>
          <button type="button" className="btn danger" onClick={leave}>
            Quit
          </button>
        </div>
      </Modal>
    </div>
  );
}

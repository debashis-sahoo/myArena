import './uno.css';
import './UnoScreen.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { formatRoomCode, getGame, unoCardOf, type RoomState, type UnoSeatView } from '@myarena/shared';
import { toast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { SoundToggle } from '../../components/hub/SoundToggle';
import { leaveRoom } from '../../state/roomStore';
import { useLayoutMode, useReducedMotion } from '../../state/viewport';
import type { MatchScreenProps } from '../ludo/LudoScreen';
import { usePlayerInfo, type PlayerInfo } from '../ludo/playerInfo';
import { ColorWheel } from './ColorWheel';
import { Hand } from './Hand';
import { OpponentSeat, type SeatWho } from './OpponentSeat';
import { ResultsOverlay } from './ResultsOverlay';
import { TableCenter } from './TableCenter';
import { TopLayer } from './TopLayer';
import { UnoChat } from './UnoChat';
import { UnoControls } from './UnoControls';
import { playCard, useUno, type UnoBanner } from './unoStore';
import { useRegionSize, useUnoFit, type UnoChatMode } from './useFit';
import { useUnoAnimator } from './useUnoAnimator';

const SEAT_COLORS = getGame('uno')?.seatColors ?? [];

async function copyInvite(invitePath: string): Promise<void> {
  const link = `${window.location.origin}${invitePath}`;
  try {
    await navigator.clipboard.writeText(link);
    toast('Invite link copied');
  } catch {
    toast('Could not copy the invite link');
  }
}

/** Seat order clockwise from the viewer: the players after me in slot order, wrapping (FR-025). */
function opponentsOf(players: readonly UnoSeatView[], me: string): UnoSeatView[] {
  const i = players.findIndex((p) => p.playerId === me);
  return i < 0 ? [...players] : [...players.slice(i + 1), ...players.slice(0, i)];
}

function whoOf(room: RoomState, info: ReadonlyMap<string, PlayerInfo>, seat: UnoSeatView): SeatWho {
  const known = info.get(seat.playerId);
  const occupant = room.seats.find((s) => s.occupant?.playerId === seat.playerId)?.occupant;
  return {
    avatar: known?.avatar ?? (seat.kind === 'bot' ? 'robot' : 'fox'),
    color: occupant?.color ?? SEAT_COLORS[seat.slot] ?? 'orange',
    isHost: known?.isHost ?? false,
    connection: known?.connection ?? 'gone',
  };
}

const newest = (list: readonly UnoBanner[]): UnoBanner | null => list[list.length - 1] ?? null;

/** The UNO match screen (contracts/match-screen-layout.md section 3). */
export function UnoScreen(props: MatchScreenProps): ReactElement {
  const reduced = useReducedMotion();
  useUnoAnimator(reduced);
  const { shown } = useUno();

  // The match owns the whole viewport: nothing scrolls.
  useEffect(() => {
    document.documentElement.classList.add('uno-active');
    return () => document.documentElement.classList.remove('uno-active');
  }, []);

  if (!shown) return <Dealing />;
  return <UnoMatch {...props} />;
}

function Dealing(): ReactElement {
  const navigate = useNavigate();
  return (
    <div className="un un-screen">
      <div className="un-dealing" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <strong>Dealing the cards...</strong>
        <button
          type="button"
          className="un-btn ghost"
          onClick={() => {
            leaveRoom();
            navigate('/');
          }}
        >
          Back to Hub
        </button>
      </div>
    </div>
  );
}

function UnoMatch({ room, youId, invitePath, chat }: MatchScreenProps): ReactElement | null {
  const navigate = useNavigate();
  const { shown, banners, rejection, catchOpen } = useUno();
  const { dockedChat } = useLayoutMode();
  const info = usePlayerInfo(room);
  const region = useRegionSize<HTMLDivElement>();
  const centreRef = useRef<HTMLDivElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [wild, setWild] = useState<number | null>(null);

  const table = shown?.table ?? null;
  const you = shown?.you ?? null;
  const solo = room.mode === 'ai';
  const chatMode: UnoChatMode = solo ? 'none' : dockedChat ? 'dock' : 'drawer';
  const opponents = useMemo(() => (table ? opponentsOf(table.players, youId) : []), [table, youId]);
  const fit = useUnoFit(region, opponents.length, { chat: chatMode });

  const playing = table !== null && (table.phase === 'turn' || table.phase === 'drawn');
  const yourTurn = playing && you !== null && table.turn === you.playerId;

  // The wheel closes when the move it belongs to is no longer open (countdown ended, turn changed).
  useEffect(() => {
    if (wild !== null && (!yourTurn || !you?.playable.includes(wild))) setWild(null);
  }, [wild, yourTurn, you]);

  if (!table) return null;

  const leave = (): void => {
    leaveRoom();
    navigate('/');
  };
  const canPlayAgain = solo || room.hostPlayerId === youId;
  const { hand } = fit;
  const compact = fit.width < 440;
  const tiny = fit.width < 360;
  const ctlTop = hand.rowRect ? hand.rowRect.y : hand.bandRect.y;
  const centreBanner = newest(banners.filter((b) => !b.playerId || b.playerId === youId));
  const wildTitle = wild !== null && unoCardOf(wild).kind === 'wild4' ? 'Wild Draw Four: pick a colour' : 'Wild: pick a colour';

  const frameStyle = { '--hh': `${fit.headerH}px` } as CSSProperties;

  return (
    <div className="un un-screen">
      <div className="un-frame" ref={region.ref} style={frameStyle}>
        <header className="un-head" style={{ height: fit.headerH }}>
          <button type="button" className="un-btn" onClick={() => setLeaveOpen(true)}>
            Leave
          </button>
          {!tiny && <strong className="un-brand">UNO</strong>}
          <span className="un-code" title="Room code" aria-label={`Room code ${room.roomId.split('').join(' ')}`}>
            {formatRoomCode(room.roomId)}
          </span>
          <span className="un-spacer" />
          {invitePath && (
            <button type="button" className="un-btn" aria-label="Copy invite link" onClick={() => void copyInvite(invitePath)}>
              {compact ? <span aria-hidden="true">🔗</span> : 'Copy invite'}
            </button>
          )}
          <SoundToggle />
          {chatMode === 'drawer' && <UnoChat messages={chat} youId={youId} mode="drawer" />}
        </header>

        {fit.ready && (
          <div className="un-table" data-uno-table="" style={{ top: fit.headerH, width: fit.tableWidth, height: fit.tableHeight }}>
            {opponents.map((seat, i) => {
              const placement = fit.seats[i];
              if (!placement) return null;
              const active = playing && table.turn === seat.playerId;
              return (
                <OpponentSeat
                  key={seat.playerId}
                  placement={placement}
                  seat={seat}
                  who={whoOf(room, info, seat)}
                  active={active}
                  remainingMs={active && seat.kind === 'human' ? table.remainingMs : null}
                  thinking={table.thinking === seat.playerId}
                  catchable={catchOpen?.victim === seat.playerId && you !== null}
                  banner={newest(banners.filter((b) => b.playerId === seat.playerId))}
                />
              );
            })}

            <div className="un-centre" ref={centreRef} style={{ left: fit.centre.x, top: fit.centre.y, width: fit.centre.width, height: fit.centre.height }}>
              <TableCenter width={fit.centre.width} height={fit.centre.height} piles={fit.piles} band={fit.band} table={table} canDraw={you?.canDraw ?? false} />
              {centreBanner && (
                <TopLayer anchor={centreRef} trigger={centreBanner.id}>
                  <span key={centreBanner.id} className={`un-banner-chip un-banner-pop ${centreBanner.kind}`}>
                    {centreBanner.text}
                  </span>
                </TopLayer>
              )}
            </div>

            {you && (
              <div className="un-hand-slot" style={{ left: Math.round((fit.tableWidth - hand.width) / 2), top: hand.bandRect.y, width: hand.width, height: hand.bandH }}>
                <Hand playerId={you.playerId} hand={you.hand} playable={you.playable} yourTurn={yourTurn} drawn={you.drawn} width={hand.width} cardH={hand.cardH} pad={hand.pad} onWild={setWild} />
              </div>
            )}

            <div className="un-ctl-box" style={{ left: 0, top: ctlTop, width: fit.tableWidth, height: hand.rowH + hand.bandH }}>
              <UnoControls table={table} you={you} layout={hand.buttons} banners={banners} rejection={rejection} />
            </div>
          </div>
        )}

        {fit.ready && chatMode === 'dock' && (
          <div className="un-chat-col" style={{ top: fit.headerH, width: fit.chat.width, height: fit.tableHeight }}>
            <UnoChat messages={chat} youId={youId} mode="dock" />
          </div>
        )}
      </div>

      <ColorWheel
        open={wild !== null}
        title={wildTitle}
        onChoose={(color) => {
          const card = wild;
          setWild(null);
          if (card !== null) void playCard(card, color);
        }}
        onCancel={() => setWild(null)}
      />

      <ResultsOverlay table={table} youId={youId} info={info} canPlayAgain={canPlayAgain} onHub={leave} />

      <Modal open={leaveOpen} title="Leave the match" onClose={() => setLeaveOpen(false)}>
        <h2 className="modal-title">Leave the match?</h2>
        <p className="hint">{solo ? 'The match will end.' : 'You cannot rejoin this match. The others keep playing.'}</p>
        <div className="un-leave-actions">
          <button type="button" className="btn ghost" onClick={() => setLeaveOpen(false)}>
            Stay
          </button>
          <button type="button" className="btn danger" onClick={leave}>
            Leave
          </button>
        </div>
      </Modal>
    </div>
  );
}

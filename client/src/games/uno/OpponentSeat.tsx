/*
 * One opponent at the table. The seat positions itself (absolute, table coordinates), so render it inside the table box.
 * Props:
 *   placement    SeatPlacement from useUnoFit().seats: rect (table coordinates) and edge ('top' | 'left' | 'right').
 *   seat         the table.players entry: name, kind, handCount, status, calledUno, warned.
 *   who          room data for the seat: avatar key, seat tag colour name, host flag, connection ('gone' once released).
 *   active       it is this seat's turn.
 *   remainingMs  table.remainingMs while this human is on turn (drives the countdown arc), otherwise null.
 *   thinking     a bot is thinking (table.thinking === seat.playerId).
 *   catchable    a catch window is open against this seat and the viewer may catch: shows "Catch [Name]!".
 *   banner       latest short overlay for this seat ("UNO!", "Caught!", "Skipped!", "+N"), or null.
 *   turnChip     text chip beside the name on the seat that must act ("Turn", "Draws 4"), or null; a cue that does not rely on colour.
 * DOM: the root carries data-uno-seat="<playerId>" (flight target); the Catch button calls the store's catchPlayer.
 */
import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX, UNO_TURN_TIMER_MS, type UnoSeatView } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import { CardFace } from './CardFace';
import { TopLayer } from './TopLayer';
import { catchPlayer, type UnoBanner } from './unoStore';
import { CARD_ASPECT, clamp, type SeatPlacement } from './useFit';
import './OpponentSeat.css';

export interface SeatWho {
  avatar: string;
  /** Seat tag colour name (a key of COLOR_HEX). */
  color: string;
  isHost: boolean;
  connection: 'connected' | 'disconnected' | 'gone';
}

export interface OpponentSeatProps {
  placement: SeatPlacement;
  seat: UnoSeatView;
  who: SeatWho;
  active: boolean;
  remainingMs: number | null;
  thinking: boolean;
  catchable: boolean;
  banner?: UnoBanner | null;
  turnChip?: string | null;
}

const MAX_BACKS = 5;
const RING_PAD = 6;

function Fan({ count, cardH, maxWidth }: { count: number; cardH: number; maxWidth: number }): ReactElement {
  const k = Math.min(MAX_BACKS, Math.max(0, count));
  const cardW = Math.round(cardH * CARD_ASPECT);
  const step = k > 1 ? clamp(3, Math.min(Math.round(cardW * 0.4), (maxWidth - cardW) / (k - 1)), 10) : 0;
  return (
    <span className="un-seat-fan" style={{ width: cardW + (k > 1 ? (k - 1) * step : 0), height: cardH + 4 }} aria-hidden="true">
      {Array.from({ length: k }, (_, i) => {
        const t = k > 1 ? (2 * i) / (k - 1) - 1 : 0;
        return (
          <CardFace
            key={i}
            card={null}
            height={cardH}
            style={{ position: 'absolute', left: i * step, top: 2 + 2 * t * t, transform: `rotate(${(t * 12).toFixed(1)}deg)`, zIndex: i }}
          />
        );
      })}
    </span>
  );
}

/** A ring around the avatar that drains over the turn; each new value restarts a linear run to zero. */
function CountdownArc({ remainingMs, size }: { remainingMs: number; size: number }): ReactElement {
  const ref = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    const full = clamp(0, remainingMs / UNO_TURN_TIMER_MS, 1);
    const anim = el.animate(
      [{ strokeDashoffset: `${((1 - full) * 100).toFixed(2)}px` }, { strokeDashoffset: '100px' }],
      { duration: Math.max(0, remainingMs), easing: 'linear', fill: 'forwards' },
    );
    return () => anim.cancel();
  }, [remainingMs]);
  const sw = (3 * 100) / size;
  return (
    <svg className="un-seat-arc" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle ref={ref} cx={50} cy={50} r={50 - sw / 2} pathLength={100} strokeWidth={sw} transform="rotate(-90 50 50)" />
    </svg>
  );
}

function flashText(b: UnoBanner): string {
  if (b.kind === 'penalty') {
    const m = /(\d+)\s*$/.exec(b.text);
    if (m) return `+${m[1]}`;
  }
  return b.text;
}

export function OpponentSeat({ placement, seat, who, active, remainingMs, thinking, catchable, banner = null, turnChip = null }: OpponentSeatProps): ReactElement {
  const { rect, edge } = placement;
  const rootRef = useRef<HTMLDivElement>(null);
  const side = edge !== 'top';
  const bot = seat.kind === 'bot';
  const left = seat.status === 'left' || who.connection === 'gone';
  const away = !left && who.connection === 'disconnected';
  const warned = !left && !away && seat.warned;
  const count = left ? 0 : seat.handCount;

  const av = Math.round(side ? clamp(30, rect.width - RING_PAD * 2 - 8, 54) : clamp(30, rect.height - RING_PAD * 2 - 4, 56));
  const ring = av + RING_PAD * 2;
  const cardH = Math.round(side ? clamp(22, av * 0.72, 38) : clamp(22, av * 0.6, 40));
  const textW = side ? rect.width - 4 : rect.width - ring - 14;
  const longLabels = textW >= 104;
  const fanMax = side ? rect.width - 6 : Math.max(cardH, textW - 44);

  const status = left ? 'Left' : away ? (longLabels ? 'Reconnecting' : 'Away') : warned ? 'Idle' : null;
  const statusKind = left ? 'left' : away ? 'away' : 'warn';
  const showArc = active && !left && remainingMs !== null;
  const label = [
    `${seat.name}${bot ? ', bot' : ''}`,
    `${count} ${count === 1 ? 'card' : 'cards'}`,
    seat.calledUno && count > 0 && count <= 2 ? 'called UNO' : null,
    who.isHost && !left ? 'host' : null,
    active && !left ? 'playing now' : null,
    left ? 'left' : away ? 'reconnecting' : warned ? 'idle' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const cls = ['un-seat', edge, active && !left ? 'active' : '', left ? 'gone' : '', catchable ? 'catchable' : ''].filter(Boolean).join(' ');
  const style = {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    '--tag': COLOR_HEX[who.color] ?? '#ffffff',
    '--ring': `${ring}px`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={cls} style={style} data-uno-seat={seat.playerId} role="group" aria-label={label} aria-current={active && !left ? 'true' : undefined}>
      <div className="un-seat-body">
        <div className="un-seat-av" aria-hidden="true">
          <span className="un-seat-ring" />
          <Avatar k={who.avatar} size={av} />
          {showArc ? <CountdownArc remainingMs={remainingMs} size={ring} /> : null}
          {who.isHost && !left ? <span className="un-seat-crown">👑</span> : null}
          {thinking && !left ? (
            <span className="un-seat-think">
              <span className="un-dots">
                <span />
                <span />
                <span />
              </span>
            </span>
          ) : bot ? (
            <span className="un-seat-bot">BOT</span>
          ) : null}
          <span className={`un-seat-dot ${left ? 'left' : away ? 'away' : 'ok'}`} />
        </div>

        <div className="un-seat-info" aria-hidden="true">
          <div className="un-seat-name">
            <span className="n">
              {active && !left ? '▶ ' : ''}
              {seat.name}
            </span>
            {turnChip && active && !left ? <span className="un-seat-chip turn">{turnChip}</span> : null}
            {status ? <span className={`un-seat-chip ${statusKind}`}>{status}</span> : null}
          </div>
          {left ? null : (
            <div className="un-seat-cards">
              <Fan count={count} cardH={cardH} maxWidth={fanMax} />
              <span className={`un-seat-count${seat.calledUno && count <= 2 && count > 0 ? ' called' : ''}`}>×{count}</span>
            </div>
          )}
        </div>

        {catchable && !left ? (
          <div className="un-seat-catch-wrap">
            <button type="button" className="un-btn gold un-pulse un-seat-catch" aria-label={`Catch ${seat.name}`} onClick={() => void catchPlayer(seat.playerId)}>
              <span>Catch</span>
              <strong>{seat.name}!</strong>
            </button>
          </div>
        ) : null}
      </div>

      {banner ? (
        <TopLayer anchor={rootRef} trigger={banner.id}>
          <span key={banner.id} className={`un-seat-flash un-banner-pop ${banner.kind}`}>
            {flashText(banner)}
          </span>
        </TopLayer>
      ) : null}
    </div>
  );
}

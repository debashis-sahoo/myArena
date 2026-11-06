/*
 * The middle of the table: Draw Pile, Discard Pile, the active-colour aura, the arrow track and the pending-penalty badge.
 * Props:
 *   width, height  size of the centre area (fit.centre); every rect below is relative to its top-left.
 *   piles, band    fit.piles (PilePlan) and fit.band.
 *   table          the shown UnoTable (top, activeColor, direction, drawCount, discardCount, pending).
 *   canDraw        you.canDraw: the Draw Pile glows. The pile is always a real button; a tap while it cannot draw reaches the
 *                  server, which refuses with the reason.
 * DOM for the animator: [data-uno-pile="draw"] (the button, card-sized), [data-uno-pile="discard"] (the top-card slot),
 * [data-uno-aura] (halo ring around the discard slot) and [data-uno-track] (the arrow track; the Reverse flare is played there by
 * useUnoAnimator and must not be triggered here).
 */
import { type CSSProperties, type ReactElement } from 'react';
import { UNO_AURA_MS, UNO_COLOR_GLYPH, UNO_COLOR_HEX, UNO_COLOR_LABEL, type UnoTable } from '@myarena/shared';
import { useReducedMotion } from '../../state/viewport';
import { CardFace } from './CardFace';
import { drawCard } from './unoStore';
import { clamp, type PilePlan } from './useFit';
import './TableCenter.css';

export interface TableCenterProps {
  width: number;
  height: number;
  piles: PilePlan;
  band: number;
  table: UnoTable;
  canDraw: boolean;
}

const CHEVRONS = 3;
const PLATE_TILT = [-8, 6, -3] as const;

function rgbOf(hex: string): string {
  const v = Number.parseInt(hex.slice(1), 16);
  return `${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}`;
}

/** Clockwise on screen from the top-left, all coordinates in px. */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const f = (v: number): string => v.toFixed(1);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
}

export function TableCenter({ width, height, piles, band, table, canDraw }: TableCenterProps): ReactElement {
  const reduced = useReducedMotion();
  const { cardW, cardH, draw, discard, track } = piles;
  const ready = cardH > 0 && cardW > 0;
  const color = table.activeColor;
  const hex = UNO_COLOR_HEX[color];
  const clockwise = table.direction === 1;
  const dirName = clockwise ? 'Clockwise' : 'Counter-clockwise';
  const pending = table.pending;

  const drawLayers = table.drawCount <= 0 ? 0 : table.drawCount < 4 ? 1 : table.drawCount < 10 ? 2 : table.drawCount < 20 ? 3 : 4;
  const layerOff = clamp(1.5, cardW * 0.025, 4);
  const plates = Math.min(3, Math.max(0, table.discardCount - 1));
  const pad = Math.round(clamp(6, cardH * 0.04, 12));
  const badge = Math.round(clamp(34, cardW * 0.36, 54));

  const rootStyle = { width, height, '--aura': hex, '--aura-rgb': rgbOf(hex), '--aura-ms': `${UNO_AURA_MS}ms` } as CSSProperties;

  let trackEl: ReactElement | null = null;
  if (ready) {
    // The track box may start below the centre area's top (planPiles clearTop), so its top band can be thinner than `band`.
    const topBand = Math.max(0, Math.min(draw.y, discard.y) - track.y);
    const inner = band / 2;
    const innerTop = topBand / 2;
    const pw = Math.max(0, track.width - band);
    const ph = Math.max(0, track.height - innerTop - inner);
    const r = Math.min(1.25 * band, pw / 2, ph / 2);
    const d = roundedRect(inner, innerTop, pw, ph, r);
    const chevH = Math.round(clamp(16, Math.min(band, topBand) * 1.1, 34));
    const trackStyle = {
      left: track.x,
      top: track.y,
      width: track.width,
      height: track.height,
      borderRadius: r + inner,
      '--un-path': `path('${d}')`,
      '--band': `${topBand}px`,
    } as CSSProperties;
    trackEl = (
      <div className={`un-track ${clockwise ? 'cw' : 'ccw'}${reduced ? ' still' : ''}`} data-uno-track="" style={trackStyle}>
        <svg className="un-track-line" width={track.width} height={track.height} viewBox={`0 0 ${track.width} ${track.height}`} aria-hidden="true" focusable="false">
          <path d={d} />
        </svg>
        {reduced
          ? null
          : Array.from({ length: CHEVRONS }, (_, i) => (
              <span key={i} className="un-chev" style={{ '--i': i } as CSSProperties} aria-hidden="true">
                <svg width={Math.round(chevH * 1.4)} height={chevH} viewBox="0 0 28 20" focusable="false">
                  <path d="M5 3L13 10L5 17" />
                  <path d="M14 3L22 10L14 17" opacity={0.85} />
                </svg>
              </span>
            ))}
        {reduced ? (
          <span className="un-dir-badge" aria-hidden="true">
            {clockwise ? '↻' : '↺'} {dirName}
          </span>
        ) : null}
        <span className="un-sr-only">Direction of play: {dirName}</span>
      </div>
    );
  }

  return (
    <div className="un-tc" style={rootStyle}>
      {ready ? (
        <>
          <div
            className="un-aura"
            data-uno-aura=""
            style={{ left: discard.x - pad, top: discard.y - pad, width: cardW + 2 * pad, height: cardH + 2 * pad }}
          >
            <span className="un-aura-halo" aria-hidden="true" />
          </div>

          {trackEl}

          <button
            type="button"
            className={`un-draw${canDraw ? ' can' : ''}${drawLayers === 0 ? ' empty' : ''}`}
            data-uno-pile="draw"
            style={{ left: draw.x, top: draw.y, width: cardW, height: cardH }}
            aria-disabled={canDraw ? undefined : true}
            aria-label={`${pending ? `Draw ${pending.total}. ` : ''}Draw pile, ${table.drawCount} ${table.drawCount === 1 ? 'card' : 'cards'} left${canDraw ? '. Tap to draw' : ''}`}
            onClick={() => void drawCard()}
          >
            {Array.from({ length: drawLayers }, (_, i) => {
              const k = drawLayers - 1 - i;
              return <CardFace key={k} card={null} height={cardH} style={{ position: 'absolute', left: -k * layerOff, top: -k * layerOff }} />;
            })}
            {pending ? (
              <span className="un-draw-pend" style={{ fontSize: Math.max(12, Math.round(cardW * 0.16)) }}>
                Draw {pending.total}
              </span>
            ) : null}
            <span className="un-draw-count">{table.drawCount}</span>
          </button>

          <div className="un-discard" style={{ left: discard.x, top: discard.y, width: cardW, height: cardH }}>
            {Array.from({ length: plates }, (_, i) => {
              const k = plates - 1 - i;
              return <span key={k} className="un-plate" style={{ width: cardW, height: cardH, transform: `rotate(${PLATE_TILT[k] ?? 0}deg)` }} />;
            })}
            <div className="un-discard-top" data-uno-pile="discard" style={{ width: cardW, height: cardH }}>
              <CardFace card={table.top} height={cardH} />
            </div>
          </div>

          <span className="un-aura-label" style={{ left: discard.x + cardW / 2, top: discard.y + cardH + pad }}>
            <span className="un-sr-only">Active colour: </span>
            <span aria-hidden="true">{UNO_COLOR_GLYPH[color]}</span> {UNO_COLOR_LABEL[color]}
          </span>

          {pending ? (
            <div className="un-pending" style={{ left: discard.x + cardW, top: discard.y, '--d': `${badge}px` } as CSSProperties}>
              <span className="un-pending-n un-pulse">+{pending.total}</span>
              <span className="un-pending-kind">{pending.kind === 'draw2' ? 'Draw 2' : 'Wild Draw 4'}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

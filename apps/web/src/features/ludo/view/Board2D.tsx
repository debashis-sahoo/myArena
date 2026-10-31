import { memo } from 'react';
import { LANES, RING, START_INDEX, STAR_INDEXES, COLORS, type Color, type LudoMatchView } from '@myarena/ludo';
import { themeOf } from '../themes/themes';
import { Decor } from './Decor';
import { ENTRY_ARROWS, FRAMES, NAME_BARS, VIEWBOX, centreOf, slotCentres } from './geometry';
import type { Pose } from './hops';
import { Pin } from './Pin';
import { pawnKey, type PlacedPawn } from './placement';

const TRIANGLES: Record<Color, string> = {
  RED: '6,6 7.5,7.5 6,9', GREEN: '6,6 9,6 7.5,7.5', YELLOW: '9,6 9,9 7.5,7.5', BLUE: '6,9 9,9 7.5,7.5',
};
const lower = (color: Color): string => color.toLowerCase();

/** A five-pointed star outline centred on a square. */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`;
  }).join(' ');
}

/** A thin open arrow: a shaft and a chevron head, pointing along (dx, dy). */
function arrowPath(cx: number, cy: number, dx: number, dy: number): string {
  const px = -dy;
  const py = dx;
  const tip = { x: cx + dx * 0.34, y: cy + dy * 0.34 };
  const tail = { x: cx - dx * 0.34, y: cy - dy * 0.34 };
  const a = { x: tip.x - dx * 0.2 + px * 0.2, y: tip.y - dy * 0.2 + py * 0.2 };
  const b = { x: tip.x - dx * 0.2 - px * 0.2, y: tip.y - dy * 0.2 - py * 0.2 };
  return `M${tail.x} ${tail.y} L${tip.x} ${tip.y} M${a.x} ${a.y} L${tip.x} ${tip.y} L${b.x} ${b.y}`;
}

const clip = (text: string): string => (text.length > 14 ? `${text.slice(0, 13)}…` : text);

interface FixedProps { used: string; labels: string; turnColor: Color | null; theme: string; }

// Everything that does not move: it is redrawn only when the colours in play, the names or the turn change.
const BoardFixed = memo(function BoardFixed({ used, labels, turnColor, theme }: FixedProps) {
  const active = used.split(',');
  const names = labels.split('\u0000');
  return (
    <>
      <defs>
        <clipPath id="ludo-board-clip"><rect x="0" y="0" width="15" height="15" rx="0.7" /></clipPath>
        <linearGradient id="ludo-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#d9dde3" />
          <stop offset="1" stopColor="#8d949e" />
        </linearGradient>
        <radialGradient id="ludo-gloss" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      <g clipPath="url(#ludo-board-clip)">
        <rect className="ludo-board-bg" x="0" y="0" width="15" height="15" />
        {COLORS.map((color) => {
          const frame = FRAMES[color];
          return (
            <g key={color} className={`ludo-frame ludo-frame--${lower(color)}${active.includes(color) ? '' : ' is-unused'}`}>
              <rect className="ludo-frame-block" x={frame.x} y={frame.y} width={frame.size} height={frame.size} />
              <rect className="ludo-yard" x={frame.yard.x} y={frame.yard.y} width={frame.yard.size} height={frame.yard.size} />
              {slotCentres(color).map((slot, index) => <circle key={index} className="ludo-slot" cx={slot.x} cy={slot.y} r="0.58" />)}
            </g>
          );
        })}
        {RING.map((cell, index) => {
          const owner = COLORS.find((color) => START_INDEX[color] === index);
          return <rect key={`ring-${index}`} className={`ludo-cell${owner ? ` ludo-cell--start ludo-fill--${lower(owner)}` : ''}`} x={cell.col} y={cell.row} width="1" height="1" />;
        })}
        {COLORS.flatMap((color) => LANES[color].map((cell, index) => (
          <rect key={`lane-${color}-${index}`} className={`ludo-cell ludo-cell--lane ludo-fill--${lower(color)}`} x={cell.col} y={cell.row} width="1" height="1" />
        )))}
        {COLORS.map((color) => <polygon key={`home-${color}`} className={`ludo-home ludo-fill--${lower(color)}`} points={TRIANGLES[color]} />)}
        {COLORS.map((color) => {
          const { cell, dx, dy } = ENTRY_ARROWS[color];
          const c = centreOf(cell);
          return <path key={`arrow-${color}`} className={`ludo-arrow ludo-stroke--${lower(color)}`} d={arrowPath(c.x, c.y, dx, dy)} />;
        })}
        {STAR_INDEXES.map((index) => {
          const c = centreOf(RING[index]!);
          return <polygon key={`star-${index}`} className="ludo-star" points={starPoints(c.x, c.y, 0.38, 0.17)} />;
        })}
        <Decor kinds={themeOf(theme).decor} />
        {COLORS.filter((color) => active.includes(color)).map((color) => {
          const bar = NAME_BARS[color];
          const mine = turnColor === color;
          return (
            <g key={`bar-${color}`} className={`ludo-bar ludo-bar--${lower(color)}${mine ? ' is-turn' : ''}`} data-seat={lower(color)} {...(mine ? { 'data-active': 'true' } : {})}>
              <rect className="ludo-bar-body" x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={bar.height / 2} />
              <text className="ludo-bar-name" x={bar.x + bar.width / 2} y={bar.y + bar.height / 2} textAnchor="middle" dominantBaseline="central" fontSize="0.52">{clip(names[active.indexOf(color)] ?? '')}</text>
            </g>
          );
        })}
      </g>
    </>
  );
});

export interface Board2DProps {
  view: LudoMatchView;
  /** Every pawn where the game says it is, with whether the viewer may press it or points at its button. */
  placed: readonly PlacedPawn[];
  /** Poses of the pins that are hopping right now; the others rest on their squares. */
  poses?: ReadonlyMap<string, Pose> | null;
  onChoose?: (pawn: number) => void;
}

// A flat board drawn in 15 by 15 units, edge to edge. Every shape is a plain attribute, so no inline style is needed.
export function Board2D({ view, placed, poses = null, onChoose }: Board2DProps) {
  const turnColor = view.turn.phase === 'ENDED' || view.turn.seat === null ? null : view.seats[view.turn.seat]?.color ?? null;
  const moving = (item: { seat: number; pawn: number }): boolean => poses?.has(pawnKey(item.seat, item.pawn)) ?? false;
  const ordered = [...placed].sort((a, b) => Number(moving(a)) - Number(moving(b)));
  return (
    <svg className="ludo-board-svg" viewBox={VIEWBOX} role="img" aria-label="Ludo board" preserveAspectRatio="xMidYMid meet">
      <BoardFixed used={view.seats.map((seat) => seat.color).join(',')} labels={view.seats.map((seat) => seat.label).join('\u0000')} turnColor={turnColor} theme={view.theme} />
      {ordered.map((item) => {
        const pose = poses?.get(pawnKey(item.seat, item.pawn));
        return (
          <Pin
            key={pawnKey(item.seat, item.pawn)} seat={item.seat} pawn={item.pawn} color={item.color}
            x={pose?.x ?? item.cx} y={pose?.y ?? item.cy} scale={item.scale} lift={pose?.lift ?? 0} squash={pose?.squash ?? 1}
            movable={item.movable} highlighted={item.highlighted} {...(onChoose ? { onChoose } : {})}
          />
        );
      })}
    </svg>
  );
}

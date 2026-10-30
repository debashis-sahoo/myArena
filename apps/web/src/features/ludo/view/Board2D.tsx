import {
  LANES, RING, START_INDEX, STAR_INDEXES, cellOf, type Color, type LudoMatchView,
} from '@myarena/ludo';
import { pawnNumber } from '../a11y/describe';

const QUADRANTS: Record<Color, { x: number; y: number }> = {
  RED: { x: 0, y: 0 }, GREEN: { x: 9, y: 0 }, YELLOW: { x: 9, y: 9 }, BLUE: { x: 0, y: 9 },
};
const TRIANGLES: Record<Color, string> = {
  RED: '6,6 7.5,7.5 6,9', GREEN: '6,6 9,6 7.5,7.5', YELLOW: '9,6 9,9 7.5,7.5', BLUE: '6,9 9,9 7.5,7.5',
};
const MARKS: Record<Color, string> = {
  RED: 'M0 -0.13 A0.13 0.13 0 1 1 0 0.13 A0.13 0.13 0 1 1 0 -0.13 Z',
  GREEN: 'M0 -0.16 L0.15 0.12 L-0.15 0.12 Z',
  YELLOW: 'M-0.12 -0.12 L0.12 -0.12 L0.12 0.12 L-0.12 0.12 Z',
  BLUE: 'M0 -0.17 L0.15 0 L0 0.17 L-0.15 0 Z',
};
const SPREAD: Record<number, { scale: number; offsets: [number, number][] }> = {
  1: { scale: 1, offsets: [[0, 0]] },
  2: { scale: 0.62, offsets: [[-0.25, 0], [0.25, 0]] },
  3: { scale: 0.55, offsets: [[-0.28, -0.2], [0.28, -0.2], [0, 0.28]] },
  4: { scale: 0.5, offsets: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] },
};
const lower = (color: Color) => color.toLowerCase();

interface PlacedPawn { seat: number; pawn: number; color: Color; cx: number; cy: number; scale: number; movable: boolean; }

function placePawns(view: LudoMatchView, movable: ReadonlySet<number>): PlacedPawn[] {
  const groups = new Map<string, { seat: number; pawn: number; color: Color; col: number; row: number }[]>();
  for (const seat of view.seats) {
    seat.pawns.forEach((step, pawn) => {
      const cell = cellOf(seat.color, pawn, step);
      const key = `${cell.col},${cell.row}`;
      const list = groups.get(key) ?? [];
      list.push({ seat: seat.index, pawn, color: seat.color, col: cell.col, row: cell.row });
      groups.set(key, list);
    });
  }
  const placed: PlacedPawn[] = [];
  for (const list of groups.values()) {
    const layout = SPREAD[Math.min(list.length, 4)]!;
    list.forEach((item, index) => {
      const [dx, dy] = layout.offsets[index % layout.offsets.length]!;
      placed.push({
        seat: item.seat, pawn: item.pawn, color: item.color, cx: item.col + 0.5 + dx, cy: item.row + 0.5 + dy,
        scale: layout.scale, movable: item.seat === view.you && movable.has(item.pawn),
      });
    });
  }
  return placed;
}

export interface Board2DProps {
  view: LudoMatchView;
  /** Pawns the viewer may press right now (empty while the die rolls or when it is not their turn). */
  movable: readonly number[];
  onChoose?: (pawn: number) => void;
}

// A flat board drawn in 15 by 15 units. Every shape is a plain attribute, so no inline style is needed.
export function Board2D({ view, movable, onChoose }: Board2DProps) {
  const active = view.seats.map((seat) => seat.color);
  const placed = placePawns(view, new Set(movable));
  return (
    <svg className="ludo-board-svg" viewBox="0 0 15 15" role="img" aria-label="Ludo board, flat view" preserveAspectRatio="xMidYMid meet">
      <rect className="ludo-board-bg" x="0" y="0" width="15" height="15" rx="0.4" />
      {(Object.keys(QUADRANTS) as Color[]).map((color) => (
        <rect key={color} className={`ludo-base ludo-base--${lower(color)}${active.includes(color) ? '' : ' ludo-base--unused'}`} x={QUADRANTS[color].x} y={QUADRANTS[color].y} width="6" height="6" />
      ))}
      {RING.map((cell, index) => {
        const owner = (Object.keys(START_INDEX) as Color[]).find((color) => START_INDEX[color] === index);
        return <rect key={`ring-${index}`} className={`ludo-cell${owner ? ` ludo-cell--start ludo-cell--${lower(owner)}` : ''}`} x={cell.col} y={cell.row} width="1" height="1" />;
      })}
      {(Object.keys(LANES) as Color[]).flatMap((color) => LANES[color].map((cell, index) => (
        <rect key={`lane-${color}-${index}`} className={`ludo-cell ludo-cell--lane ludo-cell--${lower(color)}`} x={cell.col} y={cell.row} width="1" height="1" />
      )))}
      {(Object.keys(TRIANGLES) as Color[]).map((color) => (
        <polygon key={`home-${color}`} className={`ludo-home ludo-cell--${lower(color)}`} points={TRIANGLES[color]} />
      ))}
      {STAR_INDEXES.map((index) => (
        <text key={`star-${index}`} className="ludo-mark" x={RING[index]!.col + 0.5} y={RING[index]!.row + 0.5} textAnchor="middle" dominantBaseline="central" fontSize="0.8" aria-hidden="true">★</text>
      ))}
      {(Object.keys(START_INDEX) as Color[]).map((color) => (
        <text key={`start-${color}`} className="ludo-mark" x={RING[START_INDEX[color]]!.col + 0.5} y={RING[START_INDEX[color]]!.row + 0.5} textAnchor="middle" dominantBaseline="central" fontSize="0.7" aria-hidden="true">⌂</text>
      ))}
      {placed.map((item) => (
        <g key={`pawn-${item.seat}-${item.pawn}`} transform={`translate(${item.cx} ${item.cy}) scale(${item.scale})`}>
          {item.movable ? (
            <>
              <circle className="ludo-hit" r="1.1" onClick={() => onChoose?.(item.pawn)} />
              <circle className="ludo-glow" r="0.46" aria-hidden="true" />
            </>
          ) : null}
          <circle className={`ludo-pawn ludo-pawn--${lower(item.color)}`} r="0.34" aria-hidden="true" pointerEvents="none" />
          <path className="ludo-pawn-mark" d={MARKS[item.color]} transform="translate(0 -0.1)" aria-hidden="true" pointerEvents="none" />
          <text className="ludo-pawn-number" x="0" y="0.2" textAnchor="middle" dominantBaseline="central" fontSize="0.24" aria-hidden="true" pointerEvents="none">{pawnNumber(item.pawn)}</text>
        </g>
      ))}
    </svg>
  );
}

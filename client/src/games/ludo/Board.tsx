import type { CSSProperties, ReactElement, ReactNode } from 'react';
import {
  BASE_RECT,
  BASE_SPOTS,
  COLOR_ORDER,
  HOME_RECT,
  LANES,
  RING,
  SAFE_RING,
  START_INDEX,
  type Cell,
  type LudoColor,
} from '@myarena/shared';

export const cellKey = (cell: Cell): string => `${cell[0]},${cell[1]}`;

export interface CornerLabel {
  text: string;
  host: boolean;
}

interface Props {
  /** Board edge in CSS pixels; sets `--cell = side / 15`. */
  side: number;
  /** Route squares glowing ahead of a moving pawn. */
  route: ReadonlySet<string>;
  /** The square just landed on. */
  landing: string | null;
  /** Corner label per colour; null dims an unused corner. */
  corners: Record<LudoColor, CornerLabel | null>;
  /** The pawn overlay layer. */
  children?: ReactNode;
}

const STAR_INDEXES = SAFE_RING.filter((i) => !Object.values(START_INDEX).includes(i));
const startColorAt = new Map<number, LudoColor>(COLOR_ORDER.map((c) => [START_INDEX[c], c]));

function angleBetween(a: Cell, b: Cell): number {
  return (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
}

function Arrow({ deg }: { deg: number }): ReactElement {
  return (
    <svg className="sq-arrow" viewBox="0 0 20 20" aria-hidden="true" style={{ transform: `rotate(${deg}deg)` }}>
      <path d="M3 5 L17 10 L3 15 L7 10 Z" />
    </svg>
  );
}

function Star(): ReactElement {
  return (
    <svg className="sq-star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

function pos(row: number, col: number): CSSProperties {
  return { gridRow: row + 1, gridColumn: col + 1 };
}

/** The 15 x 15 cross-shaped board, drawn from the shared geometry so it can never disagree with the server's rules. */
export function Board({ side, route, landing, corners, children }: Props): ReactElement {
  return (
    <div className="ludo-board" style={{ width: side, height: side, ['--cell' as string]: `${side / 15}px` }}>
      {COLOR_ORDER.map((color) => {
        const r = BASE_RECT[color];
        const label = corners[color];
        const top = r.row === 0;
        return (
          <div
            key={color}
            className={`base ${color} ${label ? 'lit' : 'dim'}`}
            style={{ gridArea: `${r.row + 1} / ${r.col + 1} / span ${r.size} / span ${r.size}` }}
          >
            <span className={`corner-label ${top ? 'top' : 'bottom'}`}>
              {label ? (
                <>
                  {label.text}
                  {label.host && <em> (Host)</em>}
                </>
              ) : (
                <span className="sr-only">Empty corner</span>
              )}
            </span>
            <div className="base-inner" />
            {BASE_SPOTS[color].map(([x, y], i) => (
              <i
                key={i}
                className="base-spot"
                style={{ left: `${((x - r.col) / r.size) * 100}%`, top: `${((y - r.row) / r.size) * 100}%` }}
              />
            ))}
          </div>
        );
      })}

      {RING.map((cell, i) => {
        const startColor = startColorAt.get(i);
        const next = RING[(i + 1) % RING.length] as Cell;
        const key = cellKey(cell);
        const classes = ['sq', 'ring'];
        if (startColor) classes.push('start', startColor);
        if (route.has(key)) classes.push('route');
        if (landing === key) classes.push('landed');
        return (
          <div key={i} className={classes.join(' ')} style={pos(cell[0], cell[1])}>
            {startColor && <Arrow deg={angleBetween(cell, next)} />}
            {STAR_INDEXES.includes(i) && <Star />}
          </div>
        );
      })}

      {COLOR_ORDER.map((color) =>
        LANES[color].map((cell, i) => {
          const next = (LANES[color][i + 1] ?? [7, 7]) as Cell;
          const key = cellKey(cell);
          const classes = ['sq', 'lane', color];
          if (route.has(key)) classes.push('route');
          if (landing === key) classes.push('landed');
          return (
            <div key={`${color}-${i}`} className={classes.join(' ')} style={pos(cell[0], cell[1])}>
              {i === 2 && <Arrow deg={angleBetween(cell, next)} />}
            </div>
          );
        }),
      )}

      <div
        className={`home-center ${route.has('7,7') ? 'route' : ''} ${landing === '7,7' ? 'landed' : ''}`}
        style={{ gridArea: `${HOME_RECT.row + 1} / ${HOME_RECT.col + 1} / span ${HOME_RECT.size} / span ${HOME_RECT.size}` }}
      >
        <svg viewBox="0 0 3 3" aria-hidden="true" preserveAspectRatio="none">
          <polygon className="tri yellow" points="0,0 1.5,1.5 0,3" />
          <polygon className="tri green" points="0,0 3,0 1.5,1.5" />
          <polygon className="tri blue" points="3,0 3,3 1.5,1.5" />
          <polygon className="tri red" points="0,3 1.5,1.5 3,3" />
        </svg>
        <span className="home-text">HOME</span>
      </div>
      {children}
    </div>
  );
}

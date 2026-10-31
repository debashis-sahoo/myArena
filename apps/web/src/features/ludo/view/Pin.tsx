import type { Color } from '@myarena/ludo';

// One small white mark on each colour's sphere, so colour is never the only cue.
const MARKS: Record<Color, string> = {
  RED: 'M0 -0.1 A0.1 0.1 0 1 1 0 0.1 A0.1 0.1 0 1 1 0 -0.1 Z',
  GREEN: 'M0 -0.12 L0.11 0.09 L-0.11 0.09 Z',
  YELLOW: 'M-0.085 -0.085 L0.085 -0.085 L0.085 0.085 L-0.085 0.085 Z',
  BLUE: 'M0 -0.13 L0.11 0 L0 0.13 L-0.11 0 Z',
};

export interface PinProps {
  seat: number;
  pawn: number;
  color: Color;
  /** Centre of the square the pin stands on, in grid units. */
  x: number;
  y: number;
  /** Size relative to a lone pawn (smaller when pawns share a square). */
  scale: number;
  /** Height above the square while hopping, in grid units. */
  lift?: number;
  /** 1 is natural; below 1 is the small squash on landing. */
  squash?: number;
  movable: boolean;
  highlighted: boolean;
  onChoose?: (pawn: number) => void;
}

/** A map-marker pawn: a silver teardrop with a coloured glass sphere in its round top, on a ring in the player's colour. It never shows a number. */
export function Pin({ seat, pawn, color, x, y, scale, lift = 0, squash = 1, movable, highlighted, onChoose }: PinProps) {
  const raised = lift + (highlighted ? 0.12 : 0);
  const size = scale * 1.25;
  const sx = size * (1 + (1 - squash) * 0.6);
  const sy = size * squash;
  return (
    <g className={`ludo-pin ludo-pin--${color.toLowerCase()}${movable ? ' is-movable' : ''}${highlighted ? ' is-highlighted' : ''}`} data-pawn={`${seat}:${pawn}`} aria-hidden="true">
      <g transform={`translate(${x} ${y}) scale(${size})`} pointerEvents="none">
        <ellipse className="ludo-pin-shadow" cx="0" cy="0.36" rx={0.34 - Math.min(lift, 0.5) * 0.2} ry="0.14" />
      </g>
      <g transform={`translate(${x} ${y - raised}) scale(${sx} ${sy})`} pointerEvents="none">
        {movable || highlighted ? <circle className="ludo-glow" r="0.5" cy="0.15" /> : null}
        <ellipse className="ludo-pin-ring" cx="0" cy="0.3" rx="0.4" ry="0.2" />
        <path className="ludo-pin-body" d="M0 0.4 C-0.06 0.22 -0.34 0.1 -0.34 -0.2 A0.34 0.34 0 1 1 0.34 -0.2 C0.34 0.1 0.06 0.22 0 0.4 Z" />
        <circle className="ludo-pin-head" cx="0" cy="-0.2" r="0.2" />
        <circle className="ludo-pin-gloss" cx="0" cy="-0.2" r="0.2" />
        <path className="ludo-pin-mark" d={MARKS[color]} transform="translate(0 -0.2)" />
      </g>
      {movable ? <circle className="ludo-hit" cx={x} cy={y} r="1.5" onClick={() => onChoose?.(pawn)} /> : null}
    </g>
  );
}

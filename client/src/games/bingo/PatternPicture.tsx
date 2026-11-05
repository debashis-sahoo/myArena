import type { ReactElement } from 'react';
import { BINGO_FREE_INDEX, type BingoPatternDef } from '@myarena/shared';

const CELL = 10;
const GAP = 2;
const SIDE = 5 * CELL + 4 * GAP;

const WIDTH_PX = { sm: 52, md: 60 } as const;

export interface PatternPictureProps {
  pattern: BingoPatternDef;
  size: 'sm' | 'md';
  /** Show the "any line" or "any corner" note under the picture when the pattern has one (default true). */
  caption?: boolean;
}

/** Mini 5 by 5 grid of a pattern: highlighted cells gold, the centre (FREE) cell marked. --bz-pic-size overrides the width. */
export function PatternPicture({ pattern, size, caption = true }: PatternPictureProps): ReactElement {
  const lit = new Set(pattern.illustration);
  const cells: ReactElement[] = [];

  for (let i = 0; i < 25; i += 1) {
    const x = (i % 5) * (CELL + GAP);
    const y = Math.floor(i / 5) * (CELL + GAP);
    const on = lit.has(i);
    cells.push(
      <rect
        key={i}
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        rx={2}
        fill={on ? 'var(--bz-gold, #f5c04a)' : 'var(--bz-empty, #0a1238)'}
        stroke={on ? '#fff0b0' : 'rgba(160, 180, 255, 0.3)'}
        strokeWidth={on ? 0.8 : 0.6}
      />,
    );
    if (i === BINGO_FREE_INDEX) {
      cells.push(
        <circle
          key="free"
          cx={x + CELL / 2}
          cy={y + CELL / 2}
          r={2.2}
          fill={on ? '#2a1a00' : 'none'}
          stroke={on ? 'none' : 'var(--bz-gold, #f5c04a)'}
          strokeWidth={1}
        />,
      );
    }
  }

  return (
    <span className="bz-pic">
      <svg
        viewBox={`0 0 ${SIDE} ${SIDE}`}
        role="img"
        aria-label={`${pattern.name}: ${pattern.description}`}
        focusable="false"
        style={{ width: `var(--bz-pic-size, ${WIDTH_PX[size]}px)` }}
      >
        {cells}
      </svg>
      {caption && pattern.caption && (
        <span className="bz-pic-cap" aria-hidden="true">
          {pattern.caption}
        </span>
      )}
    </span>
  );
}

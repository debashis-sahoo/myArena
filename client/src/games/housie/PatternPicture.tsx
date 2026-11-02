import type { ReactElement } from 'react';
import { ILLUSTRATION_SLOTS } from '@myarena/shared';
import type { PatternDef } from '@myarena/shared';

const COLS = 9;
const ROWS = 3;
const CELL_W = 20;
const CELL_H = 24;
const GAP = 3;
const VIEW_W = COLS * CELL_W + (COLS - 1) * GAP;
const VIEW_H = ROWS * CELL_H + (ROWS - 1) * GAP;

const WIDTH_PX = { sm: 96, lg: 288 } as const;

export function PatternPicture({ pattern, size }: { pattern: PatternDef; size: 'sm' | 'lg' }): ReactElement {
  const highlighted = new Set<string>();
  for (const [r, position] of pattern.illustration) {
    const col = ILLUSTRATION_SLOTS[r]?.[position - 1];
    if (col !== undefined) highlighted.add(`${r}:${col}`);
  }

  const slotCols = ILLUSTRATION_SLOTS.map((cols) => new Set(cols));
  const cells: ReactElement[] = [];

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const x = c * (CELL_W + GAP);
      const y = r * (CELL_H + GAP);
      const isSlot = slotCols[r]?.has(c) ?? false;
      const isHit = highlighted.has(`${r}:${c}`);
      const fill = isHit ? 'var(--hz-gold, #f2b73a)' : isSlot ? 'var(--hz-paper, #f7ecd0)' : 'var(--hz-empty, #16204f)';

      cells.push(
        <g key={`${r}-${c}`}>
          <rect
            x={x}
            y={y}
            width={CELL_W}
            height={CELL_H}
            rx={2}
            fill={fill}
            stroke={isHit ? '#fff1b8' : 'none'}
            strokeWidth={isHit ? 1 : 0}
          />
          {isHit && (
            <path
              d={`M${x + 5} ${y + 6} L${x + CELL_W - 5} ${y + CELL_H - 6} M${x + CELL_W - 5} ${y + 6} L${x + 5} ${y + CELL_H - 6}`}
              stroke="var(--hz-ink-red, #d6283e)"
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={`${pattern.name}: ${pattern.description}`}
      style={{ width: WIDTH_PX[size], height: 'auto', display: 'block', maxWidth: '100%' }}
    >
      {cells}
    </svg>
  );
}

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useRegionSize } from './useFit';
import './MasterBoard.css';

const COLS = 10;
const ROWS = 9;
const GAP = 3;
const NUMBERS = Array.from({ length: 90 }, (_, i) => i + 1);

export function MasterBoard({ called, current }: { called: number[]; current: number | null }) {
  const { ref, width, height } = useRegionSize<HTMLDivElement>();
  const lit = useMemo(() => new Set(called), [called]);

  const cell = Math.max(0, Math.floor(Math.min((width - GAP * (COLS - 1)) / COLS, (height - GAP * (ROWS - 1)) / ROWS)));
  const style = {
    '--cell': `${cell}px`,
    '--gap': `${GAP}px`,
  } as CSSProperties;

  return (
    <div ref={ref} className="hz-board-wrap">
      {cell > 0 && (
        <div className="hz-board" style={style} role="group" aria-label="Called numbers">
          {NUMBERS.map((n) => {
            const cls = n === current ? 'hz-board-cell current' : lit.has(n) ? 'hz-board-cell called' : 'hz-board-cell';
            return (
              <span key={n} className={cls} aria-label={lit.has(n) ? `${n} called` : `${n}`}>
                {n}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

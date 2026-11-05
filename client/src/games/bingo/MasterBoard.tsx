import { useMemo, type CSSProperties, type ReactElement } from 'react';
import { BINGO_LETTERS } from '@myarena/shared';
import { useRegionSize } from './useFit';

const PER_LETTER = 15;
const GAP = 2;
const MIN_ROW = 18; // a row shorter than this turns the board
const MIN_ROTATED_CELL = 14; // narrowest cell that still holds a two-digit number at 11 px
const MAX_FONT = 28;

export interface MasterBoardProps {
  called: number[];
  current: number | null;
}

/** All 75 numbers as five B-I-N-G-O columns of 15 (rotated to five rows of 15 when the rows would get too short). */
export function MasterBoard({ called, current }: MasterBoardProps): ReactElement {
  const { ref, width, height } = useRegionSize<HTMLDivElement>();
  const lit = useMemo(() => new Set(called), [called]);

  const rowH = (height - PER_LETTER * GAP) / (PER_LETTER + 1);
  const rotatedW = (width - PER_LETTER * GAP) / (PER_LETTER + 1);
  const rotated = width > 0 && rowH < MIN_ROW && rotatedW >= MIN_ROTATED_CELL;

  const cols = rotated ? PER_LETTER + 1 : 5;
  const rows = rotated ? 5 : PER_LETTER + 1;
  const cellW = (width - (cols - 1) * GAP) / cols;
  const cellH = (height - (rows - 1) * GAP) / rows;
  const font = Math.max(11, Math.min(MAX_FONT, Math.floor(Math.min(cellH * 0.7, cellW / 1.2))));

  const style = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    gridAutoFlow: rotated ? 'row' : 'column',
    '--bz-mb-font': `${font}px`,
  } as CSSProperties;

  return (
    <div ref={ref} className="bz-mb">
      {width > 0 && height > 0 && (
        <div className={`bz-mb-board${rotated ? ' is-rotated' : ''}`} style={style} role="group" aria-label="Called numbers">
          {BINGO_LETTERS.flatMap((letter, col) => [
            <span key={letter} className={`bz-mb-head bz-l-${letter}`} aria-hidden="true">
              {letter}
            </span>,
            ...Array.from({ length: PER_LETTER }, (_, i) => {
              const n = col * PER_LETTER + i + 1;
              const isCurrent = n === current;
              const isCalled = lit.has(n);
              return (
                <span
                  key={n}
                  className={`bz-mb-cell bz-l-${letter}${isCurrent ? ' is-current' : isCalled ? ' is-called' : ''}`}
                  aria-label={`${letter} ${n}${isCurrent ? ' current ball' : isCalled ? ' called' : ''}`}
                >
                  {n}
                </span>
              );
            }),
          ])}
        </div>
      )}
    </div>
  );
}

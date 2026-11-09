import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { cellAt, cellBit, type Ticket as TicketData } from '@myarena/shared';
import { useReducedMotion } from '../../state/viewport';
import { stampCross } from './anim/stamp';
import './Ticket.css';

export interface TicketProps {
  ticket: TicketData;
  /** 27-bit mask, bit row*9+col. */
  marks: number;
  ink: 'red' | 'blue';
  /** Drops the side label tab and trims borders and gaps so cells stay at least 29px on very narrow screens. */
  compact?: boolean;
  /** Cell width in px. */
  cell: number;
  /** Cell height in px. */
  rowH: number;
  /** Number size in px. */
  fontPx: number;
  label: string;
  selected?: boolean;
  /** Absent = read only. */
  onToggle?: (row: number, col: number) => void;
}

const FADE_MS = 80;

interface CellProps {
  row: number;
  col: number;
  value: number;
  marked: boolean;
  reduced: boolean;
  readOnly: boolean;
  tabbable: boolean;
  setRef: (el: HTMLButtonElement | null) => void;
  onToggle: (row: number, col: number) => void;
  onFocus: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

function Cell(p: CellProps): ReactElement {
  const [leaving, setLeaving] = useState(false);
  const prev = useRef(p.marked);
  const svg = useRef<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    if (p.marked && !prev.current) {
      setLeaving(false);
      stampCross(svg.current, p.reduced);
    }
    prev.current = p.marked;
  }, [p.marked, p.reduced]);

  const wasMarked = useRef(p.marked);
  useEffect(() => {
    if (wasMarked.current && !p.marked && !p.reduced) {
      setLeaving(true);
      const t = window.setTimeout(() => setLeaving(false), FADE_MS);
      wasMarked.current = p.marked;
      return () => window.clearTimeout(t);
    }
    wasMarked.current = p.marked;
    return undefined;
  }, [p.marked, p.reduced]);

  const showCross = p.marked || leaving;
  const r = p.row + 1;
  const c = p.col + 1;

  return (
    <button
      ref={p.setRef}
      type="button"
      className={`hz-tk-cell${p.marked ? ' is-marked' : ''}${p.readOnly ? ' is-readonly' : ''}`}
      data-col={p.col}
      aria-pressed={p.marked}
      aria-label={`Row ${r}, column ${c}, number ${p.value}${p.marked ? ', crossed' : ''}`}
      tabIndex={p.tabbable ? 0 : -1}
      aria-disabled={p.readOnly || undefined}
      onClick={() => p.onToggle(p.row, p.col)}
      onFocus={p.onFocus}
      onKeyDown={p.onKeyDown}
    >
      <span className="hz-tk-num">{p.value}</span>
      {showCross && (
        <svg
          ref={svg}
          className={`hz-tk-cross${p.marked ? '' : ' is-leaving'}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M5 5 L19 19" pathLength={1} />
          <path d="M19 5 L5 19" pathLength={1} />
        </svg>
      )}
    </button>
  );
}

export function Ticket(props: TicketProps): ReactElement {
  const { ticket, marks, ink, cell, rowH, fontPx, label, selected, onToggle, compact } = props;
  const reduced = useReducedMotion();
  const refs = useRef(new Map<number, HTMLButtonElement>());

  const firstNumber = (): number => {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) if (cellAt(ticket, r, c) !== 0) return cellBit(r, c);
    return 0;
  };
  const [active, setActive] = useState<number>(firstNumber);
  const activeBit = cellAt(ticket, Math.floor(active / 9), active % 9) !== 0 ? active : firstNumber();

  const focusCell = (r: number, c: number): void => {
    const bit = cellBit(r, c);
    setActive(bit);
    refs.current.get(bit)?.focus();
  };

  const move = (r: number, c: number, dr: number, dc: number): void => {
    if (dc !== 0) {
      for (let x = c + dc; x >= 0 && x < 9; x += dc) {
        if (cellAt(ticket, r, x) !== 0) return focusCell(r, x);
      }
      return;
    }
    for (let y = r + dr; y >= 0 && y < 3; y += dr) {
      let best = -1;
      for (let x = 0; x < 9; x++) {
        if (cellAt(ticket, y, x) === 0) continue;
        if (best < 0 || Math.abs(x - c) < Math.abs(best - c)) best = x;
      }
      if (best >= 0) return focusCell(y, best);
    }
  };

  const onKeyDown = (r: number, c: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const d: Record<string, [number, number]> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const delta = d[e.key];
    if (!delta) return;
    e.preventDefault();
    move(r, c, delta[0], delta[1]);
  };

  const style = {
    '--tk-cell-w': `${cell}px`,
    '--tk-cell-h': `${rowH}px`,
    '--tk-font': `${fontPx}px`,
    '--tk-ink': ink === 'red' ? 'var(--hz-ink-red)' : 'var(--hz-ink-blue)',
  } as CSSProperties;

  return (
    <div className={`hz-tk${selected ? ' is-selected' : ''}${compact ? ' compact' : ''}`} style={style} role="group" aria-label={label}>
      <div className="hz-tk-ribbon" aria-hidden="true">
        <span>Housie</span>
        <span>{label}</span>
      </div>
      <div className="hz-tk-grid">
        {ticket.map((row, r) =>
          row.map((value, c) => {
            const key = `${r}-${c}`;
            if (value === 0) return <div key={key} className="hz-tk-empty" aria-hidden="true" />;
            const bit = cellBit(r, c);
            return (
              <Cell
                key={key}
                row={r}
                col={c}
                value={value}
                marked={((marks >>> bit) & 1) === 1}
                reduced={reduced}
                readOnly={!onToggle}
                tabbable={bit === activeBit}
                setRef={(el) => {
                  if (el) refs.current.set(bit, el);
                  else refs.current.delete(bit);
                }}
                onToggle={(rr, cc) => onToggle?.(rr, cc)}
                onFocus={() => setActive(bit)}
                onKeyDown={onKeyDown(r, c)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

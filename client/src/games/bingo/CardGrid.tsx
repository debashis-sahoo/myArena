import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { BINGO_FREE_INDEX, BINGO_LETTERS, type BingoCard } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import { stampDauber } from './anim/stamp';

export interface CardGridProps {
  card: BingoCard;
  /** 25-bit daub mask, bit row*5+col. */
  daubs: number;
  /** Cell width and height in px; the header row uses the same height. */
  cellW: number;
  cellH: number;
  /** Accessible name of the card, e.g. "Card 2 of 3". */
  label: string;
  /** Shows the pulsing "Tap to claim your FREE space!" callout. */
  freeHint?: boolean;
  selected?: boolean;
  /** Short text for the side tab (several cards shown at once); omit for a single card or tabs mode. */
  tabLabel?: string;
  /** Absent = read only. */
  onToggle?: (cell: number) => void;
}

const FADE_MS = 80;

interface CellProps {
  index: number;
  value: number;
  daubed: boolean;
  reduced: boolean;
  readOnly: boolean;
  tabbable: boolean;
  hint: boolean;
  setRef: (el: HTMLButtonElement | null) => void;
  onToggle: (index: number) => void;
  onFocus: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

function Cell(p: CellProps): ReactElement {
  const free = p.index === BINGO_FREE_INDEX;
  const letter = BINGO_LETTERS[p.index % 5] ?? 'B';
  const hintId = useId();
  const dauber = useRef<HTMLSpanElement | null>(null);
  const ring = useRef<HTMLSpanElement | null>(null);

  // Keep the dauber mounted for 80 ms after it is lifted so it can fade out.
  const [seen, setSeen] = useState(p.daubed);
  const [leaving, setLeaving] = useState(false);
  if (seen !== p.daubed) {
    setSeen(p.daubed);
    setLeaving(!p.daubed && !p.reduced);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setLeaving(false), FADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  const prev = useRef(p.daubed);
  useLayoutEffect(() => {
    if (p.daubed && !prev.current) stampDauber(dauber.current, ring.current, p.reduced);
    prev.current = p.daubed;
  }, [p.daubed, p.reduced]);

  const showDauber = p.daubed || leaving;

  return (
    <button
      ref={p.setRef}
      type="button"
      className={`bz-cell bz-l-${letter}${free ? ' is-free' : ''}${p.daubed ? ' is-daubed' : ''}${p.readOnly ? ' is-readonly' : ''}${p.hint ? ' has-hint' : ''}`}
      aria-pressed={p.daubed}
      aria-label={free ? 'FREE' : `${letter} ${p.value}`}
      aria-describedby={p.hint ? hintId : undefined}
      aria-disabled={p.readOnly || undefined}
      tabIndex={p.tabbable ? 0 : -1}
      onClick={() => p.onToggle(p.index)}
      onFocus={p.onFocus}
      onKeyDown={p.onKeyDown}
    >
      {showDauber && (
        <>
          <span ref={dauber} className={`bz-dauber${p.daubed ? '' : ' is-leaving'}`} aria-hidden="true" />
          <span ref={ring} className="bz-ring" aria-hidden="true" />
        </>
      )}
      <span className="bz-num">{free ? 'FREE' : p.value}</span>
      {p.hint && (
        <span id={hintId} className="bz-free-hint">
          Tap to claim your FREE space!
        </span>
      )}
    </button>
  );
}

const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };

/** One bingo card: B-I-N-G-O header and a 5 by 5 grid of buttons. Cells (FREE included) are only ever daubed by the player. */
export function CardGrid({ card, daubs, cellW, cellH, label, freeHint = false, selected = false, tabLabel, onToggle }: CardGridProps): ReactElement {
  const reduced = useReducedMotion();
  const refs = useRef(new Map<number, HTMLButtonElement>());
  const [active, setActive] = useState(0);

  const focusCell = (i: number): void => {
    setActive(i);
    refs.current.get(i)?.focus();
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = ARROWS[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const col = i % 5;
    if ((step === -1 && col === 0) || (step === 1 && col === 4)) return;
    const next = i + step;
    if (next >= 0 && next < 25) focusCell(next);
  };

  const toggle = (i: number): void => {
    if (!onToggle) return;
    if (((daubs >>> i) & 1) === 0) sfx.stamp();
    onToggle(i);
  };

  return (
    <div
      className={`bz-card${selected ? ' is-selected' : ''}`}
      style={{ '--bz-cw': `${cellW}px`, '--bz-ch': `${cellH}px`, '--bz-cell': `${Math.min(cellW, cellH)}px` } as CSSProperties}
      role="group"
      aria-label={label}
    >
      {tabLabel && (
        <div className="bz-card-tab" aria-hidden="true">
          <span>{tabLabel}</span>
        </div>
      )}
      <div className="bz-grid">
        {BINGO_LETTERS.map((letter) => (
          <div key={letter} className={`bz-hcell bz-l-${letter}`} aria-hidden="true">
            {letter}
          </div>
        ))}
        {card.map((value, i) => (
          <Cell
            key={i}
            index={i}
            value={value}
            daubed={((daubs >>> i) & 1) === 1}
            reduced={reduced}
            readOnly={!onToggle}
            tabbable={i === active}
            hint={freeHint && i === BINGO_FREE_INDEX}
            setRef={(el) => {
              if (el) refs.current.set(i, el);
              else refs.current.delete(i);
            }}
            onToggle={toggle}
            onFocus={() => setActive(i)}
            onKeyDown={onKeyDown(i)}
          />
        ))}
      </div>
    </div>
  );
}

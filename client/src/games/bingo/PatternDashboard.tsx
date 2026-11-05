import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX, getBingoPattern } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import { PatternPicture } from './PatternPicture';
import { celebrate as playCelebration } from './anim/celebrate';
import { claimBingo, useBingo } from './bingoStore';
import { TILE_GAP, TILE_TEXT_MIN, planPatterns, useRegionSize, type BingoLayout } from './useFit';

const NOTE_MS = 2000;
const CAPTION_MIN_H = 66;
const ROOMY_MIN_H = 70; // tall enough for a two-line name
const ROOMY_TEXT_MIN = 80; // roomy tiles can wrap the name, so the text column may be narrower
const TILE_PAD_X = 20; // tile padding and border plus the gap to the picture
const SCROLLBAR = 16; // room kept for a scrollbar when the tile grid scrolls

/** True for `ms` after `at` (epoch ms), re-rendering once when it ends; mounting after the window has passed shows nothing. */
function useActiveFor(at: number, ms: number): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at <= 0) return;
    setNow(Date.now());
    const left = at + ms - Date.now();
    if (left <= 0) return;
    const t = window.setTimeout(() => setNow(Date.now()), left + 20);
    return () => window.clearTimeout(t);
  }, [at, ms]);
  return at > 0 && now < at + ms;
}

/** Remaining milliseconds until `until` (epoch ms), ticking while it is in the future. */
function useRemaining(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [until]);
  return Math.max(0, until - now);
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export interface PatternDashboardProps {
  /** wide: BINGO! at the end of the header; narrow and short: a full-width bar under the tiles. */
  layout: BingoLayout;
}

/** Tiles for the host-chosen patterns (Available or Claimed by whom) and the BINGO! button for the selected card. */
export function PatternDashboard({ layout }: PatternDashboardProps): ReactElement | null {
  const wide = layout === 'wide';
  const { view, selected, bogusAt, tooLateAt, lockedUntil, celebrate } = useBingo();
  const reduced = useReducedMotion();
  const { ref, width, height } = useRegionSize<HTMLDivElement>();
  const tileEls = useRef(new Map<string, HTMLElement>());
  const bingoRef = useRef<HTMLDivElement>(null);
  const lastCelebrate = useRef(celebrate?.key);
  const lastBogus = useRef(bogusAt);

  const bogus = useActiveFor(bogusAt, NOTE_MS);
  const tooLate = useActiveFor(tooLateAt, NOTE_MS);
  const lockedMs = useRemaining(lockedUntil);

  useEffect(() => {
    if (!celebrate || celebrate.key === lastCelebrate.current) return;
    lastCelebrate.current = celebrate.key;
    for (const id of celebrate.patterns) playCelebration(tileEls.current.get(id) ?? null, reduced);
    playCelebration(bingoRef.current, reduced);
    sfx.winChime();
  }, [celebrate, reduced]);

  useEffect(() => {
    if (bogusAt === lastBogus.current) return;
    lastBogus.current = bogusAt;
    if (bogusAt > 0) sfx.error();
  }, [bogusAt]);

  const setTileEl = useCallback((id: string, el: HTMLElement | null) => {
    if (el) tileEls.current.set(id, el);
    else tileEls.current.delete(id);
  }, []);

  if (!view) return null;

  const tiles = view.settings.patterns.flatMap((id) => {
    const def = getBingoPattern(id);
    return def ? [{ def, state: view.patterns.find((p) => p.id === id) }] : [];
  });
  const plan = planPatterns(width, height, tiles.length, layout);
  const tileW = plan.cols > 0 ? (width - (plan.scroll ? SCROLLBAR : 0) - TILE_GAP * (plan.cols - 1)) / plan.cols : 0;
  const showCaption = plan.tileHeight >= CAPTION_MIN_H;
  const roomy = plan.tileHeight >= ROOMY_MIN_H;
  // The picture yields to the text column so the name and badge are never clipped.
  const pic = Math.max(
    26,
    Math.min(60, plan.tileHeight - 6 - (showCaption ? 12 : 0), Math.floor(tileW) - TILE_PAD_X - (roomy ? ROOMY_TEXT_MIN : TILE_TEXT_MIN)),
  );

  const finished = view.phase === 'finished';
  const cards = view.you.cards.length;
  const paused = lockedMs > 0;
  const label = paused ? `Claims paused ${formatCountdown(lockedMs)}` : cards > 1 ? `BINGO! - Card ${selected + 1}` : 'BINGO!';

  const claim = view.you.playing ? (
    <div ref={bingoRef} className={`bz-bingo-wrap${wide ? '' : ' is-bar'}`}>
      <button type="button" className="bz-bingo" disabled={paused || finished} onClick={claimBingo}>
        {label}
      </button>
      {bogus && (
        <span className="bz-bingo-note bogus" role="alert">
          Bogus Bingo
        </span>
      )}
      {!bogus && tooLate && (
        <span className="bz-bingo-note late" role="status">
          Too late - already claimed
        </span>
      )}
    </div>
  ) : null;

  return (
    <section className={`bz-pd${wide ? ' is-wide' : ''}`} aria-label="Winning patterns">
      {wide ? (
        <header className="bz-pd-head">
          <h2 className="bz-title">Patterns</h2>
          <span className="bz-spacer" />
          {claim}
        </header>
      ) : (
        <h2 className="bz-sr-only">Patterns</h2>
      )}

      <div ref={ref} className="bz-pd-region">
        <ul
          className={`bz-pd-grid${roomy ? ' is-roomy' : ''}`}
          style={{
            gap: TILE_GAP,
            gridTemplateColumns: `repeat(${plan.cols}, minmax(0, 1fr))`,
            gridAutoRows: `${plan.tileHeight}px`,
            overflowY: plan.scroll ? 'auto' : 'hidden',
          }}
        >
          {tiles.map(({ def, state }) => {
            const claimed = state?.status === 'claimed';
            const by = state?.claimedBy;
            const color = (by && COLOR_HEX[by.color]) || 'var(--bz-gold-hi)';
            return (
              <li
                key={def.id}
                ref={(el) => setTileEl(def.id, el)}
                className={`bz-pd-tile${claimed ? ' is-claimed' : ''}`}
                style={{ '--bz-pic-size': `${pic}px` } as CSSProperties}
                title={claimed ? `${def.name}: claimed${by ? ` by ${by.name}` : ''}` : `${def.name}: ${def.description}`}
              >
                <PatternPicture pattern={def} size="md" caption={showCaption} />
                <span className="bz-pd-text">
                  <span className="bz-pd-name">{def.name}</span>
                  <span className="bz-pd-status">
                    <span className={`bz-pd-badge ${claimed ? 'claimed' : 'open'}`}>{claimed ? 'Claimed' : 'Available'}</span>
                    {claimed && by && (
                      <span className="bz-pd-by" style={{ color }}>
                        {by.name}
                      </span>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {!wide && claim}
    </section>
  );
}

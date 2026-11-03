import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { COLOR_HEX, getPattern } from '@myarena/shared';
import type { ComboState } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import { celebrate as playCelebration } from './anim/celebrate';
import { PatternPopover } from './PatternPopover';
import { shortNameOf } from './shortNames';
import { fitTitle, planTiles, useRegionSize } from './useFit';
import type { TileTier, TitleFit } from './useFit';
import './CombinationTiles.css';

const BOGUS_MS = 2000;

/** Title base font per density tier, px (1.05rem, 0.88rem, 0.72rem at a 16 px root). */
const BASE_FONT_PX: Record<TileTier, number> = { large: 16.8, medium: 14.08, compact: 11.52 };
type Layout = 'stack' | 'row' | 'tight';

/** Tile geometry per layout (mirrors CombinationTiles.css): padding x/y per side, CLAIM height, CLAIM font and x padding, gap. */
interface Geo {
  padX: number;
  padY: number;
  btnH: number;
  btnFont: number;
  btnPadX: number;
  gap: number;
}

const GEO_FULL: Record<TileTier, Geo> = {
  large: { padX: 10, padY: 8, btnH: 34, btnFont: 15.2, btnPadX: 8, gap: 2 },
  medium: { padX: 7, padY: 5, btnH: 30, btnFont: 13.6, btnPadX: 8, gap: 2 },
  compact: { padX: 5, padY: 3, btnH: 22, btnFont: 11.2, btnPadX: 4, gap: 2 },
};
const GEO_SNUG: Record<TileTier, Geo> = {
  large: { padX: 6, padY: 4, btnH: 28, btnFont: 15.2, btnPadX: 8, gap: 2 },
  medium: { padX: 5, padY: 3, btnH: 26, btnFont: 13.6, btnPadX: 8, gap: 2 },
  compact: { padX: 3, padY: 2, btnH: 22, btnFont: 11.2, btnPadX: 4, gap: 2 },
};
const GEO_ROW: Record<TileTier, Geo> = {
  large: { ...GEO_SNUG.large, btnH: 28, btnPadX: 7, gap: 6 },
  medium: { ...GEO_SNUG.medium, btnH: 28, btnPadX: 7, gap: 6 },
  compact: { ...GEO_SNUG.compact, gap: 6 },
};
const GEO_TIGHT: Geo = { padX: 4, padY: 2, btnH: 22, btnFont: 11.2, btnPadX: 4, gap: 1 };

const BY_LINE_FALLBACK: Record<TileTier, number> = { large: 17, medium: 17, compact: 14 };
const SNUG_BELOW_H = 78;
const TILE_GAP = 6;

function geoOf(layout: Layout, snug: boolean, tier: TileTier): Geo {
  if (!snug) return GEO_FULL[tier];
  if (layout === 'row') return GEO_ROW[tier];
  return layout === 'tight' ? GEO_TIGHT : GEO_SNUG[tier];
}

/** Real measurements that the title box depends on; read from the DOM after render. */
interface FitEnv {
  family: string;
  weight: string;
  /** Widest CLAIM label width per px of font size (letter-spacing included). */
  claimPerPx: number;
  /** Width and height of the Open chip, 0 when none is rendered. */
  chipW: number;
  chipH: number;
  /** Height of the "Claimed by" line, 0 when no tile is claimed. */
  byH: number;
  gridW: number;
}

const sameEnv = (a: FitEnv, b: FitEnv): boolean =>
  a.family === b.family &&
  a.weight === b.weight &&
  a.claimPerPx === b.claimPerPx &&
  a.chipW === b.chipW &&
  a.chipH === b.chipH &&
  a.byH === b.byH &&
  a.gridW === b.gridW;

function readEnv(grid: HTMLElement): FitEnv | null {
  const name = grid.querySelector<HTMLElement>('.hz-combo-name');
  if (!name) return null;
  const ns = getComputedStyle(name);
  const range = document.createRange();
  let claimPerPx = 0;
  for (const el of grid.querySelectorAll<HTMLElement>('.hz-combo-claim')) {
    range.selectNodeContents(el);
    const font = parseFloat(getComputedStyle(el).fontSize) || 1;
    claimPerPx = Math.max(claimPerPx, range.getBoundingClientRect().width / font);
  }
  const chip = grid.querySelector<HTMLElement>('.hz-combo-open');
  const by = grid.querySelector<HTMLElement>('.hz-combo-by');
  return {
    family: ns.fontFamily,
    weight: ns.fontWeight,
    claimPerPx: Math.ceil(claimPerPx * 1000) / 1000,
    chipW: chip ? Math.ceil(chip.offsetWidth) : 0,
    chipH: chip ? Math.ceil(chip.offsetHeight) : 0,
    byH: by ? Math.ceil(by.offsetHeight) : 0,
    gridW: grid.clientWidth,
  };
}

/** Lets "Top+Mid" wrap after the plus without changing the text content. */
function withBreaks(text: string): ReactNode {
  const parts = text.split('+');
  if (parts.length === 1) return text;
  return parts.flatMap((p, i) => (i < parts.length - 1 ? [p, '+', <wbr key={i} />] : [p]));
}

export interface CombinationTilesProps {
  combos: ComboState[];
  /** 0-based index of the ticket claims are made with. */
  selectedTicket: number;
  /** False for a non-playing host. */
  canClaim: boolean;
  /** Remaining claim lock in ms, 0 when none. */
  lockedMs: number;
  /** comboId -> timestamp when a local Bogus Claim notice started. */
  bogus: Record<string, number>;
  celebrate: { combo: string; key: number } | null;
  onClaim: (comboId: string) => void;
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function CombinationTiles({
  combos,
  selectedTicket,
  canClaim,
  lockedMs,
  bogus,
  celebrate,
  onClaim,
}: CombinationTilesProps): ReactElement {
  const { ref, width, height } = useRegionSize<HTMLDivElement>();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [env, setEnv] = useState<FitEnv | null>(null);
  const plan = planTiles(width, height, combos.length);
  const gridW = env && env.gridW > 0 ? Math.min(width, env.gridW) : width;
  const tileW = plan.cols > 0 ? (gridW - TILE_GAP * (plan.cols - 1)) / plan.cols : 0;
  const { tier, tileHeight } = plan;
  const snug = tileHeight < SNUG_BELOW_H;
  const reduced = useReducedMotion();

  // Titles wrap to two lines and shrink to 10 px; the short name is used only when the full name cannot fit.
  const { fits, layout } = useMemo(() => {
    const family = env?.family ?? 'sans-serif';
    const weight = env?.weight ?? '800';
    const byH = env && env.byH > 0 ? env.byH : BY_LINE_FALLBACK[tier];
    const claimPerPx = env && env.claimPerPx > 0 ? env.claimPerPx : 4;
    const chipW = env && env.chipW > 0 ? env.chipW : 44;
    const chipH = env && env.chipH > 0 ? env.chipH : 18;

    const run = (layout: Layout): { list: TitleFit[]; unfit: number; short: number } => {
      const g = geoOf(layout, snug, tier);
      const sideW = canClaim ? Math.ceil(claimPerPx * g.btnFont) + 2 * g.btnPadX + 3 : chipW;
      const sideH = canClaim ? g.btnH : chipH;
      const list = combos.map((c): TitleFit => {
        const full = getPattern(c.id)?.name ?? c.id;
        let w = tileW - 2 * g.padX;
        let h = tileHeight - 2 * g.padY;
        if (c.status === 'claimed') h -= byH + Math.min(g.gap, 2);
        else if (layout === 'row') w -= sideW + g.gap;
        else h -= sideH + g.gap;
        if (tileW > 0) {
          w = Math.max(1, w);
          h = Math.max(1, h);
        }
        return fitTitle({
          full,
          short: shortNameOf(c.id, full),
          width: w,
          height: h,
          baseFontPx: BASE_FONT_PX[tier],
          fontFamily: family,
          fontWeight: weight,
        });
      });
      return { list, unfit: list.filter((t) => !t.fits).length, short: list.filter((t) => t.form === 'short').length };
    };

    // Preference order; a later layout wins only by showing fewer cut or short titles.
    const order: Layout[] = snug ? ['stack', 'row', 'tight'] : ['stack'];
    let best = run('stack');
    let bestLayout: Layout = 'stack';
    for (const l of order.slice(1)) {
      const r = run(l);
      if (r.unfit < best.unfit || (r.unfit === best.unfit && r.short < best.short)) {
        best = r;
        bestLayout = l;
      }
    }
    return { fits: best.list, layout: bestLayout };
  }, [combos, tier, tileHeight, tileW, snug, canClaim, env]);
  const flat = layout === 'row';
  const tight = layout === 'tight';

  // Re-read the font, label widths and line heights after every render; state changes only when a value changes.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const next = grid ? readEnv(grid) : null;
    if (next) setEnv((prev) => (prev && sameEnv(prev, next) ? prev : next));
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const tileEls = useRef(new Map<string, HTMLElement>());
  const lastCelebrateKey = useRef<number | undefined>(celebrate?.key);
  const claimedSeen = useRef(new Set(combos.filter((c) => c.status === 'claimed').map((c) => c.id)));

  // Re-render when each local bogus notice expires.
  useEffect(() => {
    const now = Date.now();
    const timers: number[] = [];
    for (const ts of Object.values(bogus)) {
      const remaining = ts + BOGUS_MS - now;
      if (remaining > 0) timers.push(window.setTimeout(() => setTick((t) => t + 1), remaining + 20));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [bogus]);

  useEffect(() => {
    if (!celebrate || celebrate.key === lastCelebrateKey.current) return;
    lastCelebrateKey.current = celebrate.key;
    playCelebration(tileEls.current.get(celebrate.combo) ?? null, reduced);
    sfx.winChime();
  }, [celebrate, reduced]);

  useEffect(() => {
    const fresh: string[] = [];
    for (const c of combos) {
      if (c.status !== 'claimed' || claimedSeen.current.has(c.id)) continue;
      claimedSeen.current.add(c.id);
      const name = getPattern(c.id)?.name ?? c.id;
      fresh.push(`${c.claimedBy?.name ?? 'Someone'} won ${name}`);
    }
    if (fresh.length > 0) setAnnouncement(fresh.join('. '));
  }, [combos]);

  const setTileEl = useCallback((id: string, el: HTMLElement | null) => {
    if (el) tileEls.current.set(id, el);
    else tileEls.current.delete(id);
  }, []);

  const toggle = (id: string): void => setOpenId((cur) => (cur === id ? null : id));
  const closePopover = useCallback(() => setOpenId(null), []);

  const onTileKey = (e: KeyboardEvent<HTMLDivElement>, id: string): void => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  };

  const now = Date.now();
  const openPattern = openId ? getPattern(openId) : undefined;
  const openAnchor = openId ? (tileEls.current.get(openId) ?? null) : null;

  return (
    <section className="hz-combos" aria-label="Winning combinations">
      <header className="hz-combos-head">
        <h2 className="hz-combos-title">Winning combinations</h2>
        {canClaim && <span className="hz-combos-chip">Claims use: Ticket #{selectedTicket + 1}</span>}
      </header>

      <div ref={ref} className="hz-combos-region">
        <div
          ref={gridRef}
          className={`hz-combos-grid tier-${plan.tier}${snug ? ' snug' : ''}${flat ? ' flat' : ''}${tight ? ' tight' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${plan.cols}, minmax(0, 1fr))`,
            gridAutoRows: `${plan.tileHeight}px`,
            overflowY: plan.scroll ? 'auto' : 'hidden',
          }}
        >
          {combos.map((combo, i) => {
            const pattern = getPattern(combo.id);
            const name = pattern?.name ?? combo.id;
            const fit = fits[i];
            const claimed = combo.status === 'claimed';
            const showBogus = now - (bogus[combo.id] ?? -Infinity) < BOGUS_MS;
            const winnerColor = COLOR_HEX[combo.claimedBy?.color ?? ''] ?? 'var(--hz-gold-hi)';
            const counting = lockedMs > 0;

            return (
              <div
                key={combo.id}
                ref={(el) => setTileEl(combo.id, el)}
                className={`hz-combo${claimed ? ' claimed' : ''}${showBogus ? ' bogus' : ''}`}
                role="button"
                tabIndex={0}
                title={name}
                aria-haspopup="dialog"
                aria-expanded={openId === combo.id}
                onClick={() => toggle(combo.id)}
                onKeyDown={(e) => onTileKey(e, combo.id)}
              >
                <span
                  className="hz-combo-name"
                  data-form={fit?.form ?? 'full'}
                  style={fit ? { fontSize: `${fit.fontPx}px` } : undefined}
                >
                  {fit ? withBreaks(fit.text) : name}
                </span>
                {showBogus && <span className="hz-combo-bogus">Bogus Claim</span>}
                {claimed ? (
                  <span className="hz-combo-by" style={{ color: winnerColor }}>
                    Claimed by {combo.claimedBy?.name ?? 'someone'}
                  </span>
                ) : canClaim ? (
                  <button
                    type="button"
                    className="hz-btn gold hz-combo-claim"
                    disabled={combo.locked === true || counting}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClaim(combo.id);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={
                      combo.locked
                        ? `Claim ${name}, available after the first Full House`
                        : counting
                          ? `Claim ${name}, claims paused ${formatCountdown(lockedMs)}`
                          : `Claim ${name}`
                    }
                  >
                    {combo.locked ? 'after 1st' : counting ? formatCountdown(lockedMs) : 'CLAIM'}
                  </button>
                ) : (
                  <span className="hz-combo-open">Open</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hz-sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {openPattern && <PatternPopover pattern={openPattern} anchor={openAnchor} onClose={closePopover} />}
    </section>
  );
}

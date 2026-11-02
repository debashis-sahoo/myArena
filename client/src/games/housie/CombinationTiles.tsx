import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { COLOR_HEX, getPattern } from '@myarena/shared';
import type { ComboState } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import { celebrate as playCelebration } from './anim/celebrate';
import { PatternPopover } from './PatternPopover';
import { planTiles, useRegionSize } from './useFit';
import './CombinationTiles.css';

const BOGUS_MS = 2000;

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
  const plan = planTiles(width, height, combos.length);
  // Short but wide tiles put name and button side by side; narrow tiles keep them stacked.
  const tileW = plan.cols > 0 ? (width - 6 * (plan.cols - 1)) / plan.cols : 0;
  const flat = plan.tileHeight < 78 && tileW >= 110;
  const reduced = useReducedMotion();

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
          className={`hz-combos-grid tier-${plan.tier}${flat ? ' flat' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${plan.cols}, minmax(0, 1fr))`,
            gridAutoRows: `${plan.tileHeight}px`,
            overflowY: plan.scroll ? 'auto' : 'hidden',
          }}
        >
          {combos.map((combo) => {
            const pattern = getPattern(combo.id);
            const name = pattern?.name ?? combo.id;
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
                <span className="hz-combo-name">{name}</span>
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

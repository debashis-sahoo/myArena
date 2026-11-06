import './UnoControls.css';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { UNO_COLOR_LABEL, UNO_TURN_TIMER_MS, unoCardLabel, unoCardOf, type UnoTable, type UnoYou } from '@myarena/shared';
import { REJECTION_MS, callUno, keepCard, type UnoBanner, type UnoRejection } from './unoStore';
import { END_BUTTONS_W, UNO_ROW_H } from './useFit';

/*
 * The viewer's controls: UNO!, Keep, the "Your turn" cue with its countdown, the refusal line and a hidden live region.
 * Mount it inside a positioned box that covers the hand band (landscape) or the UNO row plus the hand band (portrait); it fills that
 * box and only its buttons take pointer events, so the hand underneath stays tappable.
 *   table, you   the shown view (null `you` renders only the live region)
 *   layout       fit.hand.buttons: 'row' puts Keep | cue | UNO! in the 44 px row above the hand, 'ends' puts Keep (with the cue) and UNO! at the two ends of the band
 *   banners      useUno().banners, spoken in the live region
 *   rejection    useUno().rejection, shown under the hand until the store clears it (2.5 s) and spoken
 * The Draw Pile action lives on the pile in TableCenter, not here.
 */
export interface UnoControlsProps {
  table: UnoTable;
  you: UnoYou | null;
  layout: 'row' | 'ends';
  banners: readonly UnoBanner[];
  rejection: UnoRejection | null;
}

type UnoButtonState = 'idle' | 'ready' | 'urgent' | 'called';

function unoButtonState(table: UnoTable, you: UnoYou): UnoButtonState {
  if (you.unoCalled) return 'called';
  if (table.catchWindow?.victim === you.playerId) return 'urgent';
  return you.canCallUno ? 'ready' : 'idle';
}

const BUTTON_CLASS: Record<UnoButtonState, string> = {
  idle: 'is-idle',
  ready: 'is-ready un-pulse',
  urgent: 'is-urgent un-pulse-fast',
  called: 'is-called pressed',
};

// ---------- countdown ----------

/** Ticks the server's remaining time down locally; restarts whenever a newer table brings a new figure. */
function useCountdown(remainingMs: number | null, table: UnoTable): number | null {
  const [left, setLeft] = useState<number | null>(remainingMs);
  useEffect(() => {
    if (remainingMs === null) {
      setLeft(null);
      return;
    }
    const end = performance.now() + remainingMs;
    const tick = (): void => setLeft(Math.max(0, end - performance.now()));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [remainingMs, table]);
  return left;
}

function TurnCue({ table, you }: { table: UnoTable; you: UnoYou }): ReactElement | null {
  const mine = table.turn === you.playerId && (table.phase === 'turn' || table.phase === 'drawn');
  const left = useCountdown(mine ? table.remainingMs : null, table);
  if (!mine) return null;
  const secs = left === null ? null : Math.ceil(left / 1000);
  const share = left === null ? 100 : Math.min(100, (left / UNO_TURN_TIMER_MS) * 100);
  return (
    <div className={`un-cue${secs !== null && secs <= 5 ? ' is-low' : ''}`} style={{ '--p': `${share.toFixed(1)}%` } as CSSProperties} aria-hidden="true">
      <span>Your turn</span>
      {secs !== null && <b>{secs}</b>}
    </div>
  );
}

// ---------- live region ----------

interface Line {
  id: number;
  text: string;
}

const LINE_MS = 6000;
const MAX_LINES = 4;
/** "You draw 4" and "Blaze draws 2" repeat what the hand-count change already says. */
const DRAW_BANNER = /\sdraws? \d+$/;

const nameOf = (table: UnoTable, id: string): string => table.players.find((p) => p.playerId === id)?.name ?? 'A player';
const cardsText = (n: number): string => `${n} card${n === 1 ? '' : 's'}`;

/** Banner texts, refusals, and the plays and draws seen as the shown table changes. */
function useAnnouncements(table: UnoTable, you: UnoYou | null, banners: readonly UnoBanner[], rejection: UnoRejection | null): Line[] {
  const me = you?.playerId ?? null;
  const [lines, setLines] = useState<Line[]>([]);
  const nextId = useRef(0);
  const say = useCallback((text: string, ms: number = LINE_MS): void => {
    nextId.current += 1;
    const id = nextId.current;
    setLines((cur) => [...cur, { id, text }].slice(-MAX_LINES));
    window.setTimeout(() => setLines((cur) => cur.filter((l) => l.id !== id)), ms);
  }, []);

  const seenBanner = useRef(0);
  useEffect(() => {
    for (const b of banners) {
      if (b.id <= seenBanner.current) continue;
      seenBanner.current = b.id;
      if (DRAW_BANNER.test(b.text)) continue;
      if (!b.playerId || b.kind === 'turn') say(b.text);
      else say(`${b.playerId === me ? 'You' : nameOf(table, b.playerId)}: ${b.text}`);
    }
  }, [banners, me, table, say]);

  const prev = useRef<{ table: UnoTable; hand: readonly number[] } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = { table, hand: you?.hand ?? [] };
    if (!before || before.table.matchNo !== table.matchNo || table.phase === 'finished') return;
    const old = before.table;
    if (table.turn && table.turn !== old.turn && table.turn !== me) say(`${nameOf(table, table.turn)}'s turn`);
    const was = new Map(old.players.map((p) => [p.playerId, p.handCount]));
    for (const p of table.players) {
      const count = was.get(p.playerId);
      if (count === undefined || count === p.handCount) continue;
      const who = p.playerId === me ? 'You' : p.name;
      if (p.handCount < count) {
        if (table.top === old.top) continue;
        const wild = unoCardOf(table.top).color === null ? `, colour ${UNO_COLOR_LABEL[table.activeColor]}` : '';
        say(`${who} played ${unoCardLabel(table.top)}${wild}`);
      } else {
        const got = p.playerId === me ? (you?.hand ?? []).filter((id) => !before.hand.includes(id)) : [];
        say(got.length > 0 && got.length <= 2 ? `You drew ${got.map(unoCardLabel).join(' and ')}` : `${who} drew ${cardsText(p.handCount - count)}`);
      }
    }
  }, [table, you, me, say]);

  // The spoken copy of a refusal goes when the visible line does, so the reason never outlives it in the page text.
  useEffect(() => {
    if (rejection) say(rejection.message, REJECTION_MS);
  }, [rejection, say]);

  return lines;
}

// ---------- component ----------

export function UnoControls({ table, you, layout, banners, rejection }: UnoControlsProps): ReactElement {
  const lines = useAnnouncements(table, you, banners, rejection);
  const live = (
    <div className="un-sr-only" role="status" aria-live="polite" aria-relevant="additions text">
      {lines.map((l) => (
        <p key={l.id}>{l.text}</p>
      ))}
    </div>
  );
  if (!you) return live;

  const state = unoButtonState(table, you);
  const called = state === 'called';
  const cue = <TurnCue table={table} you={you} />;
  const style = { '--un-row-h': `${UNO_ROW_H}px`, '--un-end-w': `${END_BUTTONS_W}px` } as CSSProperties;

  return (
    <div className={`un-controls ${layout}${rejection ? ' has-reject' : ''}`} style={style}>
      <div className="un-ctl-left">
        {layout === 'ends' && cue}
        {you.canKeep && (
          <button type="button" className="un-btn un-keep" aria-label={you.drawn !== null ? `Keep ${unoCardLabel(you.drawn)}` : 'Keep the drawn card'} onClick={() => void keepCard()}>
            Keep
          </button>
        )}
      </div>
      <div className="un-ctl-mid">{layout === 'row' && cue}</div>
      <div className="un-ctl-right">
        <button
          type="button"
          className={`un-btn gold un-uno ${BUTTON_CLASS[state]}`}
          aria-label="Call UNO"
          aria-pressed={called}
          onClick={() => {
            if (!called) void callUno();
          }}
        >
          UNO!
          {called && <span aria-hidden="true"> ✓</span>}
        </button>
      </div>
      {rejection && (
        <p key={rejection.key} className="un-reject" aria-hidden="true">
          {rejection.message}
        </p>
      )}
      {live}
    </div>
  );
}

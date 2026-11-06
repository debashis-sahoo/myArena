/*
 * The UNO animator: plays queued server events one at a time (motion first, then the event's table and hand are committed as
 * the shown state), pushes the banners, and plays the shake and bounce for a refused move.
 *
 * DOM convention shared with the UNO components. The animator finds rects with document.querySelector and, when an element is
 * missing, skips that flight and still commits:
 *   [data-uno-table]                  the table root (shaken on a refusal)
 *   [data-uno-pile="draw"|"discard"]  the card-sized box of each pile (the discard box is the top-card slot, not the aura)
 *   [data-uno-hand]                   the hand container; it also carries data-uno-seat="<own playerId>"
 *   [data-uno-card="<id>"]            each hand card, inside the hand container
 *   [data-uno-seat="<playerId>"]      each opponent seat root
 *   [data-uno-track], [data-uno-aura] optional, positioned: the arrow track (Reverse flare) and the aura wrapper (Wild pulse)
 */
import { useEffect, useRef, useState } from 'react';
import type { UnoEvent } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { flareTrack, pulseAura } from './anim/flare';
import { REDUCED_FADE_MS, boxOf, flyCards, flyStagger, type Box, type FlyItem } from './anim/fly';
import { bounceCard, shakeTable } from './anim/shake';
import { throwCard } from './anim/throw';
import { commitUno, getUno, pushBanner, skipUnoToLatest, unoViewOf, useUno } from './unoStore';

/** A backlog longer than this jumps to the newest state instead of replaying. */
const MAX_QUEUE = 6;
/** No single event may hold the screen longer than this, whatever its animation does. */
const EVENT_TIMEOUT_MS = 2500;
const MAX_GHOSTS = 12;
const DEAL_HAND_STAGGER_MS = 100;
const DEAL_SEAT_BACKS = 3;
const DEAL_FIRST_CARD_DELAY_MS = 900;

type EventOf<T extends UnoEvent['type']> = Extract<UnoEvent, { type: T }>;

interface Run {
  running: boolean;
  /** Bumped to abandon the loop in flight (hidden tab, unmount). */
  epoch: number;
  undo: Set<() => void>;
}

interface Session {
  committed: boolean;
  reduced: boolean;
  /** Restores hidden elements and removes ghosts once the event is on screen. */
  undo: Array<() => void>;
}

const find = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);
const quote = (v: string | number): string => String(v).replace(/["\\]/g, '\\$&');
const seatEl = (playerId: string): HTMLElement | null => find(`[data-uno-seat="${quote(playerId)}"]`);
const handCardEl = (id: number): HTMLElement | null => find(`[data-uno-hand] [data-uno-card="${id}"]`);
const pileEl = (kind: 'draw' | 'discard'): HTMLElement | null => find(`[data-uno-pile="${kind}"]`);
const nameOf = (ev: UnoEvent, id: string): string => ev.table.players.find((p) => p.playerId === id)?.name ?? 'A player';
const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

/** The next frame, but never longer than 50 ms (a hidden tab does not run animation frames). */
function frame(): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, 50);
    requestAnimationFrame(() => {
      window.clearTimeout(id);
      resolve();
    });
  });
}

function hide(s: Session, el: HTMLElement | null): void {
  if (!el) return;
  el.style.visibility = 'hidden';
  s.undo.push(() => {
    el.style.visibility = '';
  });
}

const smallCard = (pile: Box): number => Math.max(24, Math.round(pile.height * 0.45));

// ---------- per-event motion ----------

async function animatePlay(ev: EventOf<'play'>, s: Session, commit: () => void): Promise<void> {
  const mine = ev.by === (ev.you?.playerId ?? null);
  const pile = boxOf(pileEl('discard'));
  if (pile) {
    let from: Box | null;
    if (mine) {
      const el = handCardEl(ev.card);
      from = boxOf(el) ?? boxOf(find('[data-uno-hand]'), Math.round(pile.height * 0.8));
      hide(s, el);
    } else {
      from = boxOf(seatEl(ev.by), smallCard(pile));
    }
    if (from) {
      const landed = await throwCard({ from, to: pile, card: ev.card, faceDown: !mine, reduced: s.reduced });
      s.undo.push(landed.remove);
      sfx.stamp();
    }
  }
  commit();

  if (ev.skipped && (ev.effect === 'skip' || ev.effect === 'reverse')) pushBanner('Skipped!', 'skip', ev.skipped);
  const total = ev.table.pending?.total;
  switch (ev.effect) {
    case 'reverse':
      pushBanner('Reverse!', 'info');
      void flareTrack(find('[data-uno-track]'), s.reduced);
      break;
    case 'draw2':
      pushBanner(`Draw ${total ?? 2}`, 'penalty');
      break;
    case 'wild':
      void pulseAura(find('[data-uno-aura]'), ev.color, s.reduced);
      break;
    case 'wild4':
      pushBanner(`Wild Draw ${total ?? 4}`, 'penalty');
      void pulseAura(find('[data-uno-aura]'), ev.color, s.reduced);
      break;
    default:
      break;
  }
}

async function animateDraw(ev: EventOf<'draw'>, s: Session, commit: () => void): Promise<void> {
  const mine = ev.by === (ev.you?.playerId ?? null);
  if (ev.why === 'pending' || ev.why === 'catch') {
    pushBanner(mine ? `You draw ${ev.count}` : `${nameOf(ev, ev.by)} draws ${ev.count}`, 'penalty', ev.by);
  }
  const pile = boxOf(pileEl('draw'));
  if (!pile || ev.count <= 0) {
    commit();
    return;
  }

  if (mine && ev.cards && ev.cards.length > 0) {
    // The new cards must exist in the hand to be flown to; hide them until each one lands.
    commit();
    await frame();
    const flying = ev.cards.slice(0, MAX_GHOSTS);
    const stagger = flyStagger(flying.length);
    const fallback = boxOf(find('[data-uno-hand]'), smallCard(pile));
    const items: FlyItem[] = [];
    flying.forEach((id, i) => {
      const el = handCardEl(id);
      const to = boxOf(el) ?? fallback;
      if (!to) return;
      hide(s, el);
      items.push({
        from: pile,
        to,
        card: id,
        flip: true,
        delayMs: i * stagger,
        onLand: () => {
          if (el) el.style.visibility = '';
        },
      });
    });
    await flyCards(items, s.reduced);
    return;
  }

  const to = boxOf(seatEl(ev.by), smallCard(pile)) ?? (mine ? boxOf(find('[data-uno-hand]'), smallCard(pile)) : null);
  if (to) {
    const n = Math.min(ev.count, MAX_GHOSTS);
    const stagger = flyStagger(n);
    const items: FlyItem[] = Array.from({ length: n }, (_, i) => ({ from: pile, to, card: null, flip: false, delayMs: i * stagger, absorb: true }));
    await flyCards(items, s.reduced);
  }
  commit();
}

async function animateDeal(ev: EventOf<'deal'>, s: Session, commit: () => void): Promise<void> {
  commit();
  pushBanner(`Match ${ev.table.matchNo}`, 'info');
  await frame();
  if (s.reduced) {
    find('[data-uno-hand]')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE_MS, easing: 'ease-out' });
    return;
  }
  const draw = boxOf(pileEl('draw'));
  if (!draw) return;
  const me = ev.you?.playerId ?? null;
  const items: FlyItem[] = [];

  // Hand cards fan in from the Draw Pile, face revealed on landing.
  document.querySelectorAll<HTMLElement>('[data-uno-hand] [data-uno-card]').forEach((el, i) => {
    const id = Number(el.dataset.unoCard);
    const to = boxOf(el);
    if (!to || !Number.isInteger(id)) return;
    hide(s, el);
    items.push({
      from: draw,
      to,
      card: id,
      flip: true,
      delayMs: i * DEAL_HAND_STAGGER_MS,
      onLand: () => {
        el.style.visibility = '';
      },
    });
  });

  // Backs fly to every other seat.
  ev.table.players
    .filter((p) => p.playerId !== me && p.status === 'active')
    .forEach((p, j) => {
      const to = boxOf(seatEl(p.playerId), smallCard(draw));
      if (!to) return;
      for (let m = 0; m < DEAL_SEAT_BACKS; m += 1) {
        items.push({ from: draw, to, card: null, flip: false, delayMs: j * 40 + m * 200, absorb: true });
      }
    });

  // Then the first card turns over onto the Discard Pile.
  const discardEl = pileEl('discard');
  const discard = boxOf(discardEl);
  if (discardEl && discard) {
    hide(s, discardEl);
    items.push({
      from: draw,
      to: discard,
      card: ev.table.top,
      flip: true,
      delayMs: DEAL_FIRST_CARD_DELAY_MS,
      onLand: () => {
        discardEl.style.visibility = '';
      },
    });
  }
  await flyCards(items, false);
}

async function animate(ev: UnoEvent, s: Session, commit: () => void): Promise<void> {
  const me = ev.you?.playerId ?? null;
  switch (ev.type) {
    case 'deal':
      return animateDeal(ev, s, commit);
    case 'play':
      return animatePlay(ev, s, commit);
    case 'draw':
      return animateDraw(ev, s, commit);
    case 'turn':
      commit();
      if (ev.player === me) {
        pushBanner('Your turn', 'turn', ev.player);
        sfx.tap();
      }
      return;
    case 'uno':
      commit();
      pushBanner('UNO!', 'uno', ev.by);
      sfx.success();
      return;
    case 'caught':
      commit();
      pushBanner('Caught!', 'caught', ev.victim);
      sfx.error();
      return;
    case 'timeout':
      commit();
      pushBanner("Time's up", 'info', ev.by);
      return;
    case 'warning':
      commit();
      pushBanner(ev.player === me ? 'One more missed turn and you are out' : 'Idle?', 'penalty', ev.player);
      sfx.error();
      return;
    case 'released':
      commit();
      pushBanner(ev.player === me ? 'You left the match' : `${nameOf(ev, ev.player)} left`, 'info');
      return;
    case 'finished':
      commit();
      if (ev.winner === me) sfx.winChime();
      else sfx.success();
      return;
    default:
      commit();
  }
}

/** One event: its motion, then its commit; always ends committed and clean, whatever the animation does. */
async function playEvent(ev: UnoEvent, reduced: boolean, run: Run): Promise<void> {
  const session: Session = { committed: false, reduced, undo: [] };
  const commit = (): void => {
    if (session.committed) return;
    session.committed = true;
    commitUno(unoViewOf(ev), 1);
  };
  const cleanup = (): void => {
    for (const fn of session.undo.splice(0)) {
      try {
        fn();
      } catch {
        /* the element is already gone */
      }
    }
    run.undo.delete(cleanup);
  };
  run.undo.add(cleanup);
  try {
    await Promise.race([animate(ev, session, commit), sleep(EVENT_TIMEOUT_MS)]);
  } catch {
    /* a failed animation never stalls the game */
  }
  commit();
  // Ghosts stay until the committed table has painted underneath them.
  await frame();
  cleanup();
}

export interface UnoAnimator {
  /** True while an event is being animated. */
  busy: boolean;
}

/** Call once from the match screen. */
export function useUnoAnimator(reducedMotion: boolean): UnoAnimator {
  const { queue, shakeKey, rejection } = useUno();
  const [busy, setBusy] = useState(false);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const run = useRef<Run>({ running: false, epoch: 0, undo: new Set() });

  // Event driver: one event at a time, strictly in order.
  useEffect(() => {
    const r = run.current;
    if (r.running || queue.length === 0) return;
    r.running = true;
    setBusy(true);
    const epoch = r.epoch;
    void (async () => {
      await Promise.resolve(); // out of React's commit phase before any flushSync
      try {
        while (epoch === r.epoch) {
          const st = getUno();
          const ev = st.queue[0];
          if (!ev) break;
          if (document.hidden || st.queue.length > MAX_QUEUE) {
            skipUnoToLatest();
            break;
          }
          await playEvent(ev, reducedRef.current, r);
        }
      } finally {
        if (epoch === r.epoch) {
          r.running = false;
          setBusy(false);
        }
      }
    })();
  }, [queue]);

  // Coming back to a hidden tab, a restored page or a returned network: show the newest state at once.
  useEffect(() => {
    const r = run.current;
    const abandon = (): void => {
      r.epoch += 1;
      r.running = false;
      r.undo.forEach((fn) => fn());
      r.undo.clear();
    };
    const showNewest = (): void => {
      if (document.hidden) return;
      abandon();
      setBusy(false);
      skipUnoToLatest();
    };
    document.addEventListener('visibilitychange', showNewest);
    window.addEventListener('pageshow', showNewest);
    window.addEventListener('online', showNewest);
    return () => {
      document.removeEventListener('visibilitychange', showNewest);
      window.removeEventListener('pageshow', showNewest);
      window.removeEventListener('online', showNewest);
      abandon();
    };
  }, []);

  // A refused move: shake the table and bounce the card.
  const seenShake = useRef(shakeKey);
  useEffect(() => {
    if (shakeKey === seenShake.current) return;
    seenShake.current = shakeKey;
    void shakeTable(find('[data-uno-table]'), reducedRef.current);
  }, [shakeKey]);

  const seenRejection = useRef(rejection?.key ?? 0);
  useEffect(() => {
    if (!rejection || rejection.key === seenRejection.current) return;
    seenRejection.current = rejection.key;
    if (rejection.card !== undefined) void bounceCard(handCardEl(rejection.card), reducedRef.current);
  }, [rejection]);

  return { busy };
}

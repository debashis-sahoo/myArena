import { useSyncExternalStore } from 'react';
import { UNO_BANNER_MS, type UnoAction, type UnoColor, type UnoEvent, type UnoView } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { toast } from '../../components/common/Toast';
import { resyncRoom, sendGameAction } from '../../state/roomStore';
import { registerGameFeed } from '../feeds';

export type UnoBannerKind = 'info' | 'uno' | 'caught' | 'skip' | 'turn' | 'penalty';

export interface UnoBanner {
  id: number;
  text: string;
  kind: UnoBannerKind;
  /** Seat the banner belongs to (shown over that seat); absent for a centre banner. */
  playerId?: string;
}

export interface UnoRejection {
  /** The card that was refused (drives its bounce); absent for a refused draw or keep. */
  card?: number;
  message: string;
  /** Changes on every refusal so the same message can replay its effects. */
  key: number;
}

export interface UnoCatch {
  victim: string;
  /** performance.now() when the server window closes, from the newest event's remainingMs. */
  closesAt: number;
}

export interface UnoState {
  /** Latest server view: the newest event or snapshot, whether or not it has been shown yet. */
  view: UnoView | null;
  /** The catch window of the newest view; unlike `shown`, it does not wait for animations. */
  catchOpen: UnoCatch | null;
  /** The view on screen. Events commit here after their animation. */
  shown: UnoView | null;
  /** Events waiting to animate, in order. */
  queue: UnoEvent[];
  /** Highest event seq received (or the snapshot's seq) for the current match. */
  lastSeq: number;
  banners: UnoBanner[];
  rejection: UnoRejection | null;
  /** Increments on every refused play, draw or keep. */
  shakeKey: number;
}

export const REJECTION_MS = 2500;
const MAX_BANNERS = 4;

const EMPTY: UnoState = { view: null, catchOpen: null, shown: null, queue: [], lastSeq: 0, banners: [], rejection: null, shakeKey: 0 };
let state: UnoState = EMPTY;
const listeners = new Set<() => void>();
const timers = new Set<number>();
let bannerSeq = 0;
let rejectionSeq = 0;
let catchTimer: number | null = null;

function set(patch: Partial<UnoState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useUno(): UnoState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function getUno(): UnoState {
  return state;
}

/** Every event already carries the receiver's table and private block, so it is a complete view. */
export function unoViewOf(e: UnoEvent): UnoView {
  return { seq: e.seq, table: e.table, you: e.you };
}

function later(ms: number, fn: () => void): void {
  const id = window.setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

/** Reads the view's catch window against the local clock and arms its expiry; call once per newest view. */
function trackCatch(view: UnoView): UnoCatch | null {
  if (catchTimer !== null) {
    window.clearTimeout(catchTimer);
    timers.delete(catchTimer);
    catchTimer = null;
  }
  const w = view.table.catchWindow;
  if (!w || w.remainingMs <= 0) return null;
  const open: UnoCatch = { victim: w.victim, closesAt: performance.now() + w.remainingMs };
  const id = window.setTimeout(() => {
    timers.delete(id);
    catchTimer = null;
    if (state.catchOpen === open) set({ catchOpen: null });
  }, w.remainingMs);
  timers.add(id);
  catchTimer = id;
  return open;
}

// ---------- animation hand-off ----------

/** The animator reports the view it now shows and how many queued events it consumed. */
export function commitUno(view: UnoView, consumed: number): void {
  const cur = state.shown;
  if (cur) {
    // A newer snapshot or a skip already replaced the screen: a late commit must not roll it back or eat new events.
    const older = view.table.matchNo < cur.table.matchNo;
    const stale = view.table.matchNo === cur.table.matchNo && view.seq <= cur.seq;
    if (older || stale) return;
  }
  set({ shown: view, queue: state.queue.slice(consumed) });
}

/** Drop the backlog and show the newest known view at once (hidden tab, slow device, long queue). */
export function skipUnoToLatest(): void {
  if (!state.view) return;
  if (state.queue.length === 0 && state.shown === state.view) return;
  set({ shown: state.view, queue: [] });
}

// ---------- banners and refusals ----------

export function pushBanner(text: string, kind: UnoBannerKind, playerId?: string): void {
  const id = ++bannerSeq;
  const banner: UnoBanner = playerId === undefined ? { id, text, kind } : { id, text, kind, playerId };
  set({ banners: [...state.banners, banner].slice(-MAX_BANNERS) });
  later(UNO_BANNER_MS, () => {
    if (state.banners.some((b) => b.id === id)) set({ banners: state.banners.filter((b) => b.id !== id) });
  });
}

export function clearRejection(): void {
  if (state.rejection) set({ rejection: null });
}

function refuse(message: string, card?: number): void {
  const key = ++rejectionSeq;
  set({
    rejection: card === undefined ? { message, key } : { card, message, key },
    shakeKey: state.shakeKey + 1,
  });
  sfx.error();
  later(REJECTION_MS, () => {
    if (state.rejection?.key === key) set({ rejection: null });
  });
}

// ---------- intents ----------

const inflight = new Set<string>();

type Ack = { ok: true } | { ok: false; message: string };

/** One request per action at a time: a double tap sends once (null means the repeat was dropped). */
async function send(key: string, action: UnoAction): Promise<Ack | null> {
  if (inflight.has(key)) return null;
  inflight.add(key);
  try {
    return await sendGameAction(action);
  } finally {
    inflight.delete(key);
  }
}

export async function playCard(card: number, color?: UnoColor): Promise<boolean> {
  const res = await send('play', color ? { type: 'playCard', card, color } : { type: 'playCard', card });
  if (!res) return false;
  if (res.ok) return true;
  refuse(res.message, card);
  return false;
}

export async function drawCard(): Promise<boolean> {
  const res = await send('draw', { type: 'drawCard' });
  if (!res) return false;
  if (res.ok) return true;
  refuse(res.message);
  return false;
}

export async function keepCard(): Promise<boolean> {
  const res = await send('keep', { type: 'keepCard' });
  if (!res) return false;
  if (res.ok) return true;
  refuse(res.message);
  return false;
}

export async function callUno(): Promise<boolean> {
  const res = await send('uno', { type: 'callUno' });
  if (!res) return false;
  if (res.ok) return true;
  toast(res.message);
  return false;
}

export async function catchPlayer(player: string): Promise<boolean> {
  const res = await send(`catch:${player}`, { type: 'catchPlayer', player });
  if (!res) return false;
  if (res.ok) return true;
  toast(res.message);
  return false;
}

export async function playAgain(): Promise<boolean> {
  const res = await send('again', { type: 'playAgain' });
  if (!res) return false;
  if (res.ok) return true;
  toast(res.message);
  return false;
}

// ---------- feed ----------

function reset(): void {
  timers.forEach((id) => window.clearTimeout(id));
  timers.clear();
  catchTimer = null;
  inflight.clear();
  if (state !== EMPTY) set({ ...EMPTY });
}

function onSnapshot(raw: unknown): void {
  const view = raw as UnoView;
  set({ view, catchOpen: trackCatch(view), shown: view, queue: [], lastSeq: view.seq, banners: [], rejection: null });
}

/** A gap or an event for a match we never saw: show its state at once and take a fresh view from the server. */
function jumpTo(e: UnoEvent): void {
  const view = unoViewOf(e);
  set({ view, catchOpen: trackCatch(view), shown: view, queue: [], lastSeq: e.seq });
  resyncRoom();
}

function onEvent(raw: unknown): void {
  const e = raw as UnoEvent;
  const prev = state.view;
  if (!prev) {
    // The first deal of an online match arrives before any snapshot exists.
    if (e.type === 'deal') {
      const view = unoViewOf(e);
      set({ view, catchOpen: trackCatch(view), queue: [e], lastSeq: e.seq });
    } else jumpTo(e);
    return;
  }
  if (e.table.matchNo < prev.table.matchNo) return;
  if (e.table.matchNo > prev.table.matchNo) {
    // A rematch deal restarts seq at 1.
    if (e.type === 'deal') {
      const view = unoViewOf(e);
      set({ view, catchOpen: trackCatch(view), queue: [...state.queue, e], lastSeq: e.seq });
    } else jumpTo(e);
    return;
  }
  if (e.seq <= state.lastSeq) return;
  if (e.seq > state.lastSeq + 1) {
    jumpTo(e);
    return;
  }
  const view = unoViewOf(e);
  set({ view, catchOpen: trackCatch(view), queue: [...state.queue, e], lastSeq: e.seq });
}

registerGameFeed('uno', { reset, onSnapshot, onEvent });

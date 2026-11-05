import { useSyncExternalStore } from 'react';
import { BINGO_FREE_INDEX, MARK_BATCH_MAX, MARK_FLUSH_MS, type BingoAction, type BingoEvent, type BingoView } from '@myarena/shared';
import { toast } from '../../components/common/Toast';
import { resyncRoom, sendGameAction } from '../../state/roomStore';
import { registerGameFeed } from '../feeds';

/** Bingo client state: the receiver's view plus local-only things (daubs being batched, card selection, notices). */
export interface BingoState {
  view: BingoView | null;
  /** Optimistic copy of the player's daubs: one 25-bit mask per card (bit row*5+col, FREE = bit 12). */
  daubs: number[];
  /** Optimistic copy of the per-card "FREE space was tapped" flag. */
  freeTapped: boolean[];
  selected: number;
  /** Epoch ms of the latest local "Bogus Bingo" alert (0 = none). */
  bogusAt: number;
  /** Epoch ms of the latest "Too late - already claimed" notice (0 = none). */
  tooLateAt: number;
  /** Epoch ms until which this player's claims are paused (0 = not paused). */
  lockedUntil: number;
  /** Set on every public `claimed` event; key changes each time so a celebration can replay. */
  celebrate: { patterns: string[]; key: number } | null;
  /** Increments on every public `ball` event so the ball console can replay its reveal. */
  ballKey: number;
}

const CARD_KEY = 'myarena.bingo.card';
const RETRY_MS = 1000;
const MAX_RETRIES = 3;

function loadSelected(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(CARD_KEY) ?? '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

const EMPTY: BingoState = {
  view: null,
  daubs: [],
  freeTapped: [],
  selected: 0,
  bogusAt: 0,
  tooLateAt: 0,
  lockedUntil: 0,
  celebrate: null,
  ballKey: 0,
};
let state: BingoState = EMPTY;
const listeners = new Set<() => void>();

function set(patch: Partial<BingoState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useBingo(): BingoState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function getBingo(): BingoState {
  return state;
}

// ---------- daubs (optimistic, batched) ----------

interface DaubChange {
  card: number;
  cell: number;
  on: boolean;
}

const pending = new Map<string, DaubChange>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;

const keyOf = (card: number, cell: number): string => `${card}:${cell}`;
const isOn = (mask: number | undefined, cell: number): boolean => ((mask ?? 0) & (1 << cell)) !== 0;

function arm(delay: number): void {
  if (!flushTimer) flushTimer = setTimeout(flushDaubs, delay);
}

/** Sends queued daub changes to the server in batches of at most MARK_BATCH_MAX. */
export function flushDaubs(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (pending.size === 0) return;
  if (state.view?.phase === 'finished') {
    pending.clear();
    return;
  }
  const changes = [...pending.values()];
  pending.clear();
  for (let i = 0; i < changes.length; i += MARK_BATCH_MAX) {
    const batch = changes.slice(i, i + MARK_BATCH_MAX);
    void sendGameAction({ type: 'daubs', changes: batch } satisfies BingoAction).then((res) => {
      if (res.ok) {
        retries = 0;
        return;
      }
      // Keep the local state and resend on the next flush, unless a newer toggle already replaced the change.
      for (const c of batch) {
        const key = keyOf(c.card, c.cell);
        if (!pending.has(key) && isOn(state.daubs[c.card], c.cell) === c.on) pending.set(key, c);
      }
      if (pending.size > 0 && retries < MAX_RETRIES) {
        retries += 1;
        arm(RETRY_MS);
      }
    });
  }
}

export function toggleDaub(card: number, cell: number): void {
  if (!state.view?.you.playing) return;
  const daubs = [...state.daubs];
  const bit = 1 << cell;
  const mask = daubs[card] ?? 0;
  const on = (mask & bit) === 0;
  daubs[card] = on ? mask | bit : mask & ~bit;
  pending.set(keyOf(card, cell), { card, cell, on });

  const patch: Partial<BingoState> = { daubs };
  if (cell === BINGO_FREE_INDEX && !state.freeTapped[card]) {
    const freeTapped = [...state.freeTapped];
    freeTapped[card] = true;
    patch.freeTapped = freeTapped;
  }
  set(patch);
  retries = 0;
  arm(MARK_FLUSH_MS);
}

export function selectCard(index: number): void {
  try {
    localStorage.setItem(CARD_KEY, String(index));
  } catch {
    /* ignore */
  }
  set({ selected: index });
}

// ---------- intents ----------

/** Fire-and-forget intent; the server decides everything. */
export function act(action: BingoAction): void {
  void sendGameAction(action).then((res) => {
    if (!res.ok) toast(res.message);
  });
}

export function claimBingo(): void {
  flushDaubs(); // the server must hold the latest daubs before it evaluates the claim
  act({ type: 'bingo', card: state.selected });
}

// ---------- feed ----------

function reset(): void {
  pending.clear();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  retries = 0;
  if (state !== EMPTY) set({ ...EMPTY, selected: loadSelected() });
}

function onSnapshot(raw: unknown): void {
  const view = raw as BingoView;
  const count = view.you.cards.length;
  const selected = Math.min(state.view ? state.selected : loadSelected(), Math.max(0, count - 1));
  // Changes still waiting to be sent stay visible on top of the server's copy.
  const daubs = Array.from({ length: count }, (_, i) => view.you.daubs[i] ?? 0);
  pending.forEach((c) => {
    if (c.card >= count) return;
    const mask = daubs[c.card] ?? 0;
    daubs[c.card] = c.on ? mask | (1 << c.cell) : mask & ~(1 << c.cell);
  });
  const freeTapped = Array.from(
    { length: count },
    (_, i) => view.you.freeTapped[i] === true || pending.has(keyOf(i, BINGO_FREE_INDEX)),
  );
  set({
    view,
    daubs,
    freeTapped,
    selected,
    lockedUntil: view.you.claimsLockedMs ? Date.now() + view.you.claimsLockedMs : 0,
  });
}

function onEvent(raw: unknown): void {
  const e = raw as BingoEvent;
  if ('priv' in e && e.priv) {
    switch (e.type) {
      case 'snapshot':
        onSnapshot(e.view);
        return;
      case 'bogus':
        set({ bogusAt: Date.now() });
        return;
      case 'tooLate':
        set({ tooLateAt: Date.now() });
        return;
      case 'claimsPaused':
        set({ lockedUntil: Date.now() + e.untilMs });
        toast('Claims paused for a minute after repeated bogus claims');
        return;
    }
    return;
  }
  const view = state.view;
  if (!view || !('seq' in e) || e.seq <= view.seq) return;
  if (e.seq > view.seq + 1) {
    resyncRoom(); // a gap: take a fresh view from the server
    return;
  }
  switch (e.type) {
    case 'ball': {
      const { nextInMs: _old, ...caller } = view.caller;
      set({
        view: {
          ...view,
          seq: e.seq,
          called: [...view.called, e.n],
          caller: e.nextInMs !== undefined ? { ...caller, nextInMs: e.nextInMs } : caller,
        },
        ballKey: state.ballKey + 1,
      });
      return;
    }
    case 'caller':
      set({
        view: {
          ...view,
          seq: e.seq,
          caller: {
            mode: e.mode,
            intervalMs: e.intervalMs,
            paused: e.paused,
            ...(e.nextInMs !== undefined ? { nextInMs: e.nextInMs } : {}),
          },
        },
      });
      return;
    case 'claimed': {
      const patterns = view.patterns.map((p) =>
        e.patterns.includes(p.id) ? { ...p, status: 'claimed' as const, claimedBy: e.by, claimedAtCall: e.calledCount } : p,
      );
      set({ view: { ...view, seq: e.seq, patterns }, celebrate: { patterns: e.patterns, key: Date.now() } });
      return;
    }
    case 'playerLeft':
      set({ view: { ...view, seq: e.seq, playing: Math.max(0, view.playing - 1) } });
      return;
    case 'finished':
      set({ view: { ...view, seq: e.seq, phase: 'finished', results: e.results } });
      return;
  }
}

registerGameFeed('bingo', { reset, onSnapshot, onEvent });

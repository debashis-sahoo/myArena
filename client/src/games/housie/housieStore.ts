import { useSyncExternalStore } from 'react';
import {
  MARK_BATCH_MAX,
  MARK_FLUSH_MS,
  cellBit,
  getPattern,
  type HousieAction,
  type HousieEvent,
  type HousieView,
} from '@myarena/shared';
import { toast } from '../../components/common/Toast';
import { resyncRoom, sendGameAction } from '../../state/roomStore';
import { registerGameFeed } from '../feeds';

/** Housie client state: the receiver's view plus local-only things (marks being batched, ticket selection, notices). */
export interface HousieState {
  view: HousieView | null;
  /** Optimistic copy of the player's crosses (one 27-bit mask per ticket). */
  marks: number[];
  selected: number;
  /** comboId -> when a local Bogus Claim notice started. */
  bogus: Record<string, number>;
  /** Epoch ms until which this player's claims are paused (0 = not paused). */
  lockedUntil: number;
  celebrate: { combo: string; key: number } | null;
}

const TICKET_KEY = 'myarena.housie.ticket';

function loadSelected(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(TICKET_KEY) ?? '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

const EMPTY: HousieState = { view: null, marks: [], selected: 0, bogus: {}, lockedUntil: 0, celebrate: null };
let state: HousieState = EMPTY;
const listeners = new Set<() => void>();

function set(patch: Partial<HousieState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useHousie(): HousieState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function getHousie(): HousieState {
  return state;
}

// ---------- marks (optimistic, batched) ----------

const pending = new Map<string, { t: number; c: number; on: boolean }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Sends queued cross changes to the server in batches of at most MARK_BATCH_MAX. */
export function flushMarks(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const changes = [...pending.values()];
  pending.clear();
  for (let i = 0; i < changes.length; i += MARK_BATCH_MAX) {
    void sendGameAction({ type: 'marks', changes: changes.slice(i, i + MARK_BATCH_MAX) } satisfies HousieAction);
  }
}

export function toggleMark(ticket: number, row: number, col: number): void {
  const bit = cellBit(row, col);
  const marks = [...state.marks];
  const current = marks[ticket] ?? 0;
  const on = (current & (1 << bit)) === 0;
  marks[ticket] = on ? current | (1 << bit) : current & ~(1 << bit);
  pending.set(`${ticket}:${bit}`, { t: ticket, c: bit, on });
  set({ marks });
  if (!flushTimer) flushTimer = setTimeout(flushMarks, MARK_FLUSH_MS);
}

export function selectTicket(index: number): void {
  try {
    localStorage.setItem(TICKET_KEY, String(index));
  } catch {
    /* ignore */
  }
  set({ selected: index });
}

// ---------- intents ----------

/** Fire-and-forget intent; the server decides everything. */
export function act(action: HousieAction): void {
  void sendGameAction(action).then((res) => {
    if (!res.ok) toast(res.message);
  });
}

export function claim(comboId: string): void {
  flushMarks(); // the server must hold the latest crosses before it evaluates the claim
  act({ type: 'claim', combo: comboId, ticket: state.selected });
}

// ---------- feed ----------

function reset(): void {
  pending.clear();
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (state !== EMPTY) set({ ...EMPTY, selected: loadSelected() });
}

function onSnapshot(raw: unknown): void {
  const view = raw as HousieView;
  const selected = Math.min(state.view ? state.selected : loadSelected(), Math.max(0, view.you.tickets.length - 1));
  set({
    view,
    marks: [...view.you.marks],
    selected,
    lockedUntil: view.you.claimsLockedMs ? Date.now() + view.you.claimsLockedMs : 0,
  });
}

/** Unlocks the next Full House once the previous one is claimed. */
function unlockFollowing(view: HousieView, comboId: string): HousieView['combos'] {
  const rule = getPattern(comboId)?.rule;
  const order = rule?.kind === 'full' ? rule.order : 0;
  return view.combos.map((c) => {
    const r = getPattern(c.id)?.rule;
    if (order && r?.kind === 'full' && r.order === order + 1 && c.locked) {
      const { locked: _locked, ...rest } = c;
      return rest;
    }
    return c;
  });
}

function onEvent(raw: unknown): void {
  const e = raw as HousieEvent;
  if ('priv' in e && e.priv) {
    switch (e.type) {
      case 'snapshot':
        onSnapshot(e.view);
        return;
      case 'bogus':
        set({ bogus: { ...state.bogus, [e.combo]: Date.now() } });
        return;
      case 'justClaimed':
        toast('Already claimed');
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
      const combos = unlockFollowing(view, e.combo).map((c) =>
        c.id === e.combo ? { ...c, status: 'claimed' as const, claimedBy: e.by, claimedAtCall: e.calledCount } : c,
      );
      set({ view: { ...view, seq: e.seq, combos }, celebrate: { combo: e.combo, key: Date.now() } });
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

registerGameFeed('housie', { reset, onSnapshot, onEvent });

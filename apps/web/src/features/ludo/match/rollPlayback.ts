import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import { useAnnouncer } from '../../../a11y/announcer';

/** One die throw being shown to this viewer. */
export interface Throw { seed: number; face: number; durationMs: number; seat: number; startedAt: number; }

export interface PlaybackSnapshot {
  /** The throw in progress, or null when the die is still. */
  active: Throw | null;
  /** The last settled face, or null before any roll was seen. */
  face: number | null;
}

export interface PlaybackOptions {
  /** Reduced motion or effects off: no throw is shown, the face appears at once. */
  instant: () => boolean;
  /** Said once when a die settles, never when it starts. */
  announce: (text: string, throwSeat: number) => void;
  now?: () => number;
  setTimeout?: (callback: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

interface RolledEvent { kind: 'ROLLED'; seat: number; value: number; seed: number; durationMs: number; }

const isRolled = (event: unknown): event is RolledEvent => {
  const entry = event as Partial<RolledEvent> | null;
  return typeof entry === 'object' && entry !== null && entry.kind === 'ROLLED'
    && Number.isInteger(entry.value) && entry.value! >= 1 && entry.value! <= 6 && Number.isFinite(entry.seed) && Number.isFinite(entry.durationMs)
    && Number.isInteger(entry.seat);
};

/**
 * Turns ROLLED events into throws for one viewer. A newer roll settles the previous one at once, "Skip" ends the
 * current throw for this viewer only, a hidden page shows the settled face instead of a stale throw, and a state
 * that arrives without events (a snapshot after a reconnect) shows the settled die with no replay.
 */
export class RollPlayback {
  private snapshot: PlaybackSnapshot = { active: null, face: null };
  private timer: unknown = null;
  private readonly listeners = new Set<() => void>();
  private disposed = false;

  constructor(private readonly options: PlaybackOptions) {}

  private now(): number { return (this.options.now ?? (() => performance.now()))(); }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = (): PlaybackSnapshot => this.snapshot;

  /** Seeds the settled face from a state that was not played live (the first render, or a snapshot). */
  rest(face: number | null): void {
    if (this.snapshot.active === null && this.snapshot.face !== face) this.set({ active: null, face });
  }

  /** Reads the events of one live update; only ROLLED events matter. */
  handle(events: readonly unknown[], hidden = false): void {
    if (this.disposed) return;
    for (const event of events) {
      if (!isRolled(event)) continue;
      this.finish();
      if (hidden || this.options.instant() || event.durationMs <= 0) {
        this.set({ active: null, face: event.value });
        this.options.announce(`rolled a ${event.value}`, event.seat);
        continue;
      }
      const active: Throw = { seed: event.seed, face: event.value, durationMs: event.durationMs, seat: event.seat, startedAt: this.now() };
      this.set({ active, face: this.snapshot.face });
      const schedule = this.options.setTimeout ?? ((callback, ms) => window.setTimeout(callback, ms));
      this.timer = schedule(() => { this.timer = null; this.finish(); }, event.durationMs);
    }
  }

  /** "Skip animation": the die settles now, for this viewer only. */
  skip(): void { this.finish(); }

  /** The page was hidden: show the settled die rather than a throw nobody saw. */
  hide(): void { this.finish(); }

  dispose(): void {
    this.disposed = true;
    this.clear();
    this.listeners.clear();
  }

  private clear(): void {
    if (this.timer === null) return;
    (this.options.clearTimeout ?? ((handle) => window.clearTimeout(handle as number)))(this.timer);
    this.timer = null;
  }

  private finish(): void {
    this.clear();
    const { active } = this.snapshot;
    if (active === null) return;
    this.set({ active: null, face: active.face });
    this.options.announce(`rolled a ${active.face}`, active.seat);
  }

  private set(next: PlaybackSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

/** Everything the board and the controls need to know about the die for this viewer. */
export function useRollPlayback(view: LudoMatchView, seq: number, events: readonly unknown[] | undefined, instant: boolean) {
  const announce = useAnnouncer();
  const latest = useRef({ view, instant, announce });
  latest.current = { view, instant, announce };
  const playback = useMemo(() => new RollPlayback({
    instant: () => latest.current.instant,
    announce: (text, seat) => {
      const current = latest.current.view;
      const who = seat === current.you ? 'You' : current.seats[seat]?.label ?? 'A player';
      latest.current.announce(`${who} ${text}.`);
    },
  }), []);
  const state = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);

  // The first render shows the settled die; an update with events plays them; an update without events (a snapshot
  // after a reconnect) settles any throw at once and shows the die as it is, with no replay.
  const handled = useRef<number | null>(null);
  useEffect(() => {
    if (handled.current === seq) return;
    const first = handled.current === null;
    handled.current = seq;
    if (!first && events !== undefined && events.length > 0) { playback.handle(events, document.hidden); return; }
    playback.skip();
    playback.rest(view.turn.dice ?? playback.getSnapshot().face);
  }, [seq, events, playback, view.turn.dice]);

  useEffect(() => {
    const onHidden = (): void => { if (document.hidden) playback.hide(); };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [playback]);
  useEffect(() => () => playback.dispose(), [playback]);

  const rolling = state.active !== null;
  return {
    rolling,
    throwing: state.active,
    face: rolling ? null : state.face ?? view.turn.dice,
    skip: () => playback.skip(),
  };
}

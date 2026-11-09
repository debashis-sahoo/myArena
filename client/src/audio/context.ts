import { useSyncExternalStore } from 'react';
import { LIMITER, MUSIC_TRIM, RAMP_MS, volumeToGain } from './levels';
import { getAudioPrefs, isAudible, subscribeAudioPrefs } from './prefs';

/** The graph of specs/007 contracts/audio-platform.md section 1: sound and music buses into one limiter, then the destination. */
export interface AudioGraph {
  ctx: AudioContext;
  sfxBus: GainNode;
  musicBus: GainNode;
}

export type AudioStatus = 'ready' | 'needs-tap' | 'unavailable';

let graph: AudioGraph | null = null;
let failed = false;
let gestureAt = -Infinity;
const listeners = new Set<() => void>();

const Ctor = (): typeof AudioContext | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
};

function computeStatus(): AudioStatus {
  if (failed || !Ctor()) return 'unavailable';
  // Effects need no notice: the first gesture unlocks audio silently. Only music, which starts by itself, can be waiting.
  if (isAudible('music') && graph?.ctx.state !== 'running') return 'needs-tap';
  return 'ready';
}

let status: AudioStatus = computeStatus();

function refresh(): void {
  const next = computeStatus();
  if (graph?.ctx.state === 'running') removeUnlockListeners();
  if (next === status) return;
  status = next;
  listeners.forEach((l) => l());
}

function applyGains(): void {
  if (!graph) return;
  const { ctx, sfxBus, musicBus } = graph;
  const prefs = getAudioPrefs();
  const t = ctx.currentTime;
  const tau = RAMP_MS / 1000 / 3;
  sfxBus.gain.setTargetAtTime(isAudible('sound') ? volumeToGain(prefs.sound.volume) : 0, t, tau);
  musicBus.gain.setTargetAtTime(isAudible('music') ? volumeToGain(prefs.music.volume) * MUSIC_TRIM : 0, t, tau);
}

function createGraph(): AudioGraph {
  const Context = Ctor();
  if (!Context) throw new Error('Web Audio is not available');
  const ctx = new Context();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = LIMITER.threshold;
  limiter.knee.value = LIMITER.knee;
  limiter.ratio.value = LIMITER.ratio;
  limiter.attack.value = LIMITER.attack;
  limiter.release.value = LIMITER.release;
  limiter.connect(ctx.destination);
  const sfxBus = ctx.createGain();
  const musicBus = ctx.createGain();
  sfxBus.connect(limiter);
  musicBus.connect(limiter);
  ctx.addEventListener('statechange', refresh);
  return { ctx, sfxBus, musicBus };
}

/** The graph once a gesture has created it (it may still be suspended); null before that. */
export function getAudio(): AudioGraph | null {
  return graph;
}

/** True when a gesture just asked the context to resume, so a cue played in the same gesture may wait for it. */
export function gestureJustHappened(): boolean {
  return performance.now() - gestureAt < 400;
}

/** Creates the context on first use and asks it to run. Call only from a user gesture (or the first-gesture listener below). */
export function resumeAudio(): void {
  if (failed) return;
  gestureAt = performance.now();
  try {
    if (!graph) {
      graph = createGraph();
      applyGains();
    }
    if (graph.ctx.state !== 'running') void graph.ctx.resume().then(refresh, refresh);
  } catch {
    failed = true;
    graph = null;
  }
  refresh();
}

export function useAudioStatus(): AudioStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => status,
  );
}

// The browser only lets audio start after a gesture. Until the context is running, every gesture just asks it to resume.
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const;
const unlock = (): void => resumeAudio();

function removeUnlockListeners(): void {
  if (typeof window === 'undefined') return;
  for (const e of UNLOCK_EVENTS) window.removeEventListener(e, unlock, true);
}

if (typeof window !== 'undefined') {
  for (const e of UNLOCK_EVENTS) window.addEventListener(e, unlock, { capture: true, passive: true });
  subscribeAudioPrefs(() => {
    applyGains();
    refresh();
  });
}

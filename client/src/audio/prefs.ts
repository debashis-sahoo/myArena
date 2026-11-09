import { useSyncExternalStore } from 'react';
import { MUSIC_DEFAULT, SOUND_DEFAULT } from './levels';

/**
 * Audio preferences kept on this device (specs/007 data-model.md section 1). A channel is audible when `on` and `volume > 0`.
 * Dragging a slider to 0 turns the channel off but keeps `last`; turning it on restores `last` (or the default).
 */
export interface ChannelPref {
  on: boolean;
  /** 0..1, what the slider shows. */
  volume: number;
  /** 0..1, the last volume above 0. */
  last: number;
}

export interface AudioPrefs {
  v: 1;
  sound: ChannelPref;
  music: ChannelPref;
}

export type Channel = 'sound' | 'music';

const KEY = 'myarena.audio.v1';
const GUEST_KEY = 'myarena.guest.v1';

const defaults = (): AudioPrefs => ({
  v: 1,
  sound: { on: true, volume: SOUND_DEFAULT, last: SOUND_DEFAULT },
  music: { on: false, volume: MUSIC_DEFAULT, last: MUSIC_DEFAULT },
});

const unit = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback);

function channelFrom(raw: unknown, def: ChannelPref): ChannelPref {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    on: typeof r.on === 'boolean' ? r.on : def.on,
    volume: unit(r.volume, def.volume),
    last: unit(r.last, def.last) || def.last,
  };
}

function persist(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the choice lasts for this session only */
  }
}

function load(): AudioPrefs {
  const base = defaults();
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const raw = JSON.parse(stored) as Record<string, unknown>;
      return { v: 1, sound: channelFrom(raw.sound, base.sound), music: channelFrom(raw.music, base.music) };
    }
    // First run: the old single sound switch lived on the guest profile.
    const guest = JSON.parse(localStorage.getItem(GUEST_KEY) ?? '{}') as { soundOn?: unknown };
    if (guest.soundOn === false) base.sound.on = false;
    persist(base);
  } catch {
    /* corrupt record or no storage: defaults */
  }
  return base;
}

let current: AudioPrefs = load();
const listeners = new Set<() => void>();

export function getAudioPrefs(): AudioPrefs {
  return current;
}

export function subscribeAudioPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAudioPrefs(): AudioPrefs {
  return useSyncExternalStore(subscribeAudioPrefs, getAudioPrefs, getAudioPrefs);
}

export function isAudible(channel: Channel): boolean {
  const c = current[channel];
  return c.on && c.volume > 0;
}

function update(channel: Channel, next: ChannelPref): void {
  const prev = current[channel];
  if (prev.on === next.on && prev.volume === next.volume && prev.last === next.last) return;
  current = { ...current, [channel]: next };
  persist(current);
  listeners.forEach((l) => l());
}

const fallback = (channel: Channel): number => (channel === 'sound' ? SOUND_DEFAULT : MUSIC_DEFAULT);

const LAST_SETTLE_MS = 700;
const settleTimers: Partial<Record<Channel, number | undefined>> = {};

function setOn(channel: Channel, on: boolean): void {
  const c = current[channel];
  if (!on) return update(channel, { ...c, on: false });
  const volume = c.last > 0 ? c.last : fallback(channel);
  update(channel, { on: true, volume, last: volume });
}

function setVolume(channel: Channel, raw: number): void {
  const v = Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;
  const c = current[channel];
  const pending = settleTimers[channel];
  if (pending !== undefined) window.clearTimeout(pending);
  settleTimers[channel] = undefined;
  if (v > 0) {
    // `last` follows the level only once the slider stops moving, so dragging down through 5%, 10%... to 0 leaves the level the
    // player had (and a later "on" restores it) instead of the last tiny step.
    update(channel, { on: true, volume: v, last: c.last });
    settleTimers[channel] = window.setTimeout(() => settle(channel), LAST_SETTLE_MS);
    return;
  }
  update(channel, { on: false, volume: 0, last: c.last });
}

function settle(channel: Channel): void {
  settleTimers[channel] = undefined;
  const c = current[channel];
  if (c.volume > 0 && c.last !== c.volume) update(channel, { ...c, last: c.volume });
}

export const setSoundOn = (on: boolean): void => setOn('sound', on);
export const setSoundVolume = (v: number): void => setVolume('sound', v);
export const setMusicOn = (on: boolean): void => setOn('music', on);
export const setMusicVolume = (v: number): void => setVolume('music', v);

import { useSyncExternalStore } from 'react';
import { getAudio } from '../context';
import { startTheme, type Theme, type ThemeHandle } from './engine';
import { bingoTheme } from './themes/bingo';
import { housieTheme } from './themes/housie';
import { ludoTheme } from './themes/ludo';
import { unoTheme } from './themes/uno';

/** One theme at a time (specs/007 contracts/audio-platform.md section 4). A game without a theme (a placeholder game) starts nothing. */
const THEMES: Readonly<Record<string, Theme>> = {
  ludo: ludoTheme,
  housie: housieTheme,
  bingo: bingoTheme,
  uno: unoTheme,
};

let wanted: string | null = null;
let playing: { id: string; handle: ThemeHandle } | null = null;
let busy = false;
let dirty = false;
const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((l) => l());

/**
 * Makes what is playing match what is wanted. Runs one pass at a time, so a theme is always fully faded out before the next one
 * starts and rapid changes can never stack themes; a change made during a pass is picked up by the loop.
 */
function reconcile(): void {
  if (busy) {
    dirty = true;
    return;
  }
  busy = true;
  void (async () => {
    try {
      do {
        dirty = false;
        const target = wanted !== null && THEMES[wanted] ? wanted : null;
        if (playing && playing.id !== target) {
          const old = playing;
          playing = null;
          notify();
          await old.handle.stop();
        }
        const theme = target !== null ? THEMES[target] : undefined;
        const audio = getAudio();
        if (!playing && target !== null && theme && audio && audio.ctx.state === 'running') {
          playing = { id: target, handle: startTheme(theme, audio.ctx, audio.musicBus) };
          notify();
        }
      } while (dirty);
    } finally {
      busy = false;
    }
  })();
}

/** Asks for the game's theme. A no-op while that theme already plays; it starts only once the audio context is running. */
export function startMusic(gameId: string): void {
  wanted = gameId;
  reconcile();
}

export function stopMusic(): void {
  wanted = null;
  reconcile();
}

/** The id of the game whose theme is playing, or null. */
export function useMusicStatus(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => playing?.id ?? null,
    () => null,
  );
}

/** Test and meter hook: the theme table. */
export const musicThemes = THEMES;

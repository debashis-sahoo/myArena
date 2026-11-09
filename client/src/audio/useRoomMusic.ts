import { useEffect, useState } from 'react';
import { useAudioStatus } from './context';
import { startMusic, stopMusic } from './music';
import { useAudioPrefs } from './prefs';

/**
 * Mounted once by RoomShell: the only place that starts or stops a theme (specs/007 contracts/audio-platform.md section 4).
 * A theme plays while a game is open, Music is audible, the page is visible and the audio context is running. Re-renders, replay and
 * reconnect do not change those inputs, so they never restart or stack a theme.
 */
export function useRoomMusic(gameId: string | null): void {
  const prefs = useAudioPrefs();
  const status = useAudioStatus();
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    const onChange = (): void => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const audible = prefs.music.on && prefs.music.volume > 0;
  // When Music is audible, status "ready" means the context is running.
  const play = gameId !== null && audible && visible && status === 'ready';

  useEffect(() => {
    if (play && gameId) startMusic(gameId);
    else stopMusic();
  }, [play, gameId]);

  useEffect(() => () => stopMusic(), []);
}

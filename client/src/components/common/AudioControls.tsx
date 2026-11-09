import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { resumeAudio, useAudioStatus } from '../../audio/context';
import { setMusicOn, setMusicVolume, setSoundOn, setSoundVolume, useAudioPrefs, type Channel } from '../../audio/prefs';
import { sfx } from '../../audio/sfx';

const POP_WIDTH = 320;
const EDGE = 8;

const LABELS: Record<Channel, string> = { sound: 'Sound effects', music: 'Music' };
const SET_ON: Record<Channel, (on: boolean) => void> = { sound: setSoundOn, music: setMusicOn };
const SET_VOLUME: Record<Channel, (v: number) => void> = { sound: setSoundVolume, music: setMusicVolume };

function ChannelRow({ channel }: { channel: Channel }): ReactElement {
  const pref = useAudioPrefs()[channel];
  const percent = Math.round(pref.volume * 100);
  const audible = pref.on && pref.volume > 0;
  const label = LABELS[channel];
  const preview = (): void => {
    if (channel === 'sound') sfx.tap();
  };

  return (
    <div className={`audio-row${audible ? '' : ' is-off'}`}>
      <div className="audio-row-head">
        <span className="audio-row-label" aria-hidden="true">
          <span className="audio-row-icon">{channel === 'sound' ? '🔊' : '🎵'}</span> {label}
        </span>
        <button
          type="button"
          className="audio-switch"
          role="switch"
          aria-checked={pref.on}
          aria-label={`${label} on`}
          onClick={() => {
            SET_ON[channel](!pref.on);
            if (!pref.on) window.setTimeout(preview, 0);
          }}
        >
          <span className="audio-switch-track" aria-hidden="true">
            <span className="audio-switch-knob" />
          </span>
        </button>
      </div>
      <div className="audio-slider">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          aria-label={`${label} volume`}
          aria-valuetext={audible ? `${percent} percent` : 'Off'}
          onChange={(e) => SET_VOLUME[channel](Number(e.currentTarget.value) / 100)}
          onPointerUp={preview}
          onKeyUp={preview}
          style={{ '--fill': `${percent}%` } as CSSProperties}
        />
        <output className="audio-value" aria-hidden="true">
          {audible ? `${percent}%` : 'Off'}
        </output>
      </div>
    </div>
  );
}

/**
 * One header button that opens independent on/off and 0 to 100 volume controls for sound effects and music
 * (specs/007 contracts/audio-platform.md section 5). Used by every game screen and the hub.
 */
export function AudioControls({ compact = false }: { compact?: boolean }): ReactElement {
  const prefs = useAudioPrefs();
  const status = useAudioStatus();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const soundOn = prefs.sound.on && prefs.sound.volume > 0;
  const musicOn = prefs.music.on && prefs.music.volume > 0;
  const summary = `Sound ${soundOn ? 'on' : 'off'}, music ${musicOn ? 'on' : 'off'}`;
  // Waves show the Sound state: muted, one wave (below half) or full.
  const soundIcon = !soundOn ? '🔇' : prefs.sound.volume < 0.5 ? '🔉' : '🔊';

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(POP_WIDTH, window.innerWidth - EDGE * 2);
    const left = Math.max(EDGE, Math.min(rect.right - width, window.innerWidth - width - EDGE));
    const top = Math.min(rect.bottom + EDGE, Math.max(EDGE, window.innerHeight - 140));
    setPos({ top, left, width, maxHeight: window.innerHeight - top - EDGE });
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const ready = pos !== null;
  useEffect(() => {
    if (open && ready) popRef.current?.querySelector<HTMLElement>('button, input')?.focus();
  }, [open, ready]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close(true);
    };
    const onPointer = (e: PointerEvent): void => {
      const target = e.target as Node | null;
      if (target && (popRef.current?.contains(target) || buttonRef.current?.contains(target))) return;
      close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`btn ghost icon audio-btn${compact ? ' compact' : ''}${status !== 'ready' ? ' not-ready' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Audio settings. ${summary}`}
        title={summary}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <span aria-hidden="true">{soundIcon}</span>
        {musicOn ? (
          <span className="audio-note" aria-hidden="true">
            ♪
          </span>
        ) : null}
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={popRef}
              id={id}
              className="audio-pop"
              role="dialog"
              aria-label="Audio settings"
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            >
              <div className="audio-pop-head">
                <strong>Audio</strong>
                <button type="button" className="audio-close" aria-label="Close audio settings" onClick={() => close(true)}>
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
              <ChannelRow channel="sound" />
              <ChannelRow channel="music" />
              {status !== 'ready' ? (
                <div className="audio-status" role="status">
                  {status === 'unavailable' ? (
                    <span>Audio is not available in this browser. Play continues without it.</span>
                  ) : (
                    <>
                      <span>Tap anywhere to start music</span>
                      <button type="button" className="btn small" onClick={() => resumeAudio()}>
                        Retry
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

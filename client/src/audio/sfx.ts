import { SFX_REF_PEAK } from './levels';
import { getAudio, gestureJustHappened } from './context';
import { isAudible } from './prefs';

/**
 * Short synthesized effects (Web Audio, no assets), authored at SFX_REF_PEAK before the sound bus and the master limiter
 * (specs/007 contracts/audio-platform.md section 3). Cues whose fundamental is below about 300 Hz carry a quieter partner an octave up,
 * because a phone speaker barely plays them.
 */
export interface CueVoice {
  freqs: readonly number[];
  /** Seconds per note. */
  step: number;
  type: OscillatorType;
  /** Relative level: 1 is SFX_REF_PEAK. */
  level: number;
  /** Seconds after the cue starts. */
  at?: number;
  /** Low-pass cutoff in Hz, for a softer sawtooth. */
  lowpass?: number;
}

export type Cue = readonly CueVoice[];

const octaveUp = (freqs: readonly number[]): number[] => freqs.map((f) => f * 2);

const BALL_ROLL = [180, 140, 200, 150, 220, 160, 190, 130, 170, 120];

export const CUES = {
  tap: [{ freqs: [520, 700], step: 0.05, type: 'triangle', level: 1 }],
  join: [{ freqs: [440, 660, 880], step: 0.07, type: 'sine', level: 1 }],
  message: [{ freqs: [880], step: 0.08, type: 'sine', level: 0.7 }],
  error: [
    { freqs: [220, 160], step: 0.1, type: 'sawtooth', level: 0.9, lowpass: 1400 },
    { freqs: [440, 320], step: 0.1, type: 'sawtooth', level: 0.36, lowpass: 1400 },
  ],
  success: [{ freqs: [523, 659, 784, 1046], step: 0.07, type: 'triangle', level: 1 }],
  stamp: [
    { freqs: [240], step: 0.04, type: 'triangle', level: 1 },
    { freqs: [480], step: 0.04, type: 'triangle', level: 0.5 },
  ],
  ballRoll: [
    { freqs: BALL_ROLL, step: 0.05, type: 'triangle', level: 1 },
    { freqs: octaveUp(BALL_ROLL), step: 0.05, type: 'triangle', level: 0.45 },
    { freqs: [420], step: 0.04, type: 'square', level: 0.6, at: 0.52 },
  ],
  winChime: [{ freqs: [784, 988, 1175, 1568], step: 0.11, type: 'sine', level: 1 }],
} as const satisfies Record<string, Cue>;

export type CueName = keyof typeof CUES;

/** Schedules one cue on any context (live or offline) into `dest`, starting at `t0`. */
export function scheduleCue(ctx: BaseAudioContext, dest: AudioNode, cue: Cue, t0: number): void {
  for (const voice of cue) {
    const peak = SFX_REF_PEAK * voice.level;
    voice.freqs.forEach((f, i) => {
      const start = t0 + (voice.at ?? 0) + i * voice.step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = voice.type;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.step * 0.95);
      let out: AudioNode = osc;
      if (voice.lowpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = voice.lowpass;
        osc.connect(filter);
        out = filter;
      }
      out.connect(gain).connect(dest);
      osc.start(start);
      osc.stop(start + voice.step);
    });
  }
}

/**
 * Plays only while Sound is audible and the context is running. A cue requested while the context is still resuming for the same
 * gesture waits for it; anything else is dropped, never queued, so nothing bursts out after the browser finally allows audio.
 */
function play(cue: Cue): void {
  if (!isAudible('sound')) return;
  const g = getAudio();
  if (!g) return;
  if (g.ctx.state === 'running') {
    scheduleCue(g.ctx, g.sfxBus, cue, g.ctx.currentTime);
    return;
  }
  if (gestureJustHappened()) {
    void g.ctx.resume().then(() => {
      if (g.ctx.state === 'running') scheduleCue(g.ctx, g.sfxBus, cue, g.ctx.currentTime);
    });
  }
}

export const sfx = {
  tap: () => play(CUES.tap),
  join: () => play(CUES.join),
  message: () => play(CUES.message),
  error: () => play(CUES.error),
  success: () => play(CUES.success),
  stamp: () => play(CUES.stamp),
  ballRoll: () => play(CUES.ballRoll),
  winChime: () => play(CUES.winChime),
};

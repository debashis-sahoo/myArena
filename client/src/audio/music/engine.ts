import { MUSIC_FADE_IN_MS, MUSIC_FADE_OUT_MS, MUSIC_LOOKAHEAD_MS, MUSIC_MAX_VOICES, MUSIC_REF_PEAK, MUSIC_TICK_MS } from '../levels';

/**
 * Generated background music (specs/007 research R4): a step sequencer over small pattern tables, played with Web Audio oscillators and
 * filtered noise. No audio files, nothing to license. The loop has no gap because the scheduler simply wraps around the 8-bar pattern.
 */
type Pattern = readonly (number | null)[];

/** bass and harmony cells are chord-tone indexes (0 root, 1, 2, 3 = the root an octave up); a lead cell is a scale degree from the key root. */
export interface PitchedVoice {
  kind: 'bass' | 'harmony' | 'lead';
  wave: OscillatorType;
  /** Level inside the mix, 0..1. */
  level: number;
  /** One bar of steps; null is a rest. */
  pattern: Pattern;
  /** Used instead of `pattern` in the second half of every `variationEvery` bars. */
  alt?: Pattern;
  /** Octaves above (or below) the key root. */
  octave: number;
  /** Attack in seconds. */
  attack: number;
  /** Note length in steps. */
  hold: number;
  /** Hold the level for most of the note (a pad) instead of decaying at once (a pluck). */
  sustain?: boolean;
  /** A quieter second partial (music box, electric piano). */
  partial?: { ratio: number; level: number };
  lowpass?: number;
  /** Adds a second oscillator detuned by this many cents (a pad). */
  detune?: number;
  /** A non-null cell plays every tone of the bar's chord together (pads, electric-piano stabs) instead of one note. */
  chord?: boolean;
}

/** Cells: 1 a soft hit, 2 an accented hit. */
export interface PercVoice {
  kind: 'perc';
  level: number;
  pattern: Pattern;
  alt?: Pattern;
  /** Noise high-pass cutoff in Hz and decay in seconds. */
  highpass: number;
  decay: number;
  /** A low sine thump under the noise (kick, clap body). */
  body?: { freq: number; decay: number };
}

export type Voice = PitchedVoice | PercVoice;

export interface Theme {
  id: 'ludo' | 'housie' | 'bingo' | 'uno';
  name: string;
  bpm: number;
  beatsPerBar: 3 | 4;
  stepsPerBeat: 2 | 4;
  /** Semitone offsets from the root. */
  scale: readonly number[];
  /** MIDI note of the key root. */
  root: number;
  bars: number;
  /** Per bar, scale degrees that form the chord. */
  chords: readonly (readonly number[])[];
  voices: readonly Voice[];
  /** Bars after which the alternate patterns swap in (and out again). */
  variationEvery: number;
  /** Master level of this theme (default 1), tuned with the loudness meter so every theme sits at the same loudness. */
  trim?: number;
}

/** Keeps the sum of the voices near MUSIC_REF_PEAK. */
const MIX = 0.5;

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

function semitone(theme: Theme, degree: number): number {
  const n = theme.scale.length;
  const octave = Math.floor(degree / n);
  return (theme.scale[((degree % n) + n) % n] ?? 0) + 12 * octave;
}

function chordDegree(chord: readonly number[], k: number, n: number): number {
  const len = chord.length || 1;
  return (chord[((k % len) + len) % len] ?? 0) + n * Math.floor(k / len);
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function playNote(ctx: BaseAudioContext, dest: AudioNode, v: PitchedVoice, hz: number, t: number, lengthSec: number, trim: number): void {
  const len = Math.max(lengthSec, v.attack + 0.05);
  const peak = MUSIC_REF_PEAK * v.level * MIX * trim;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + v.attack);
  if (v.sustain) gain.gain.setValueAtTime(peak, t + len * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);

  let out: AudioNode = gain;
  if (v.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = v.lowpass;
    gain.connect(filter);
    out = filter;
  }
  out.connect(dest);

  const end = t + len + 0.02;
  const oscillator = (wave: OscillatorType, freq: number, cents = 0): OscillatorNode => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = cents;
    osc.start(t);
    osc.stop(end);
    return osc;
  };
  oscillator(v.wave, hz).connect(gain);
  if (v.detune) oscillator(v.wave, hz, v.detune).connect(gain);
  if (v.partial) {
    const partialGain = ctx.createGain();
    partialGain.gain.value = v.partial.level;
    oscillator('sine', hz * v.partial.ratio).connect(partialGain).connect(gain);
  }
}

function playHit(ctx: BaseAudioContext, dest: AudioNode, v: PercVoice, cell: number, t: number, trim: number): void {
  const level = MUSIC_REF_PEAK * v.level * MIX * trim * (cell >= 2 ? 1 : 0.6);
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = v.highpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + v.decay);
  src.connect(filter).connect(gain).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + v.decay + 0.02);

  if (v.body) {
    const osc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(v.body.freq * 2, t);
    osc.frequency.exponentialRampToValueAtTime(v.body.freq, t + 0.04);
    bodyGain.gain.setValueAtTime(level * 1.2, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + v.body.decay);
    osc.connect(bodyGain).connect(dest);
    osc.start(t);
    osc.stop(t + v.body.decay + 0.02);
  }
}

/** Schedules every voice's note for one grid step (step 0 is the first step of bar 0; it wraps after `bars`). */
export function scheduleStep(ctx: BaseAudioContext, dest: AudioNode, theme: Theme, step: number, t: number): void {
  const stepsPerBar = theme.beatsPerBar * theme.stepsPerBeat;
  const barIndex = Math.floor(step / stepsPerBar) % theme.bars;
  const inBar = step % stepsPerBar;
  const alt = Math.floor(barIndex / theme.variationEvery) % 2 === 1;
  const chord = theme.chords[barIndex % theme.chords.length] ?? theme.chords[0] ?? [0];
  const stepSec = 60 / theme.bpm / theme.stepsPerBeat;
  const trim = theme.trim ?? 1;

  for (const v of theme.voices.slice(0, MUSIC_MAX_VOICES)) {
    const pattern = alt && v.alt ? v.alt : v.pattern;
    const cell = pattern[inBar % pattern.length];
    if (cell === null || cell === undefined) continue;
    if (v.kind === 'perc') {
      playHit(ctx, dest, v, cell, t, trim);
      continue;
    }
    const length = v.hold * stepSec;
    if (v.chord) {
      chord.forEach((_, k) => {
        const midi = theme.root + semitone(theme, chordDegree(chord, k, theme.scale.length)) + 12 * v.octave;
        playNote(ctx, dest, v, midiToHz(midi), t, length, trim);
      });
      continue;
    }
    const degree = v.kind === 'lead' ? cell : chordDegree(chord, cell, theme.scale.length);
    const midi = theme.root + semitone(theme, degree) + 12 * v.octave;
    playNote(ctx, dest, v, midiToHz(midi), t, length, trim);
  }
}

/** Renders `seconds` of a theme starting at `t0` into `dest` (no timers): used by the offline loudness meter. */
export function renderTheme(ctx: BaseAudioContext, dest: AudioNode, theme: Theme, t0: number, seconds: number): void {
  const stepSec = 60 / theme.bpm / theme.stepsPerBeat;
  for (let step = 0; step * stepSec < seconds; step += 1) scheduleStep(ctx, dest, theme, step, t0 + step * stepSec);
}

export interface ThemeHandle {
  /** Fades out, then silences and releases everything. */
  stop(): Promise<void>;
}

/** Starts a theme on a live context: fades in over MUSIC_FADE_IN_MS and keeps scheduling a short way ahead until stopped. */
export function startTheme(theme: Theme, ctx: AudioContext, dest: AudioNode): ThemeHandle {
  const out = ctx.createGain();
  const now = ctx.currentTime;
  out.gain.setValueAtTime(0.0001, now);
  out.gain.linearRampToValueAtTime(1, now + MUSIC_FADE_IN_MS / 1000);
  out.connect(dest);

  const stepSec = 60 / theme.bpm / theme.stepsPerBeat;
  const ahead = MUSIC_LOOKAHEAD_MS / 1000;
  let step = 0;
  let next = now + 0.05;
  const tick = (): void => {
    if (next < ctx.currentTime - 0.5) next = ctx.currentTime + 0.05; // the page was throttled: do not replay the gap
    while (next < ctx.currentTime + ahead) {
      scheduleStep(ctx, out, theme, step, next);
      next += stepSec;
      step += 1;
    }
  };
  tick();
  const timer = window.setInterval(tick, MUSIC_TICK_MS);

  let stopped = false;
  return {
    async stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
      out.gain.linearRampToValueAtTime(0.0001, t + MUSIC_FADE_OUT_MS / 1000);
      await new Promise<void>((resolve) => window.setTimeout(resolve, MUSIC_FADE_OUT_MS + 50));
      out.disconnect();
    },
  };
}

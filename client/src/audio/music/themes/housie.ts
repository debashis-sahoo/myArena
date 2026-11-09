import type { Theme } from '../engine';

const _ = null;

/** "Bingo Hall Waltz": a warm bingo-hall waltz. 96 BPM in 3/4, F major, a soft organ-like pad, a music-box melody, a brush on beat one. Original patterns. */
export const housieTheme: Theme = {
  id: 'housie',
  name: 'Bingo Hall Waltz',
  bpm: 96,
  beatsPerBar: 3,
  stepsPerBeat: 2,
  scale: [0, 2, 4, 5, 7, 9, 11],
  root: 65,
  bars: 8,
  variationEvery: 4,
  trim: 0.35,
  // Triads on scale degrees: I, vi, IV, V, I, vi, ii, V.
  chords: [
    [0, 2, 4],
    [5, 7, 9],
    [3, 5, 7],
    [4, 6, 8],
    [0, 2, 4],
    [5, 7, 9],
    [1, 3, 5],
    [4, 6, 8],
  ],
  voices: [
    {
      kind: 'harmony',
      chord: true,
      wave: 'sine',
      level: 0.4,
      octave: 0,
      attack: 0.25,
      hold: 7,
      sustain: true,
      detune: 7,
      pattern: [1, _, _, _, _, _],
    },
    {
      kind: 'bass',
      wave: 'triangle',
      level: 0.8,
      octave: -1,
      attack: 0.02,
      hold: 3,
      partial: { ratio: 2, level: 0.5 },
      pattern: [0, _, _, _, _, _],
      alt: [0, _, _, _, 2, _],
    },
    {
      kind: 'lead',
      wave: 'sine',
      level: 0.6,
      octave: 1,
      attack: 0.004,
      hold: 3,
      partial: { ratio: 3, level: 0.25 },
      pattern: [4, _, 5, _, 7, _],
      alt: [7, _, 5, _, 4, 2],
    },
    {
      kind: 'perc',
      level: 0.4,
      highpass: 3500,
      decay: 0.12,
      pattern: [2, _, 1, _, 1, _],
    },
  ],
};

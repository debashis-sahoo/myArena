import type { Theme } from '../engine';

const _ = null;

/** "Lucky Draw": a groovy lucky-draw. 118 BPM, G mixolydian, electric-piano stabs, a funk bass, a closed hat. Original patterns. */
export const bingoTheme: Theme = {
  id: 'bingo',
  name: 'Lucky Draw',
  bpm: 118,
  beatsPerBar: 4,
  stepsPerBeat: 4,
  scale: [0, 2, 4, 5, 7, 9, 10],
  root: 67,
  bars: 8,
  variationEvery: 4,
  // Triads on mixolydian degrees: G, G, F, C, G, Em, F, C.
  chords: [
    [0, 2, 4],
    [0, 2, 4],
    [6, 8, 10],
    [3, 5, 7],
    [0, 2, 4],
    [5, 7, 9],
    [6, 8, 10],
    [3, 5, 7],
  ],
  voices: [
    {
      kind: 'bass',
      wave: 'triangle',
      level: 1,
      octave: -1,
      attack: 0.008,
      hold: 1.5,
      partial: { ratio: 2, level: 0.55 },
      lowpass: 1500,
      pattern: [0, _, 0, _, _, 2, _, 0, _, _, 1, _, 2, _, 0, _],
      alt: [0, _, 0, 1, _, 2, _, 0, _, 2, _, 1, 2, _, 0, 2],
    },
    {
      kind: 'harmony',
      chord: true,
      wave: 'sine',
      level: 0.3,
      octave: 0,
      attack: 0.004,
      hold: 1.5,
      partial: { ratio: 2, level: 0.35 },
      pattern: [_, _, 1, _, _, _, 1, _, _, 1, _, _, _, _, 1, _],
      alt: [_, _, 1, _, _, 1, 1, _, _, 1, _, _, 1, _, 1, 1],
    },
    {
      kind: 'lead',
      wave: 'triangle',
      level: 0.45,
      octave: 1,
      attack: 0.004,
      hold: 2,
      partial: { ratio: 2, level: 0.2 },
      pattern: [4, _, _, _, _, _, 5, _, _, _, _, _, 6, _, 5, _],
      alt: [2, _, 4, _, _, _, 6, _, 5, _, 4, _, _, _, 2, _],
    },
    {
      kind: 'perc',
      level: 0.3,
      highpass: 7000,
      decay: 0.03,
      pattern: [1, _, 1, _, 1, _, 1, 1, 1, _, 1, _, 1, _, 1, 1],
    },
  ],
};

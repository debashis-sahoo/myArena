import type { Theme } from '../engine';

const _ = null;

/** "Card Shark": a cheeky card-table groove. 124 BPM, A minor pentatonic with a brighter lift every fourth bar, staccato low-passed plucks, a tight clap. Original patterns. */
export const unoTheme: Theme = {
  id: 'uno',
  name: 'Card Shark',
  bpm: 124,
  beatsPerBar: 4,
  stepsPerBeat: 4,
  scale: [0, 3, 5, 7, 10],
  root: 57,
  bars: 8,
  variationEvery: 4,
  trim: 1.4,
  // Pentatonic degrees: Am, Am, C, C, Dsus, Dsus, Em, Am.
  chords: [
    [0, 1, 3],
    [0, 1, 3],
    [1, 3, 4],
    [1, 3, 4],
    [2, 4, 5],
    [2, 4, 5],
    [3, 4, 6],
    [0, 1, 3],
  ],
  voices: [
    {
      kind: 'bass',
      wave: 'square',
      level: 0.7,
      octave: -1,
      attack: 0.005,
      hold: 1.5,
      partial: { ratio: 2, level: 0.5 },
      lowpass: 900,
      pattern: [0, _, _, 0, _, _, 2, _, 0, _, _, 0, _, 2, _, _],
      alt: [0, _, 0, _, 2, _, 0, _, 0, _, 0, 2, _, 1, _, 2],
    },
    {
      kind: 'harmony',
      chord: true,
      wave: 'square',
      level: 0.22,
      octave: 0,
      attack: 0.004,
      hold: 1,
      lowpass: 1500,
      pattern: [_, _, 1, _, _, _, 1, _, _, _, 1, _, _, _, 1, _],
      alt: [_, _, 1, _, _, 1, 1, _, _, _, 1, _, _, 1, 1, _],
    },
    {
      kind: 'lead',
      wave: 'square',
      level: 0.35,
      octave: 1,
      attack: 0.004,
      hold: 1,
      lowpass: 1800,
      pattern: [0, _, 2, _, 3, _, _, 2, _, _, 1, _, 0, _, _, _],
      alt: [5, _, 7, _, 8, _, _, 7, _, 6, _, 5, 3, _, 5, _],
    },
    {
      kind: 'perc',
      level: 0.5,
      highpass: 1500,
      decay: 0.09,
      pattern: [_, _, _, _, 2, _, _, _, _, _, _, _, 2, _, _, 1],
    },
  ],
};

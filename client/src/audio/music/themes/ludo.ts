import type { Theme } from '../engine';

const _ = null;

/** "Pawn Parade": a bouncy board-game parade. 108 BPM, C major pentatonic, marimba-like plucks over a walking bass, a light shaker. Original patterns. */
export const ludoTheme: Theme = {
  id: 'ludo',
  name: 'Pawn Parade',
  bpm: 108,
  beatsPerBar: 4,
  stepsPerBeat: 4,
  scale: [0, 2, 4, 7, 9],
  root: 60,
  bars: 8,
  variationEvery: 4,
  // Pentatonic degrees of the chord in each bar: C, Am, Dsus, Gsus, C, Am, Dsus, G.
  chords: [
    [0, 2, 3],
    [4, 5, 7],
    [1, 3, 4],
    [3, 4, 6],
    [0, 2, 3],
    [4, 5, 7],
    [1, 3, 4],
    [3, 4, 6],
  ],
  voices: [
    {
      kind: 'bass',
      wave: 'triangle',
      level: 1,
      octave: -1,
      attack: 0.01,
      hold: 3,
      partial: { ratio: 2, level: 0.5 },
      lowpass: 1200,
      pattern: [0, _, _, _, 2, _, _, _, 1, _, _, _, 2, _, _, _],
      alt: [0, _, _, 1, _, _, 2, _, 0, _, _, 1, _, _, 2, _],
    },
    {
      kind: 'harmony',
      wave: 'triangle',
      level: 0.6,
      octave: 0,
      attack: 0.005,
      hold: 2,
      partial: { ratio: 4, level: 0.15 },
      pattern: [_, _, 1, _, _, _, 2, _, _, _, 1, _, _, _, 0, _],
      alt: [0, _, 1, _, 2, _, 1, _, 0, _, 1, _, 2, _, 1, 2],
    },
    {
      kind: 'lead',
      wave: 'triangle',
      level: 0.7,
      octave: 1,
      attack: 0.005,
      hold: 2,
      partial: { ratio: 4, level: 0.2 },
      pattern: [4, _, _, 2, _, 3, _, _, 4, _, 2, _, 0, _, _, _],
      alt: [4, _, 3, _, 2, _, 3, 4, 5, _, 4, _, 3, 2, 0, _],
    },
    {
      kind: 'perc',
      level: 0.35,
      highpass: 5500,
      decay: 0.05,
      pattern: [2, _, 1, 1, 1, _, 1, 1, 1, _, 1, 1, 1, _, 1, 1],
    },
  ],
};

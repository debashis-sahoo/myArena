/**
 * Audio levels (specs/007 data-model.md section 2). The only place levels are written; tune them with the offline meter (V10).
 *
 * Calibration targets at the defaults:
 *   - an effect's peak is between -12 and -6 dBFS
 *   - music's short-term loudness is 8 to 12 dB below an effect's
 *   - the sum at 100% Sound and 100% Music never exceeds -1 dBFS after the limiter
 */
export const SOUND_DEFAULT = 0.8;
export const MUSIC_DEFAULT = 0.3;

/** Slider position to gain: v^1.5 (0 gives exactly 0, 1 gives 1). Gentler than a linear slider at the bottom. */
export const VOLUME_CURVE_POWER = 1.5;
export const volumeToGain = (v: number): number => Math.pow(Math.min(1, Math.max(0, v)), VOLUME_CURVE_POWER);

/** Authored peak of an effect before the buses (about -6 dBFS). */
export const SFX_REF_PEAK = 0.46;
/** Authored peak of the music mix before the bus, and a fixed trim so music sits below effects at equal slider positions. */
export const MUSIC_REF_PEAK = 0.5;
export const MUSIC_TRIM = 1.0;

/** Master limiter: a brick-wall compressor, so overlapping cues and 100/100 never clip. */
export const LIMITER = { threshold: -6, knee: 0, ratio: 20, attack: 0.003, release: 0.12 } as const;

/** Click-free gain changes. */
export const RAMP_MS = 30;

export const MUSIC_FADE_IN_MS = 800;
export const MUSIC_FADE_OUT_MS = 400;
export const MUSIC_LOOKAHEAD_MS = 100;
export const MUSIC_TICK_MS = 25;
/** Simultaneous voices (tracks) a theme may use: bass, harmony, lead and percussion. */
export const MUSIC_MAX_VOICES = 4;

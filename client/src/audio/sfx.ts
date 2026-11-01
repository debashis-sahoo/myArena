import { getGuest } from '../state/guest';

/** Short synthesized effects (Web Audio). No assets. Only plays when the guest turned sound on. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!getGuest().soundOn) return null;
  try {
    ctx ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freqs: number[], step: number, type: OscillatorType = 'sine', volume = 0.06): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  freqs.forEach((f, i) => {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const start = t0 + i * step;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step * 0.95);
    osc.connect(gain).connect(a.destination);
    osc.start(start);
    osc.stop(start + step);
  });
}

export const sfx = {
  tap: () => blip([520, 700], 0.05, 'triangle'),
  join: () => blip([440, 660, 880], 0.07, 'sine'),
  message: () => blip([880], 0.08, 'sine', 0.04),
  error: () => blip([220, 160], 0.1, 'sawtooth', 0.04),
  success: () => blip([523, 659, 784, 1046], 0.07, 'triangle'),
};

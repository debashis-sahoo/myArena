import { UNO_BOUNCE_MS, UNO_SHAKE_MS } from '@myarena/shared';
import { settled } from './fly';

const running = new WeakMap<Element, Animation>();

function play(el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  running.get(el)?.cancel();
  const anim = el.animate(frames, options);
  running.set(el, anim);
  return settled(anim);
}

/** A 3 px side-to-side shake of the table (240 ms) after a refused move. Reduced motion: none; the reason text carries the message. */
export function shakeTable(el: HTMLElement | null, reduced: boolean): Promise<void> {
  if (!el || reduced || typeof el.animate !== 'function') return Promise.resolve();
  return play(
    el,
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-3px)', offset: 0.15 },
      { transform: 'translateX(3px)', offset: 0.35 },
      { transform: 'translateX(-2px)', offset: 0.55 },
      { transform: 'translateX(1.5px)', offset: 0.75 },
      { transform: 'translateX(0)' },
    ],
    { duration: UNO_SHAKE_MS, easing: 'ease-out', composite: 'add' },
  );
}

/** A refused card snaps back with an overshoot (320 ms), added on top of its fan tilt. Reduced motion: a 300 ms outline flash. */
export function bounceCard(el: HTMLElement | null, reduced: boolean): Promise<void> {
  if (!el || typeof el.animate !== 'function') return Promise.resolve();
  if (reduced) {
    return play(
      el,
      [
        { outline: '3px solid rgba(255, 241, 176, 0)', outlineOffset: '2px' },
        { outline: '3px solid #fff1b0', outlineOffset: '2px', offset: 0.25 },
        { outline: '3px solid #fff1b0', outlineOffset: '2px', offset: 0.7 },
        { outline: '3px solid rgba(255, 241, 176, 0)', outlineOffset: '2px' },
      ],
      { duration: 300, easing: 'linear' },
    );
  }
  return play(
    el,
    [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-10px) scale(1.06)', offset: 0.25 },
      { transform: 'translateY(4px) scale(0.98)', offset: 0.6 },
      { transform: 'translateY(-2px) scale(1.01)', offset: 0.8 },
      { transform: 'translateY(0) scale(1)' },
    ],
    { duration: UNO_BOUNCE_MS, easing: 'ease-out', composite: 'add' },
  );
}

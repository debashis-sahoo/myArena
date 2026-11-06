import { UNO_COLOR_HEX, UNO_FLARE_MS, type UnoColor } from '@myarena/shared';
import { settled } from './fly';

const FLASH_MS = 300;
const GOLD_HI = '#fff1b0';

function overlay(parent: HTMLElement, color: string): HTMLElement {
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  const ring = document.createElement('span');
  ring.setAttribute('aria-hidden', 'true');
  ring.style.cssText = `position:absolute;inset:0;border-radius:inherit;pointer-events:none;border:4px solid ${color};box-shadow:0 0 22px 4px ${color},inset 0 0 18px ${color}`;
  parent.appendChild(ring);
  return ring;
}

function outlineFlash(el: HTMLElement, color: string): Promise<void> {
  return settled(
    el.animate(
      [
        { outline: `3px solid ${color}00`, outlineOffset: '-3px' },
        { outline: `3px solid ${color}`, outlineOffset: '-3px', offset: 0.25 },
        { outline: `3px solid ${color}`, outlineOffset: '-3px', offset: 0.7 },
        { outline: `3px solid ${color}00`, outlineOffset: '-3px' },
      ],
      { duration: FLASH_MS, easing: 'linear' },
    ),
  );
}

async function ringPulse(el: HTMLElement, color: string, from: number, to: number): Promise<void> {
  const ring = overlay(el, color);
  await settled(
    ring.animate(
      [
        { transform: `scale(${from})`, opacity: 0.95 },
        { transform: `scale(${to})`, opacity: 0 },
      ],
      { duration: UNO_FLARE_MS, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)' },
    ),
  );
  ring.remove();
}

/**
 * Reverse flare on the arrow track (600 ms): the track flashes and a gold-white ring bursts out of it while the chevrons snap
 * to their new direction (the caller swaps the spin class on the same commit). It animates only filter, opacity and an overlay,
 * never the track's own transform, so the chevrons keep turning. The element should be positioned. Reduced motion: a 300 ms outline flash.
 */
export function flareTrack(track: HTMLElement | null, reduced: boolean): Promise<void> {
  if (!track || typeof track.animate !== 'function') return Promise.resolve();
  if (reduced) return outlineFlash(track, GOLD_HI);
  const flash = settled(
    track.animate(
      [
        { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255, 241, 176, 0))' },
        { filter: 'brightness(2.2) drop-shadow(0 0 14px rgba(255, 241, 176, 1))', offset: 0.3 },
        { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255, 241, 176, 0))' },
      ],
      { duration: UNO_FLARE_MS, easing: 'ease-out' },
    ),
  );
  return Promise.all([flash, ringPulse(track, GOLD_HI, 0.92, 1.22)]).then(() => undefined);
}

/** Soft ring pulse on the aura in the colour just chosen for a Wild (600 ms). Reduced motion: a 300 ms outline flash. */
export function pulseAura(aura: HTMLElement | null, color: UnoColor | null, reduced: boolean): Promise<void> {
  if (!aura || typeof aura.animate !== 'function') return Promise.resolve();
  const hex = color ? UNO_COLOR_HEX[color] : GOLD_HI;
  if (reduced) return outlineFlash(aura, hex);
  return ringPulse(aura, hex, 0.9, 1.35);
}

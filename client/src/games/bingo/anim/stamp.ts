/** Dauber opacity; keep in step with .bz-dauber in bingo.css. */
const DAUBER_OPACITY = 0.55;
const STAMP_MS = 140;
const RING_MS = 220;

/** The dauber lands with a scale 1.7 to 1 stamp, a small rotation and a brief ring. Reduced motion shows it instantly. */
export function stampDauber(dauber: HTMLElement | null, ring: HTMLElement | null, reduced: boolean): void {
  if (reduced || !dauber || typeof dauber.animate !== 'function') return;
  dauber.animate(
    [
      { transform: 'scale(1.7) rotate(-14deg)', opacity: 0.1 },
      { transform: 'scale(1) rotate(0deg)', opacity: DAUBER_OPACITY },
    ],
    { duration: STAMP_MS, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  );
  ring?.animate(
    [
      { transform: 'scale(0.7)', opacity: 0.9 },
      { transform: 'scale(1.45)', opacity: 0 },
    ],
    { duration: RING_MS, easing: 'ease-out' },
  );
}

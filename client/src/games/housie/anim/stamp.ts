/** Draws the cross strokes and gives it a small scale pop. Cross strokes must carry pathLength="1". */
export function stampCross(el: SVGElement | null, reduced: boolean): void {
  if (!el || reduced || typeof el.animate !== 'function') return;
  el.animate(
    [
      { transform: 'scale(0.7)', opacity: 0.4 },
      { transform: 'scale(1.15)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { duration: 120, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  );
  el.querySelectorAll('path').forEach((p, i) => {
    p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 90,
      delay: i * 30,
      easing: 'ease-out',
      fill: 'backwards',
    });
  });
}

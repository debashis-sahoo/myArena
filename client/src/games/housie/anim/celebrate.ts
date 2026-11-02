const DURATION = 1200;
const SPARK_COLORS = ['#fff1b8', '#f2b73a', '#ff6b81', '#3be08a', '#7fd6ff', '#ffffff'];
const SPARKS = 16;

function overlay(): HTMLSpanElement {
  const s = document.createElement('span');
  s.setAttribute('aria-hidden', 'true');
  s.style.position = 'absolute';
  s.style.pointerEvents = 'none';
  return s;
}

/** Gold sweep plus confetti sparks on a tile; reduced motion shows a 1 s gold outline flash instead. */
export function celebrate(el: HTMLElement | null, reduced: boolean): void {
  if (!el || typeof el.animate !== 'function') return;

  if (reduced) {
    el.animate(
      [
        { outline: '3px solid #fff1b8', outlineOffset: '-3px' },
        { outline: '3px solid #fff1b8', outlineOffset: '-3px', offset: 0.8 },
        { outline: '3px solid rgba(255, 241, 184, 0)', outlineOffset: '-3px' },
      ],
      { duration: 1000, easing: 'linear' },
    );
    return;
  }

  const sweep = overlay();
  sweep.style.inset = '0';
  sweep.style.background = 'linear-gradient(105deg, transparent 30%, rgba(255, 241, 184, 0.85) 50%, transparent 70%)';
  el.appendChild(sweep);
  const sweepAnim = sweep.animate(
    [{ transform: 'translateX(-100%)', opacity: 1 }, { transform: 'translateX(100%)', opacity: 1, offset: 0.7 }, { transform: 'translateX(100%)', opacity: 0 }],
    { duration: DURATION, easing: 'ease-out' },
  );
  sweepAnim.onfinish = () => sweep.remove();
  sweepAnim.oncancel = () => sweep.remove();

  for (let i = 0; i < SPARKS; i += 1) {
    const spark = overlay();
    const size = 4 + Math.random() * 4;
    spark.style.left = '50%';
    spark.style.top = '50%';
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.borderRadius = Math.random() < 0.5 ? '50%' : '1px';
    spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length] ?? '#f2b73a';
    el.appendChild(spark);

    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * Math.max(30, el.clientWidth * 0.4);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.7;
    const anim = spark.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.round(Math.random() * 360)}deg) scale(0.4)`, opacity: 0 },
      ],
      { duration: DURATION * (0.7 + Math.random() * 0.3), easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' },
    );
    anim.onfinish = () => spark.remove();
    anim.oncancel = () => spark.remove();
  }
}

const DURATION = 1200;
const SPARK_COLORS = ['#fff0b0', '#f5c04a', '#ffd978', '#ffffff', '#ffb347'];
const SPARKS = 14;

function layer(): HTMLSpanElement {
  const s = document.createElement('span');
  s.setAttribute('aria-hidden', 'true');
  s.style.position = 'absolute';
  s.style.pointerEvents = 'none';
  return s;
}

function removeWhenDone(anim: Animation, el: HTMLElement): void {
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
}

/** Gold burst, light sweep and sparks on a tile or the BINGO! area (about 1.2 s); reduced motion shows a 1 s gold outline instead. */
export function celebrate(el: HTMLElement | null, reduced: boolean): void {
  if (!el || typeof el.animate !== 'function') return;

  if (reduced) {
    el.animate(
      [
        { outline: '3px solid #fff0b0', outlineOffset: '-3px' },
        { outline: '3px solid #fff0b0', outlineOffset: '-3px', offset: 0.8 },
        { outline: '3px solid rgba(255, 240, 176, 0)', outlineOffset: '-3px' },
      ],
      { duration: 1000, easing: 'linear' },
    );
    return;
  }

  const burst = layer();
  burst.style.left = '50%';
  burst.style.top = '50%';
  burst.style.width = '70%';
  burst.style.aspectRatio = '1';
  burst.style.borderRadius = '50%';
  burst.style.background = 'radial-gradient(circle, rgba(255, 240, 176, 0.95), rgba(245, 192, 74, 0.5) 45%, rgba(245, 192, 74, 0) 70%)';
  el.appendChild(burst);
  removeWhenDone(
    burst.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.95 },
        { transform: 'translate(-50%, -50%) scale(1.9)', opacity: 0 },
      ],
      { duration: DURATION * 0.7, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)' },
    ),
    burst,
  );

  const clip = layer();
  clip.style.inset = '0';
  clip.style.overflow = 'hidden';
  clip.style.borderRadius = 'inherit';
  const sweep = document.createElement('span');
  sweep.style.position = 'absolute';
  sweep.style.inset = '0';
  sweep.style.background = 'linear-gradient(105deg, transparent 30%, rgba(255, 240, 176, 0.85) 50%, transparent 70%)';
  clip.appendChild(sweep);
  el.appendChild(clip);
  removeWhenDone(
    sweep.animate(
      [
        { transform: 'translateX(-100%)', opacity: 1 },
        { transform: 'translateX(100%)', opacity: 1, offset: 0.7 },
        { transform: 'translateX(100%)', opacity: 0 },
      ],
      { duration: DURATION, easing: 'ease-out' },
    ),
    clip,
  );

  for (let i = 0; i < SPARKS; i += 1) {
    const spark = layer();
    const size = 4 + Math.random() * 4;
    spark.style.left = '50%';
    spark.style.top = '50%';
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.borderRadius = Math.random() < 0.5 ? '50%' : '1px';
    spark.style.background = SPARK_COLORS[i % SPARK_COLORS.length] ?? '#f5c04a';
    el.appendChild(spark);

    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * Math.max(30, el.clientWidth * 0.4);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.7;
    removeWhenDone(
      spark.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.round(Math.random() * 360)}deg) scale(0.4)`, opacity: 0 },
        ],
        { duration: DURATION * (0.7 + Math.random() * 0.3), easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' },
      ),
      spark,
    );
  }
}

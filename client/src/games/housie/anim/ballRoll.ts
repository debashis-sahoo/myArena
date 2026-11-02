import { BALL_ROLL_MS } from '@myarena/shared';

const running = new WeakMap<HTMLElement, Animation[]>();

export function rollIn(el: HTMLElement | null, reduced: boolean): void {
  if (!el || typeof el.animate !== 'function') return;
  running.get(el)?.forEach((a) => a.cancel());

  if (reduced) {
    running.set(el, [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' })]);
    return;
  }

  const roll = el.animate(
    [
      { transform: 'translateX(260%) rotate(-720deg)', opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.12 },
      { transform: 'translateX(-7%) rotate(14deg)', offset: 0.7 },
      { transform: 'translateX(3%) rotate(-5deg)', offset: 0.85 },
      { transform: 'translateX(0) rotate(0deg)', opacity: 1, offset: 1 },
    ],
    { duration: BALL_ROLL_MS, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)' },
  );
  const glow = el.animate(
    [
      { filter: 'drop-shadow(0 0 0 rgba(242, 183, 58, 0))' },
      { filter: 'drop-shadow(0 0 16px rgba(242, 183, 58, 0.95))', offset: 0.45 },
      { filter: 'drop-shadow(0 0 0 rgba(242, 183, 58, 0))' },
    ],
    { duration: 700, delay: BALL_ROLL_MS, easing: 'ease-in-out' },
  );
  running.set(el, [roll, glow]);
}

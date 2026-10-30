import type { Clock } from '@myarena/game-sdk';

export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout(callback, delay) { return setTimeout(callback, delay).unref(); },
  clearTimeout(handle) { clearTimeout(handle as ReturnType<typeof setTimeout>); },
};
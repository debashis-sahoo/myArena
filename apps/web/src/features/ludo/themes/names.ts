import type { ThemeId } from '@myarena/ludo';

export const themeNames: Record<ThemeId, string> = {
  classic: 'Classic',
  'super-heroes': 'Super Heroes',
  halloween: 'Halloween',
  diwali: 'Diwali',
  winter: 'Winter Holidays',
};

export const turnLimitText = (seconds: unknown): string => (seconds === 0 ? 'No limit' : `${String(seconds)} seconds`);

import type { ThemeId } from '@myarena/ludo';
import type { ThemeLook } from '../look';
import { classic } from './classic';
import { diwali } from './diwali';
import { halloween } from './halloween';
import { superHeroes } from './super-heroes';
import { winter } from './winter';

const generators: Record<ThemeId, () => ThemeLook> = {
  classic, 'super-heroes': superHeroes, halloween, diwali, winter,
};

/** Builds the look for a theme; call `dispose()` on the result when the scene is torn down or the theme changes. */
export const createLook = (theme: ThemeId): ThemeLook => generators[theme]();

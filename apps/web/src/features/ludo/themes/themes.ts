import { THEME_IDS, type Color, type ThemeId } from '@myarena/ludo';

/** Simple shapes drawn in the margin around the board; see `view/Decor.tsx`. */
export type DecorKind = 'shield' | 'star' | 'pumpkin' | 'bat' | 'diya' | 'marigold' | 'snowflake' | 'pine';

export interface ThemeRecord {
  id: ThemeId;
  name: string;
  description: string;
  /** One distinct colour per seat; the same values are in `styles/ludo-themes.css` (a test keeps them equal). */
  palette: Record<Color, string>;
  /** Board tints: backdrop, square fill, line and mark colours, and the fill of the yards. */
  board: { surface: string; cell: string; line: string; ink: string; yard: string };
  /** What is drawn on the outer edges of the corner blocks, repeated in turn; Classic draws nothing. */
  decor: readonly DecorKind[];
}

// Every look is original: Super Heroes uses invented shields and stars, never names, logos or likenesses from any film or comic.
export const themes: Readonly<Record<ThemeId, ThemeRecord>> = {
  classic: {
    id: 'classic', name: 'Classic', description: 'Bright and flat, with a silver pin for every pawn.',
    palette: { RED: '#e3242b', GREEN: '#0d9f55', YELLOW: '#ffd60a', BLUE: '#29a8f0' },
    board: { surface: '#ffffff', cell: '#ffffff', line: '#c8c8c8', ink: '#555555', yard: '#ffffff' },
    decor: [],
  },
  'super-heroes': {
    id: 'super-heroes', name: 'Super Heroes', description: 'Steel board, bold primaries, shields and stars.',
    palette: { RED: '#e3242b', GREEN: '#4ccf2b', YELLOW: '#ffd400', BLUE: '#2a5bff' },
    board: { surface: '#10193a', cell: '#1d2c5b', line: '#7da2ff', ink: '#e8eeff', yard: '#e8eeff' },
    decor: ['shield', 'star'],
  },
  halloween: {
    id: 'halloween', name: 'Halloween', description: 'A dark board lit by candles, with pumpkins and bats.',
    palette: { RED: '#d9381e', GREEN: '#6bb21f', YELLOW: '#f59e0b', BLUE: '#7b4bd1' },
    board: { surface: '#1c1326', cell: '#2f2040', line: '#f59e0b', ink: '#ffe9c2', yard: '#ffe9c2' },
    decor: ['pumpkin', 'bat'],
  },
  diwali: {
    id: 'diwali', name: 'Diwali', description: 'Brass and diyas, marigolds and warm lamp light.',
    palette: { RED: '#b3123b', GREEN: '#1f8a4c', YELLOW: '#ffa000', BLUE: '#1a4fa0' },
    board: { surface: '#4a2410', cell: '#fff0d2', line: '#d9a02a', ink: '#4a2410', yard: '#fff7e6' },
    decor: ['diya', 'marigold'],
  },
  winter: {
    id: 'winter', name: 'Winter Holidays', description: 'Frosted blue, snowflakes and pine trees.',
    palette: { RED: '#c8372d', GREEN: '#1f7a4d', YELLOW: '#e8b923', BLUE: '#3a8fd8' },
    board: { surface: '#dcebf7', cell: '#ffffff', line: '#7fa6c4', ink: '#17324a', yard: '#ffffff' },
    decor: ['snowflake', 'pine'],
  },
};

export const themeList: readonly ThemeRecord[] = THEME_IDS.map((id) => themes[id]);

export const isThemeId = (value: unknown): value is ThemeId => THEME_IDS.includes(value as ThemeId);
export const themeOf = (value: unknown): ThemeRecord => (isThemeId(value) ? themes[value] : themes.classic);

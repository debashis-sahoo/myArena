import { THEME_IDS, type Color, type ThemeId } from '@myarena/ludo';

export interface ThemeRecord {
  id: ThemeId;
  name: string;
  description: string;
  /** One distinct colour per seat; the same values are in `styles/ludo-themes.css` (a test keeps them equal). */
  palette: Record<Color, string>;
  /** Flat-board tints: backdrop, square fill, line and mark colours. */
  board: { surface: string; cell: string; line: string; ink: string };
  /** Short notes the 3D generators follow; the flat board only uses the palette and tints. */
  pawn: string;
  die: string;
  props: readonly string[];
  celebration: string;
}

// Every look is original: Super Heroes uses invented shields and stars, never names, logos or likenesses from any film or comic.
export const themes: Readonly<Record<ThemeId, ThemeRecord>> = {
  classic: {
    id: 'classic', name: 'Classic', description: 'Polished wood, glass and brass pawns.',
    palette: { RED: '#d63a2f', GREEN: '#2e9e4f', YELLOW: '#e0b100', BLUE: '#2f6fd6' },
    board: { surface: '#f4ead6', cell: '#fffaf0', line: '#8a6a43', ink: '#3b2a14' },
    pawn: 'glass and brass', die: 'ivory with black pips', props: ['brass corner studs'], celebration: 'gold confetti',
  },
  'super-heroes': {
    id: 'super-heroes', name: 'Super Heroes', description: 'Steel board, bold primaries and shield-and-star pawns.',
    palette: { RED: '#e3242b', GREEN: '#4ccf2b', YELLOW: '#ffd400', BLUE: '#2a5bff' },
    board: { surface: '#10193a', cell: '#1d2c5b', line: '#7da2ff', ink: '#e8eeff' },
    pawn: 'steel with a shield or star crest', die: 'brushed steel with gold pips', props: ['shield plates', 'star emblems'], celebration: 'comet streaks',
  },
  halloween: {
    id: 'halloween', name: 'Halloween', description: 'Slate board lit by candles, with pumpkins and bats.',
    palette: { RED: '#d9381e', GREEN: '#6bb21f', YELLOW: '#f59e0b', BLUE: '#7b4bd1' },
    board: { surface: '#1c1326', cell: '#2f2040', line: '#f59e0b', ink: '#ffe9c2' },
    pawn: 'carved pumpkin and slate', die: 'bone with ember pips', props: ['pumpkins', 'bats', 'candles'], celebration: 'drifting bats',
  },
  diwali: {
    id: 'diwali', name: 'Diwali', description: 'Brass and diyas, rangoli patterns and warm lamp light.',
    palette: { RED: '#b3123b', GREEN: '#1f8a4c', YELLOW: '#ffa000', BLUE: '#1a4fa0' },
    board: { surface: '#4a2410', cell: '#fff0d2', line: '#d9a02a', ink: '#4a2410' },
    pawn: 'brass with a diya flame', die: 'brass with enamel pips', props: ['diyas', 'rangoli patterns', 'marigold garlands'], celebration: 'sparkler sparks',
  },
  winter: {
    id: 'winter', name: 'Winter Holidays', description: 'Frosted wood and ice, snow and pine.',
    palette: { RED: '#c8372d', GREEN: '#1f7a4d', YELLOW: '#e8b923', BLUE: '#3a8fd8' },
    board: { surface: '#dcebf7', cell: '#ffffff', line: '#7fa6c4', ink: '#17324a' },
    pawn: 'frosted glass', die: 'ice with silver pips', props: ['snowdrifts', 'pine trees', 'lanterns'], celebration: 'falling snow',
  },
};

export const themeList: readonly ThemeRecord[] = THEME_IDS.map((id) => themes[id]);

export const isThemeId = (value: unknown): value is ThemeId => THEME_IDS.includes(value as ThemeId);
export const themeOf = (value: unknown): ThemeRecord => (isThemeId(value) ? themes[value] : themes.classic);

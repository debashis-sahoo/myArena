export type GameStatus = 'active' | 'coming_soon';

export interface GameDefinition {
  id: string;
  name: string;
  tagline: string;
  status: GameStatus;
  minPlayers: number;
  maxPlayers: number;
  defaultCapacity: number;
  supportsAi: boolean;
  /** One color tag per seat, in seat order. */
  seatColors: string[];
  theme: { accent: string; accent2: string };
  /** Seats are created on demand (any count up to `maxPlayers`) and colours come from ROSTER_COLORS. */
  roster?: boolean;
  /** No automatic system chat lines while a match is in progress (the game posts its own notices). */
  quietChat?: boolean;
}

export const GAMES: readonly GameDefinition[] = [
  {
    id: 'ludo',
    name: 'Ludo',
    tagline: 'Race your pawns home. Roll, bump rivals, and play with friends or the bots.',
    status: 'active',
    minPlayers: 2,
    maxPlayers: 4,
    defaultCapacity: 4,
    supportsAi: true,
    seatColors: ['yellow', 'green', 'blue', 'red'],
    theme: { accent: '#3dff9a', accent2: '#8a5cff' },
  },
  {
    id: 'snakes-and-ladders',
    name: 'Snakes & Ladders',
    tagline: 'Climb the ladders, dodge the snakes. Classic race to square 100.',
    status: 'coming_soon',
    minPlayers: 2,
    maxPlayers: 4,
    defaultCapacity: 4,
    supportsAi: true,
    seatColors: ['red', 'green', 'yellow', 'blue'],
    theme: { accent: '#b46cff', accent2: '#ff4fd8' },
  },
  {
    id: 'housie',
    name: 'Housie',
    tagline: 'Tickets, numbers, and chips. Mark your lines and shout Housie!',
    status: 'active',
    minPlayers: 2,
    maxPlayers: 200,
    defaultCapacity: 10,
    supportsAi: false,
    seatColors: ['red', 'green', 'yellow', 'blue'],
    theme: { accent: '#ff4f9a', accent2: '#ffb347' },
    roster: true,
    quietChat: true,
  },
  {
    id: 'bingo',
    name: 'Bingo',
    tagline: 'Match the balls, fill the card. Quick rounds with big cheers.',
    status: 'active',
    minPlayers: 2,
    maxPlayers: 200,
    defaultCapacity: 10,
    supportsAi: false,
    seatColors: ['red', 'green', 'yellow', 'blue'],
    theme: { accent: '#4fb6ff', accent2: '#8a5cff' },
    roster: true,
    quietChat: true,
  },
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}

/** Display values for seat color tags. */
export const COLOR_HEX: Record<string, string> = {
  red: '#ff4d6d',
  green: '#2ee59d',
  yellow: '#ffd93d',
  blue: '#4da3ff',
  orange: '#ff9f43',
  purple: '#b57bff',
  pink: '#ff7ad9',
  teal: '#2dd4c4',
  lime: '#b8ef4a',
  sky: '#7fd6ff',
  coral: '#ff7f6b',
  indigo: '#7c83ff',
};

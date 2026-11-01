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
    status: 'coming_soon',
    minPlayers: 2,
    maxPlayers: 4,
    defaultCapacity: 4,
    supportsAi: false,
    seatColors: ['red', 'green', 'yellow', 'blue'],
    theme: { accent: '#ff4f9a', accent2: '#ffb347' },
  },
  {
    id: 'bingo',
    name: 'Bingo',
    tagline: 'Match the balls, fill the card. Quick rounds with big cheers.',
    status: 'coming_soon',
    minPlayers: 2,
    maxPlayers: 4,
    defaultCapacity: 4,
    supportsAi: false,
    seatColors: ['red', 'green', 'yellow', 'blue'],
    theme: { accent: '#4fb6ff', accent2: '#8a5cff' },
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
};

import type { CatalogEntry } from '@myarena/protocol';

// Planned games with no lifecycle yet. Values are placeholders, not commitments.
export const roadmap: readonly CatalogEntry[] = [
  {
    id: 'snakes-and-ladders', name: 'Snakes & Ladders', description: 'Climb the ladders, dodge the snakes, and reach the final square first.', category: 'Classic board',
    status: 'COMING_SOON', test: false, minParticipants: 2, maxParticipants: 6, defaultParticipants: 4,
    durationMinutes: { min: 10, max: 25 }, modes: ['SOLO_AI', 'ONLINE'], art: { icon: 'SNAKE', palette: 'EMERALD' },
  },
  {
    id: 'tambola', name: 'Tambola', description: 'Mark your ticket as numbers are called and claim lines and houses.', category: 'Party',
    status: 'COMING_SOON', test: false, minParticipants: 2, maxParticipants: 100, defaultParticipants: 20,
    durationMinutes: { min: 20, max: 40 }, modes: ['ONLINE'], art: { icon: 'TICKET', palette: 'AMBER' },
  },
  {
    id: 'draw-and-guess', name: 'Draw & Guess', description: 'Sketch a secret word while your friends race to guess it.', category: 'Party',
    status: 'COMING_SOON', test: false, minParticipants: 3, maxParticipants: 8, defaultParticipants: 6,
    durationMinutes: { min: 15, max: 30 }, modes: ['ONLINE'], art: { icon: 'PALETTE', palette: 'ROSE' },
  },
  {
    id: 'royal-chess', name: 'Royal Chess', description: 'The timeless duel of strategy, played one move at a time.', category: 'Strategy',
    status: 'COMING_SOON', test: false, minParticipants: 2, maxParticipants: 2, defaultParticipants: 2,
    durationMinutes: { min: 10, max: 60 }, modes: ['SOLO_AI', 'ONLINE'], art: { icon: 'CROWN', palette: 'INDIGO' },
  },
  {
    id: 'royal-yacht-dice', name: 'Royal Yacht Dice', description: 'Roll five dice, chase combinations, and fill your scorecard.', category: 'Dice',
    status: 'COMING_SOON', test: false, minParticipants: 1, maxParticipants: 4, defaultParticipants: 2,
    durationMinutes: { min: 15, max: 30 }, modes: ['SOLO_AI', 'ONLINE'], art: { icon: 'DICE', palette: 'VIOLET' },
  },
  {
    id: 'four-in-a-row', name: 'Four-in-a-Row', description: 'Drop discs and line up four before your opponent does.', category: 'Strategy',
    status: 'COMING_SOON', test: false, minParticipants: 2, maxParticipants: 2, defaultParticipants: 2,
    durationMinutes: { min: 5, max: 10 }, modes: ['SOLO_AI', 'ONLINE'], art: { icon: 'DISCS', palette: 'TEAL' },
  },
];

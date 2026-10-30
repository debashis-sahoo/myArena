import type { CatalogEntry } from '@myarena/protocol';

const base = {
  category: 'Testing', test: false, durationMinutes: { min: 10, max: 20 }, art: { icon: 'DICE', palette: 'VIOLET' },
} as const;

export const bothModes: CatalogEntry = {
  ...base, id: 'both-game', name: 'Both Game', description: 'Works solo and online.', status: 'PLAYABLE',
  minParticipants: 2, maxParticipants: 4, defaultParticipants: 3, modes: ['SOLO_AI', 'ONLINE'],
};
export const onlineOnly: CatalogEntry = {
  ...base, id: 'online-game', name: 'Online Game', description: 'Online rooms only.', status: 'PLAYABLE', test: true,
  minParticipants: 2, maxParticipants: 6, defaultParticipants: 4, modes: ['ONLINE'],
};
export const soloOnly: CatalogEntry = {
  ...base, id: 'solo-game', name: 'Solo Game', description: 'Just you and the AI.', status: 'PLAYABLE',
  minParticipants: 1, maxParticipants: 1, defaultParticipants: 1, modes: ['SOLO_AI'],
};
export const bigRoom: CatalogEntry = {
  ...base, id: 'big-game', name: 'Big Game', description: 'Rooms up to one hundred.', status: 'PLAYABLE',
  minParticipants: 2, maxParticipants: 100, defaultParticipants: 100, modes: ['SOLO_AI', 'ONLINE'],
};
export const comingSoon: CatalogEntry = {
  ...base, id: 'later-game', name: 'Later Game', description: 'Planned for later.', status: 'COMING_SOON',
  minParticipants: 2, maxParticipants: 4, defaultParticipants: 4, modes: ['SOLO_AI', 'ONLINE'],
};

export const catalogResponse = (entries: CatalogEntry[]) =>
  new Response(JSON.stringify({ entries }), { status: 200, headers: { 'Content-Type': 'application/json' } });

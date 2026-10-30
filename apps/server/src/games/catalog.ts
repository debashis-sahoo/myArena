import type { CatalogEntry, CatalogResponse } from '@myarena/protocol';
import { catalogResponseSchema } from '@myarena/protocol';
import type { GameCatalog } from '../rooms/catalog.js';
import { roadmap } from './roadmap.js';

// Playable games first (registration order), then roadmap entries a registered game has not taken over.
export function buildCatalog(games: GameCatalog, planned: readonly CatalogEntry[] = roadmap): CatalogResponse {
  const playable: CatalogEntry[] = games.descriptors().map((game) => ({
    id: game.id, name: game.name, description: game.description, category: game.category,
    status: 'PLAYABLE', test: game.test === true,
    minParticipants: game.minParticipants, maxParticipants: game.maxParticipants,
    defaultParticipants: game.defaultParticipants ?? Math.min(game.maxParticipants, 100),
    durationMinutes: { ...game.durationMinutes }, modes: [...game.modes], art: { ...game.art },
  }));
  const taken = new Set(playable.map((entry) => entry.id));
  const entries = [...playable, ...planned.filter((entry) => !taken.has(entry.id))];
  return catalogResponseSchema.parse({ entries });
}

import type { FastifyInstance } from 'fastify';
import { buildCatalog } from '../../games/catalog.js';
import type { GameCatalog } from '../../rooms/catalog.js';

export function registerCatalogRoutes(app: FastifyInstance, games: GameCatalog, limit: number): void {
  app.get('/api/catalog', { config: { rateLimit: { max: limit, timeWindow: '1 minute' } } }, async () => buildCatalog(games));
}

import type { FastifyInstance } from 'fastify';
import type { GameCatalog } from '../../rooms/catalog.js';

export function registerGameRoutes(app: FastifyInstance, games: GameCatalog): void {
  app.get('/api/games', async () => ({ games: games.list() }));
}

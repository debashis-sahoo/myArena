import { buildApp } from './http/app.js';
import { parseEnv } from './config/env.js';
import { GameRegistry } from './games/registry.js';
import { createOnlineStubGame, createStubGame } from './games/stub-game.js';
import { RoomService } from './rooms/room-service.js';
import { gracefulShutdown } from './shutdown.js';

const config = parseEnv();
const testGames = config.testGameSeconds
  ? [createStubGame({ defaultDurationSeconds: config.testGameSeconds }), createOnlineStubGame({ defaultDurationSeconds: config.testGameSeconds })]
  : [];
const games = new GameRegistry(testGames);
const rooms = new RoomService({ config, games });
const app = await buildApp({ config, rooms });
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => { void gracefulShutdown(app, rooms).finally(() => process.exit(0)); });
}
await app.listen({ port: config.port, host: '0.0.0.0' });

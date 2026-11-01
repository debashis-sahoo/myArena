import type { Server as HttpServer } from 'node:http';
import type { Server } from 'socket.io';
import { EVENTS } from '@myarena/shared';
import { logger } from './logger.js';
import type { RoomStore } from './rooms/roomStore.js';
import { getServerPhase, setServerPhase } from './serverState.js';

/** Time for the "restarting" and "room closed" notices to reach clients, and for /healthz to report draining. */
const DRAIN_MS = 1000;
/** Render allows 30 s after SIGTERM. */
const HARD_EXIT_MS = 25_000;

/** Render sends SIGTERM: report draining, tell clients, end rooms, then close and exit. */
export function installShutdown(httpServer: HttpServer, io: Server, store: RoomStore): void {
  const shutdown = (signal: string): void => {
    if (getServerPhase() === 'draining') return;
    setServerPhase('draining');
    logger.info({ signal, rooms: store.size }, 'shutting down');
    io.emit(EVENTS.SERVER_RESTARTING, {});
    for (const room of store.all()) room.close('server_restart');

    setTimeout(() => {
      void io.close(() => {
        logger.info('shutdown complete');
        process.exit(0);
      });
    }, DRAIN_MS);
    setTimeout(() => process.exit(0), HARD_EXIT_MS).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  void httpServer;
}

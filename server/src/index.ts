import './instrumentation.js';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PING_INTERVAL_MS, PING_TIMEOUT_MS } from '@myarena/shared';
import { buildApp } from './app.js';
import { config } from './config.js';
import { logger, operational } from './logger.js';
import { setServerPhase } from './serverState.js';
import { installShutdown } from './shutdown.js';
import { createHostEntryCapability } from './sockets/entryCapability.js';
import { createRealtime } from './sockets/registerHandlers.js';

let io: Server | undefined;
let roomCount = (): number => 0;
const hostEntry = createHostEntryCapability();

const app = buildApp(() => ({ rooms: roomCount(), connections: io?.engine.clientsCount ?? 0 }), hostEntry);
const httpServer = createServer(app);

// Socket.IO heartbeat keeps established room sockets responsive; Always On handles idle hosting.
io = new Server(httpServer, {
  serveClient: false,
  pingInterval: PING_INTERVAL_MS,
  pingTimeout: PING_TIMEOUT_MS,
  maxHttpBufferSize: 10_000,
  cors:
    config.publicOrigin
      ? {
          origin: [config.publicOrigin],
          credentials: true,
          methods: ['GET', 'POST'],
        }
      : undefined,
});

const { store } = createRealtime(io, hostEntry);
roomCount = () => store.size;
installShutdown(httpServer, io, store);

io.engine.on('connection_error', (err: { code?: number; message?: string }) => {
  operational('error', 'error', 'socket_connection_refused');
  logger.debug({ code: err.code }, 'connection error');
});

httpServer.listen(config.port, '0.0.0.0', () => {
  setServerPhase('ready');
  operational('info', 'startup', 'server_ready');
  logger.info(
    {
      port: config.port,
      env: config.isProd ? 'production' : 'development',
      slot: config.slotIdentity,
      releaseId: config.releaseId,
      acceptsPublicNewRooms: config.acceptsPublicNewRooms,
    },
    'myArena server ready',
  );
});

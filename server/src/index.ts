import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PING_INTERVAL_MS, PING_TIMEOUT_MS } from '@myarena/shared';
import { buildApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { setServerPhase } from './serverState.js';
import { installShutdown } from './shutdown.js';
import { createRealtime } from './sockets/registerHandlers.js';

let io: Server | undefined;
let roomCount = (): number => 0;

const app = buildApp(() => ({ rooms: roomCount(), connections: io?.engine.clientsCount ?? 0 }));
const httpServer = createServer(app);

// Socket.IO heartbeat doubles as the keepalive: the client's replies are inbound traffic on Render (FR-039 to FR-041).
io = new Server(httpServer, {
  serveClient: false,
  pingInterval: PING_INTERVAL_MS,
  pingTimeout: PING_TIMEOUT_MS,
  maxHttpBufferSize: 10_000,
});

const { store } = createRealtime(io);
roomCount = () => store.size;
installShutdown(httpServer, io, store);

io.engine.on('connection_error', (err: { code?: number; message?: string }) => {
  logger.debug({ code: err.code, message: err.message }, 'connection error');
});

httpServer.listen(config.port, '0.0.0.0', () => {
  setServerPhase('ready');
  logger.info({ port: config.port, env: config.isProd ? 'production' : 'development' }, 'myArena server ready');
});

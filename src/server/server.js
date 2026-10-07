/**
 * myArena Royalty - HTTP & Real-time Server
 * Serves client web application and handles authoritative multiplayer REST and SSE events.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const roomManager = require('./room_manager');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const CLIENT_DIR = path.join(__dirname, '../client');
const ENGINE_DIR = path.join(__dirname, '../engine');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Reconnect-Token'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
  });
}

function getReconnectToken(req) {
  const token = req.headers['x-reconnect-token'];
  return Array.isArray(token) ? token[0] : token;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Reconnect-Token'
    });
    return res.end();
  }

  try {
    // -------------------------------------------------------------------------
    // SSE REAL-TIME STREAM
    // -------------------------------------------------------------------------
    const sseMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9-]+)\/stream$/);
    if (sseMatch && method === 'GET') {
      const roomCode = sseMatch[1];
      const auth = roomManager.authenticate(roomCode, parsedUrl.searchParams.get('token'));
      const room = auth.room;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial snapshot
      res.write(`data: ${JSON.stringify({
        type: 'ROOM_SYNC',
        room: roomManager.getRoomSummary(room, auth.player.id)
      })}\n\n`);

      roomManager.addSubscriber(roomCode, res, auth.player.id);

      const heartbeat = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 15000);

      req.on('close', () => {
        clearInterval(heartbeat);
        roomManager.removeSubscriber(roomCode, res);
      });
      return;
    }

    // -------------------------------------------------------------------------
    // REST API ENDPOINTS
    // -------------------------------------------------------------------------
    if (pathname === '/api/rooms/create' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = roomManager.createRoom(body);
      const room = roomManager.rooms.get(result.roomCode);
      return sendJson(res, 200, {
        roomCode: result.roomCode,
        player: roomManager.getPublicPlayer(result.player),
        reconnectToken: result.reconnectToken,
        room: roomManager.getRoomSummary(room, result.player.id),
        checkpoint: roomManager.createCheckpoint(room)
      });
    }

    if (pathname === '/api/rooms/join' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = roomManager.joinRoom(body);
      return sendJson(res, 200, {
        room: roomManager.getRoomSummary(result.room, result.player.id),
        player: roomManager.getPublicPlayer(result.player),
        reconnectToken: result.reconnectToken,
        reconnected: result.reconnected,
        checkpoint: roomManager.createCheckpoint(result.room)
      });
    }

    if (pathname === '/api/rooms/ping' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      auth.room.lastActivity = Date.now();
      return sendJson(res, 200, { ok: true, version: auth.room.version || 0 });
    }

    if (pathname === '/api/rooms/restore' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = roomManager.restoreRoom(body.checkpoint, getReconnectToken(req));
      return sendJson(res, 200, {
        restored: result.restored,
        room: roomManager.getRoomSummary(result.room, result.player.id),
        player: roomManager.getPublicPlayer(result.player),
        checkpoint: roomManager.createCheckpoint(result.room)
      });
    }

    if (pathname === '/api/rooms/leave' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const result = roomManager.leaveRoom(body.roomCode, auth.player.id);
      return sendJson(res, 200, {
        success: true,
        roomClosed: result.roomClosed,
        hostMigrated: Boolean(result.hostMigrated),
        room: result.room ? roomManager.getRoomSummary(result.room, auth.player.id) : null
      });
    }

    if (pathname === '/api/rooms/settings' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const room = roomManager.updateSettings(body.roomCode, auth.player.id, body);
      return sendJson(res, 200, { room: roomManager.getRoomSummary(room, auth.player.id) });
    }

    if (pathname === '/api/rooms/ready' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const player = roomManager.setPlayerReady(body.roomCode, auth.player.id, body.isReady);
      return sendJson(res, 200, { player: roomManager.getPublicPlayer(player) });
    }

    if (pathname === '/api/rooms/hero' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const player = roomManager.setPlayerHero(body.roomCode, auth.player.id, body.heroId);
      return sendJson(res, 200, { player: roomManager.getPublicPlayer(player) });
    }

    if (pathname === '/api/rooms/start' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      roomManager.startGame(body.roomCode, auth.player.id);
      return sendJson(res, 200, {
        gameState: roomManager.getClientGameState(auth.room, auth.player.id),
        room: roomManager.getRoomSummary(auth.room, auth.player.id),
        checkpoint: roomManager.createCheckpoint(auth.room)
      });
    }

    if (pathname === '/api/rooms/action' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const result = roomManager.executeAction(body.roomCode, auth.player.id, body.action);
      return sendJson(res, 200, {
        gameState: roomManager.getClientGameState(auth.room, auth.player.id),
        actionResult: roomManager.getClientActionResult(result.actionResult),
        checkpoint: roomManager.createCheckpoint(auth.room)
      });
    }

    if (pathname === '/api/rooms/rematch' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const room = roomManager.restartGame(body.roomCode, auth.player.id);
      return sendJson(res, 200, { room: roomManager.getRoomSummary(room, auth.player.id) });
    }

    if (pathname === '/api/rooms/chat' && method === 'POST') {
      const body = await parseJsonBody(req);
      const auth = roomManager.authenticate(body.roomCode, getReconnectToken(req));
      const message = roomManager.addChatMessage(body.roomCode, auth.player.id, body.message);
      const room = roomManager.rooms.get(roomManager.normalizeRoomCode(body.roomCode));
      return sendJson(res, 200, {
        chat: room ? room.chat.slice(-50) : [],
        message: message,
        checkpoint: room ? roomManager.createCheckpoint(room) : null
      });
    }

    const roomGetMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9-]+)$/);
    if (roomGetMatch && method === 'GET') {
      const roomCode = roomGetMatch[1];
      const room = roomManager.rooms.get(roomCode);
      if (!room) return sendJson(res, 404, { error: 'Room not found' });
      return sendJson(res, 200, { room: roomManager.getRoomSummary(room) });
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVING
    // -------------------------------------------------------------------------
    const clientFiles = {
      '/': path.join(CLIENT_DIR, 'index.html'),
      '/index.html': path.join(CLIENT_DIR, 'index.html'),
      '/app.js': path.join(CLIENT_DIR, 'app.js'),
      '/engine/ludo.js': path.join(ENGINE_DIR, 'ludo.js'),
      '/engine/snakes.js': path.join(ENGINE_DIR, 'snakes.js'),
      '/engine/tambola.js': path.join(ENGINE_DIR, 'tambola.js'),
      '/engine/ai.js': path.join(ENGINE_DIR, 'ai.js')
    };
    const filePath = clientFiles[pathname];

    if (filePath && fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error on', method, pathname, err);
    sendJson(res, err.statusCode || 400, { error: err.message || 'Internal server error' });
  }
});

function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`🏰 myArena Royalty Server running at http://localhost:${port}`);
      if (roomManager.checkpointKeyIsEphemeral) {
        console.warn('MYARENA_CHECKPOINT_SECRET is not set: rooms cannot be restored after a server ' +
          'restart. Set it to a long random value in your hosting environment.');
      }
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer, PORT };

/**
 * myArena Royalty - HTTP & Real-time Server
 * Serves client web application and handles authoritative multiplayer REST and SSE events.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const roomManager = require('./room_manager');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const CLIENT_DIR = path.join(__dirname, '../client');

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

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
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
      const room = roomManager.rooms.get(roomCode);
      if (!room) {
        return sendJson(res, 404, { error: 'Room not found' });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial snapshot
      res.write(`data: ${JSON.stringify({ type: 'ROOM_SYNC', room: roomManager.getRoomSummary(room) })}\n\n`);

      roomManager.addSubscriber(roomCode, res);

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
        player: result.player,
        reconnectToken: result.reconnectToken,
        room: roomManager.getRoomSummary(room)
      });
    }

    if (pathname === '/api/rooms/join' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = roomManager.joinRoom(body);
      return sendJson(res, 200, {
        room: roomManager.getRoomSummary(result.room),
        player: result.player,
        reconnectToken: result.reconnectToken,
        reconnected: result.reconnected
      });
    }

    if (pathname === '/api/rooms/leave' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = roomManager.leaveRoom(body.roomCode, body.playerId);
      return sendJson(res, 200, result || { success: true });
    }

    if (pathname === '/api/rooms/settings' && method === 'POST') {
      const body = await parseJsonBody(req);
      const room = roomManager.updateSettings(body.roomCode, body.hostId, body);
      return sendJson(res, 200, { room: roomManager.getRoomSummary(room) });
    }

    if (pathname === '/api/rooms/ready' && method === 'POST') {
      const body = await parseJsonBody(req);
      const player = roomManager.setPlayerReady(body.roomCode, body.playerId, body.isReady);
      return sendJson(res, 200, { player });
    }

    if (pathname === '/api/rooms/hero' && method === 'POST') {
      const body = await parseJsonBody(req);
      const player = roomManager.setPlayerHero(body.roomCode, body.playerId, body.heroId);
      return sendJson(res, 200, { player });
    }

    if (pathname === '/api/rooms/start' && method === 'POST') {
      const body = await parseJsonBody(req);
      const gameState = roomManager.startGame(body.roomCode, body.hostId);
      const room = roomManager.rooms.get(body.roomCode);
      return sendJson(res, 200, { gameState, room: roomManager.getRoomSummary(room) });
    }

    if (pathname === '/api/rooms/action' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = roomManager.executeAction(body.roomCode, body.playerId, body.action);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/rooms/rematch' && method === 'POST') {
      const body = await parseJsonBody(req);
      const room = roomManager.restartGame(body.roomCode, body.hostId);
      return sendJson(res, 200, { room: roomManager.getRoomSummary(room) });
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
    let filePath = path.join(CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);

    // If file doesn't exist, fallback to index.html (SPA routing)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(CLIENT_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
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
    sendJson(res, 400, { error: err.message || 'Internal server error' });
  }
});

function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`🏰 myArena Royalty Server running at http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer, PORT };

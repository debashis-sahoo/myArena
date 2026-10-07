/**
 * myArena Royalty - Authoritative Room & Session Manager
 * In-memory room registry, player membership, role permissions, and authoritative dispatch.
 */

const crypto = require('crypto');
const zlib = require('zlib');
const LudoEngine = require('../engine/ludo');
const SnakesEngine = require('../engine/snakes');
const TambolaEngine = require('../engine/tambola');

// Hosts such as Render's free tier restart or spin down instances and lose all memory.
// Every state change hands clients an encrypted checkpoint of their room so the first
// player to reconnect afterwards can rebuild it exactly; clients can neither read nor forge it.
const CHECKPOINT_FORMAT = 1;
const CHECKPOINT_TTL_MS = 12 * 60 * 60 * 1000;
const LOBBY_DISCONNECT_GRACE_MS = 5 * 60 * 1000;

function roomError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> room object
    this.subscribers = new Map(); // roomCode -> Set of response streams/sockets
    this.disconnectTimers = new Map(); // roomCode:playerId -> grace-period timer
    this.lobbyDisconnectGraceMs = LOBBY_DISCONNECT_GRACE_MS;
    const secret = process.env.MYARENA_CHECKPOINT_SECRET;
    this.checkpointKey = secret
      ? crypto.createHash('sha256').update(String(secret)).digest()
      : crypto.randomBytes(32);
    this.checkpointKeyIsEphemeral = !secret;
    this.cleanupTimer = setInterval(() => this.cleanupInactiveRooms(), 60000);
    this.cleanupTimer.unref();
  }

  cleanupInactiveRooms(maxIdleMs = 60 * 60 * 1000) {
    const cutoff = Date.now() - maxIdleMs;
    for (const [roomCode, room] of this.rooms) {
      const subscribers = this.subscribers.get(roomCode);
      if (room.lastActivity < cutoff && (!subscribers || subscribers.size === 0)) {
        this.rooms.delete(roomCode);
        this.subscribers.delete(roomCode);
        for (const [key, timer] of this.disconnectTimers) {
          if (key.startsWith(`${roomCode}:`)) {
            clearTimeout(timer);
            this.disconnectTimers.delete(key);
          }
        }
      }
    }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = 'ROYAL-';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  generateToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  normalizeRoomCode(roomCode) {
    return String(roomCode || '').trim().toUpperCase();
  }

  validateDisplayName(name, label = 'Display name') {
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      throw new Error(`${label} is required`);
    }
    if (cleanName.length > 20) {
      throw new Error(`${label} must be 20 characters or fewer`);
    }
    return cleanName;
  }

  getMaxPlayersForGame(gameType) {
    return gameType === 'tambola' ? 8 : 4;
  }

  authenticate(roomCode, reconnectToken) {
    const normalizedCode = this.normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedCode);
    if (!room) throw roomError('Room not found', 404);
    if (!reconnectToken) throw roomError('Authentication token is required', 401);

    const player = room.players.find(p => p.reconnectToken === reconnectToken);
    if (!player) throw roomError('Invalid authentication token', 401);
    player.lastSeen = Date.now();
    return { room, player };
  }

  createCheckpoint(room) {
    const snapshot = {
      format: CHECKPOINT_FORMAT,
      issuedAt: Date.now(),
      room: {
        id: room.id,
        code: room.code,
        gameType: room.gameType,
        status: room.status,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        rules: room.rules,
        players: room.players,
        gameState: room.gameState,
        chat: room.chat,
        createdAt: room.createdAt,
        version: room.version || 0
      }
    };
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.checkpointKey, iv);
    const sealed = Buffer.concat([
      cipher.update(zlib.deflateRawSync(Buffer.from(JSON.stringify(snapshot)))),
      cipher.final()
    ]);
    return {
      version: snapshot.room.version,
      data: Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString('base64url')
    };
  }

  readCheckpoint(data) {
    let snapshot;
    try {
      const raw = Buffer.from(String(data || ''), 'base64url');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.checkpointKey, raw.subarray(0, 12));
      decipher.setAuthTag(raw.subarray(12, 28));
      const packed = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
      snapshot = JSON.parse(zlib.inflateRawSync(packed, { maxOutputLength: 8 * 1024 * 1024 }).toString());
    } catch (err) {
      throw roomError('Invalid room checkpoint', 400);
    }
    if (!snapshot || snapshot.format !== CHECKPOINT_FORMAT || !snapshot.room || !Array.isArray(snapshot.room.players)) {
      throw roomError('Invalid room checkpoint', 400);
    }
    if (Date.now() - snapshot.issuedAt > CHECKPOINT_TTL_MS) {
      throw roomError('Room checkpoint has expired', 410);
    }
    return snapshot.room;
  }

  restoreRoom(checkpointData, reconnectToken) {
    if (!reconnectToken) throw roomError('Authentication token is required', 401);
    const saved = this.readCheckpoint(checkpointData);
    if (!saved.players.some(p => p.reconnectToken === reconnectToken)) {
      throw roomError('Invalid authentication token', 401);
    }

    const code = this.normalizeRoomCode(saved.code);
    const existing = this.rooms.get(code);
    if (existing) {
      if (existing.id !== saved.id) {
        throw roomError('That room code now belongs to a different room', 409);
      }
      // Another player already restored this room (possibly from a newer checkpoint).
      if ((existing.version || 0) >= (saved.version || 0)) {
        const player = existing.players.find(p => p.reconnectToken === reconnectToken);
        if (!player) throw roomError('Invalid authentication token', 401);
        return { room: existing, player, restored: false };
      }
    }

    const now = Date.now();
    const room = Object.assign({}, saved, {
      code,
      chat: Array.isArray(saved.chat) ? saved.chat : [],
      lastActivity: now,
      players: saved.players.map(p => Object.assign({}, p, { connected: false, lastSeen: now }))
    });
    this.rooms.set(code, room);
    if (!this.subscribers.has(code)) this.subscribers.set(code, new Set());
    this.clearDisconnectTimers(code);
    // Clients still attached to a room replaced by a newer checkpoint must resync.
    this.broadcast(code, { type: 'ROOM_RESTORED', room: this.getRoomSummary(room) });
    return {
      room,
      player: room.players.find(p => p.reconnectToken === reconnectToken),
      restored: true
    };
  }

  clearDisconnectTimers(roomCode) {
    for (const [key, timer] of this.disconnectTimers) {
      if (key.startsWith(`${roomCode}:`)) {
        clearTimeout(timer);
        this.disconnectTimers.delete(key);
      }
    }
  }

  getPublicPlayer(player) {
    return {
      id: player.id,
      name: player.name,
      role: player.role,
      isReady: player.isReady,
      heroId: player.heroId,
      connected: player.connected
    };
  }

  createRoom({ hostName, gameType, maxPlayers, rules, heroId }) {
    const cleanHostName = this.validateDisplayName(hostName, 'Host display name');
    const validGames = ['ludo', 'snakes', 'tambola'];
    if (!validGames.includes(gameType)) {
      throw new Error(`Invalid game type: ${gameType}`);
    }

    const roomCode = this.generateRoomCode();
    const hostId = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const reconnectToken = this.generateToken();

    const host = {
      id: hostId,
      name: cleanHostName,
      role: 'HOST',
      isReady: true,
      heroId: heroId || (gameType === 'ludo' ? 'iron_man' : 'iron_hero'),
      reconnectToken: reconnectToken,
      connected: true,
      lastSeen: Date.now()
    };

    const room = {
      id: crypto.randomBytes(8).toString('hex'),
      code: roomCode,
      gameType: gameType,
      status: 'LOBBY', // 'LOBBY' | 'IN_GAME' | 'FINISHED'
      hostId: hostId,
      maxPlayers: Math.min(
        Math.max(parseInt(maxPlayers, 10) || 4, 1),
        this.getMaxPlayersForGame(gameType)
      ),
      rules: rules || {},
      players: [host],
      gameState: null,
      chat: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      version: 1
    };

    this.rooms.set(roomCode, room);
    this.subscribers.set(roomCode, new Set());

    return { roomCode, player: host, reconnectToken };
  }

  joinRoom({ roomCode, playerName, heroId, reconnectToken }) {
    roomCode = this.normalizeRoomCode(roomCode);
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw roomError(`Room with code ${roomCode} does not exist`, 404);
    }

    // Check if this is an existing player reconnecting
    if (reconnectToken) {
      const existing = room.players.find(p => p.reconnectToken === reconnectToken);
      if (existing) {
        existing.connected = true;
        existing.lastSeen = Date.now();
        if (playerName && playerName.trim()) {
          existing.name = this.validateDisplayName(playerName);
        }
        this.broadcast(roomCode, { type: 'PLAYER_RECONNECTED', player: this.getPublicPlayer(existing) });
        return { room, player: existing, reconnectToken: existing.reconnectToken, reconnected: true };
      }
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Game is already in progress in this room');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error(`Room has reached maximum capacity of ${room.maxPlayers} players`);
    }

    const cleanName = this.validateDisplayName(playerName || 'Player');
    // Validate unique display name in room
    const isDuplicate = room.players.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Display name "${cleanName}" is already taken in this room. Please choose another.`);
    }

    const playerId = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const newReconnectToken = this.generateToken();

    const newPlayer = {
      id: playerId,
      name: cleanName,
      role: 'PLAYER',
      isReady: false,
      heroId: heroId || null,
      reconnectToken: newReconnectToken,
      connected: true,
      lastSeen: Date.now()
    };

    room.players.push(newPlayer);
    room.lastActivity = Date.now();

    this.broadcast(roomCode, { type: 'PLAYER_JOINED', player: this.getPublicPlayer(newPlayer) });

    return { room, player: newPlayer, reconnectToken: newReconnectToken, reconnected: false };
  }

  leaveRoom(roomCode, playerId) {
    roomCode = this.normalizeRoomCode(roomCode);
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerIdx = room.players.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return null;

    const leavingPlayer = room.players[playerIdx];
    room.players.splice(playerIdx, 1);
    room.lastActivity = Date.now();

    if (room.gameState) {
      this.removePlayerFromGame(room, playerId);
    }

    if (room.players.length === 0) {
      // Clean up empty room
      this.rooms.delete(roomCode);
      this.subscribers.delete(roomCode);
      for (const [key, timer] of this.disconnectTimers) {
        if (key.startsWith(`${roomCode}:`)) {
          clearTimeout(timer);
          this.disconnectTimers.delete(key);
        }
      }
      return { roomClosed: true };
    }

    let hostMigrated = false;
    // Host handoff
    if (room.hostId === playerId) {
      // Deterministically assign host rights to next senior player
      room.hostId = room.players[0].id;
      room.players[0].role = 'HOST';
      if (room.status === 'LOBBY') {
        room.players[0].isReady = true;
      }
      hostMigrated = true;
    }

    this.broadcast(roomCode, {
      type: 'PLAYER_LEFT',
      playerId: playerId,
      playerName: leavingPlayer.name,
      newHostId: room.hostId,
      hostMigrated: hostMigrated,
      room: this.getRoomSummary(room)
    });

    return { roomClosed: false, room, hostMigrated };
  }

  updateSettings(roomCode, hostId, { maxPlayers, rules, gameType }) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Only the host can modify room settings');
    if (room.status !== 'LOBBY') throw new Error('Settings cannot be changed after game starts');

    const nextGameType = gameType || room.gameType;
    if (!['ludo', 'snakes', 'tambola'].includes(nextGameType)) {
      throw new Error(`Invalid game type: ${nextGameType}`);
    }
    const gamePlayerLimit = this.getMaxPlayersForGame(nextGameType);
    if (room.players.length > gamePlayerLimit) {
      throw new Error(`${nextGameType.toUpperCase()} supports at most ${gamePlayerLimit} players`);
    }
    if (maxPlayers) {
      room.maxPlayers = Math.min(
        Math.max(parseInt(maxPlayers, 10), room.players.length),
        gamePlayerLimit
      );
    } else if (room.maxPlayers > gamePlayerLimit) {
      room.maxPlayers = gamePlayerLimit;
    }
    if (rules) room.rules = Object.assign(room.rules, rules);
    if (gameType) room.gameType = gameType;
    room.lastActivity = Date.now();

    this.broadcast(roomCode, { type: 'SETTINGS_UPDATED', room: this.getRoomSummary(room) });
    return room;
  }

  setPlayerReady(roomCode, playerId, isReady) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'LOBBY') throw new Error('Readiness can only be changed in the lobby');
    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not in room');

    player.isReady = Boolean(isReady);
    room.lastActivity = Date.now();

    this.broadcast(roomCode, { type: 'PLAYER_READY_CHANGED', playerId, isReady: player.isReady });
    return player;
  }

  setPlayerHero(roomCode, playerId, heroId) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'LOBBY') throw new Error('Hero can only be changed in the lobby');
    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not in room');

    player.heroId = heroId;
    this.broadcast(roomCode, { type: 'HERO_CHANGED', playerId, heroId });
    return player;
  }

  startGame(roomCode, hostId) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Only the host can start the game');
    if (room.status !== 'LOBBY') throw new Error('The room must be in the lobby before starting');

    const minRequired = room.gameType === 'ludo' ? 2 : (room.gameType === 'snakes' ? 1 : 1);
    const connectedPlayers = room.players.filter(player => player.connected);
    if (connectedPlayers.length < minRequired) {
      throw new Error(`${room.gameType.toUpperCase()} requires at least ${minRequired} players`);
    }
    if (!room.players.every(player => player.connected && player.isReady)) {
      throw new Error('All players must be ready before the game can start');
    }

    if (room.gameType === 'ludo') {
      const ludoPlayers = room.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        teamIndex: idx,
        isAI: false,
        heroId: p.heroId
      }));
      room.gameState = LudoEngine.createGame(ludoPlayers, room.rules);
    } else if (room.gameType === 'snakes') {
      const snakesPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isAI: false,
        heroId: p.heroId
      }));
      room.gameState = SnakesEngine.createGame(snakesPlayers, room.rules);
    } else if (room.gameType === 'tambola') {
      const tambolaPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.id === room.hostId ? 'HOST' : 'PLAYER'
      }));
      room.gameState = TambolaEngine.createGame(
        { hostId: room.hostId, callerRole: room.rules.callerRole || 'HOST' },
        tambolaPlayers,
        room.rules.activePatterns || null
      );
    }

    room.status = 'IN_GAME';
    room.lastActivity = Date.now();
    this.broadcast(roomCode, { type: 'GAME_STARTED', gameState: room.gameState });
    return room.gameState;
  }

  executeAction(roomCode, playerId, action) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'IN_GAME' || !room.gameState) throw new Error('Game is not currently active');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not in room');

    let result = null;

    if (room.gameType === 'ludo') {
      const currentTurnPlayer = room.gameState.players[room.gameState.currentTurnIndex];
      if (currentTurnPlayer.id !== playerId) {
        throw new Error(`It is ${currentTurnPlayer.name}'s turn, not yours!`);
      }

      if (action.type === 'ROLL_DICE') {
        result = LudoEngine.rollDice(room.gameState);
      } else if (action.type === 'MOVE_TOKEN') {
        result = LudoEngine.moveToken(room.gameState, action.tokenIndex);
      } else {
        throw new Error(`Unknown Ludo action: ${action.type}`);
      }
    } else if (room.gameType === 'snakes') {
      const currentTurnPlayer = room.gameState.players[room.gameState.currentTurnIndex];
      if (currentTurnPlayer.id !== playerId) {
        throw new Error(`It is ${currentTurnPlayer.name}'s turn, not yours!`);
      }

      if (action.type === 'ROLL_DICE') {
        result = SnakesEngine.playTurn(room.gameState);
      } else {
        throw new Error(`Unknown Snakes action: ${action.type}`);
      }
    } else if (room.gameType === 'tambola') {
      if (action.type === 'DRAW_BALL') {
        result = TambolaEngine.drawNextBall(room.gameState, playerId);
      } else if (action.type === 'CLAIM_WIN') {
        result = TambolaEngine.claimWin(room.gameState, playerId, action.patternId);
      } else {
        throw new Error(`Unknown Tambola action: ${action.type}`);
      }
    }

    if (room.gameState.phase === 'FINISHED') {
      room.status = 'FINISHED';
    }

    room.lastActivity = Date.now();
    this.broadcast(roomCode, { type: 'GAME_STATE_UPDATED', gameState: room.gameState, actionResult: result });
    return { gameState: room.gameState, actionResult: result };
  }

  restartGame(roomCode, hostId) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Only the host can initiate a rematch');
    if (room.status !== 'FINISHED') throw new Error('A rematch can only begin after the game finishes');

    room.status = 'LOBBY';
    room.gameState = null;
    room.players.forEach(p => {
      p.isReady = p.id === room.hostId;
    });

    this.broadcast(roomCode, { type: 'GAME_RESET_TO_LOBBY', room: this.getRoomSummary(room) });
    return room;
  }

  removePlayerFromGame(room, playerId) {
    const game = room.gameState;
    if (!game) return;

    if (room.gameType === 'tambola') {
      game.players = game.players.filter(player => player.id !== playerId);
      delete game.tickets[playerId];
      if (game.callerId === playerId && room.players.length > 0) {
        game.callerId = room.hostId;
      }
      return;
    }

    const removedIndex = game.players.findIndex(player => player.id === playerId);
    if (removedIndex === -1) return;
    const removedCurrentPlayer = removedIndex === game.currentTurnIndex;
    game.players.splice(removedIndex, 1);
    game.winnerRankings = (game.winnerRankings || []).filter(id => id !== playerId);

    if (game.players.length === 1) {
      const winner = game.players[0];
      game.phase = 'FINISHED';
      game.winnerRankings = [winner.id];
      room.status = 'FINISHED';
      return;
    }

    if (removedIndex < game.currentTurnIndex) {
      game.currentTurnIndex -= 1;
    } else if (game.currentTurnIndex >= game.players.length) {
      game.currentTurnIndex = 0;
    }

    if (removedCurrentPlayer) {
      game.phase = 'ROLL';
      game.currentDice = null;
      game.legalMoves = [];
      if (Object.prototype.hasOwnProperty.call(game, 'consecutiveSixes')) {
        game.consecutiveSixes = 0;
      }
    }
  }

  getClientGameState(room, playerId) {
    if (!room.gameState) return null;
    const gameState = JSON.parse(JSON.stringify(room.gameState));
    if (room.gameType === 'tambola') {
      const ownTicket = gameState.tickets && gameState.tickets[playerId];
      gameState.tickets = ownTicket ? { [playerId]: ownTicket } : {};
      delete gameState.ballPool;
      delete gameState.auditLog;
      gameState.patterns.forEach(pattern => {
        pattern.winners.forEach(winner => {
          delete winner.matchedNumbers;
        });
      });
    }
    return gameState;
  }

  getClientActionResult(actionResult) {
    if (!actionResult || typeof actionResult !== 'object') return actionResult;
    const clientResult = Object.assign({}, actionResult);
    delete clientResult.game;
    if (clientResult.winRecord) {
      clientResult.winRecord = Object.assign({}, clientResult.winRecord);
      delete clientResult.winRecord.matchedNumbers;
    }
    if (clientResult.audit) {
      clientResult.audit = Object.assign({}, clientResult.audit);
      delete clientResult.audit.ticketGrid;
      delete clientResult.audit.matchedNumbers;
    }
    return clientResult;
  }

  addChatMessage(roomCode, playerId, message) {
    const room = this.rooms.get(this.normalizeRoomCode(roomCode));
    if (!room) throw new Error('Room not found');

    const player = room.players.find(candidate => candidate.id === playerId);
    if (!player) throw new Error('Player not in room');

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) throw new Error('Message cannot be empty');
    if (cleanMessage.length > 200) throw new Error('Message is too long');

    const chatEntry = {
      id: `chat_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      playerId: player.id,
      name: player.name,
      message: cleanMessage,
      createdAt: Date.now()
    };

    room.chat.push(chatEntry);
    room.chat = room.chat.slice(-50);
    room.lastActivity = Date.now();

    this.broadcast(roomCode, { type: 'CHAT_MESSAGE', chat: room.chat.slice(-50) });
    return chatEntry;
  }

  getRoomSummary(room, playerId = null) {
    return {
      code: room.code,
      gameType: room.gameType,
      status: room.status,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      rules: room.rules,
      chat: room.chat ? room.chat.slice(-50) : [],
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isReady: p.isReady,
        heroId: p.heroId,
        connected: p.connected
      })),
      gameState: playerId ? this.getClientGameState(room, playerId) : null
    };
  }

  addSubscriber(roomCode, res, playerId) {
    if (!this.subscribers.has(roomCode)) {
      this.subscribers.set(roomCode, new Set());
    }
    this.subscribers.get(roomCode).add({ res, playerId });
    const room = this.rooms.get(roomCode);
    const player = room && room.players.find(candidate => candidate.id === playerId);
    if (player && !player.connected) {
      player.connected = true;
      this.broadcast(roomCode, {
        type: 'PLAYER_CONNECTION_CHANGED',
        playerId,
        connected: true
      });
    }
    const timerKey = `${roomCode}:${playerId}`;
    const disconnectTimer = this.disconnectTimers.get(timerKey);
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      this.disconnectTimers.delete(timerKey);
    }
  }

  removeSubscriber(roomCode, res) {
    const set = this.subscribers.get(roomCode);
    if (set) {
      let playerId = null;
      for (const subscriber of set) {
        if (subscriber.res === res) {
          playerId = subscriber.playerId;
          set.delete(subscriber);
          break;
        }
      }
      if (playerId && !Array.from(set).some(subscriber => subscriber.playerId === playerId)) {
        const room = this.rooms.get(roomCode);
        const player = room && room.players.find(candidate => candidate.id === playerId);
        if (player) {
          player.connected = false;
          this.broadcast(roomCode, {
            type: 'PLAYER_CONNECTION_CHANGED',
            playerId,
            connected: false
          });
          // Mid-game seats are kept: a phone locking or switching apps must not forfeit the
          // match. Only idle lobby seats are released, so the room can still fill and start.
          if (room.status === 'LOBBY') {
            const timerKey = `${roomCode}:${playerId}`;
            const timer = setTimeout(() => {
              this.disconnectTimers.delete(timerKey);
              const currentRoom = this.rooms.get(roomCode);
              const currentSet = this.subscribers.get(roomCode);
              const reconnected = currentSet &&
                Array.from(currentSet).some(subscriber => subscriber.playerId === playerId);
              if (!reconnected && currentRoom && currentRoom.status === 'LOBBY') {
                this.leaveRoom(roomCode, playerId);
              }
            }, this.lobbyDisconnectGraceMs);
            timer.unref();
            this.disconnectTimers.set(timerKey, timer);
          }
        }
      }
    }
  }

  broadcast(roomCode, eventData) {
    roomCode = this.normalizeRoomCode(roomCode);
    const room = this.rooms.get(roomCode);
    // Every broadcast follows a state change, so it doubles as the version clock.
    if (room) room.version = (room.version || 0) + 1;

    const set = this.subscribers.get(roomCode);
    if (!set || set.size === 0) return;

    const checkpoint = room ? this.createCheckpoint(room) : null;
    for (const subscriber of set) {
      try {
        if (typeof subscriber.res.write === 'function') {
          const clientEvent = Object.assign({}, eventData);
          if (clientEvent.gameState && room) {
            clientEvent.gameState = this.getClientGameState(room, subscriber.playerId);
          }
          if (clientEvent.room && room) {
            clientEvent.room = this.getRoomSummary(room, subscriber.playerId);
          }
          if (clientEvent.actionResult && clientEvent.actionResult.game) {
            clientEvent.actionResult = this.getClientActionResult(clientEvent.actionResult);
          }
          if (checkpoint) clientEvent.checkpoint = checkpoint;
          const payload = `data: ${JSON.stringify(clientEvent)}\n\n`;
          subscriber.res.write(payload);
        }
      } catch (err) {
        set.delete(subscriber);
      }
    }
  }
}

module.exports = new RoomManager();

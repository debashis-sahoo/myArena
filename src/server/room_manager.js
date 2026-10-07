/**
 * myArena Royalty - Authoritative Room & Session Manager
 * In-memory room registry, player membership, role permissions, and authoritative dispatch.
 */

const crypto = require('crypto');
const LudoEngine = require('../engine/ludo');
const SnakesEngine = require('../engine/snakes');
const TambolaEngine = require('../engine/tambola');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> room object
    this.subscribers = new Map(); // roomCode -> Set of response streams/sockets
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

  createRoom({ hostName, gameType, maxPlayers, rules, heroId }) {
    if (!hostName || hostName.trim().length === 0) {
      throw new Error('Host display name is required');
    }

    const validGames = ['ludo', 'snakes', 'tambola'];
    if (!validGames.includes(gameType)) {
      throw new Error(`Invalid game type: ${gameType}`);
    }

    const roomCode = this.generateRoomCode();
    const hostId = `usr_${crypto.randomBytes(6).toString('hex')}`;
    const reconnectToken = this.generateToken();

    const host = {
      id: hostId,
      name: hostName.trim(),
      role: 'HOST',
      isReady: true,
      heroId: heroId || (gameType === 'ludo' ? 'iron_man' : 'iron_hero'),
      reconnectToken: reconnectToken,
      connected: true,
      lastSeen: Date.now()
    };

    const room = {
      code: roomCode,
      gameType: gameType,
      status: 'LOBBY', // 'LOBBY' | 'IN_GAME' | 'FINISHED'
      hostId: hostId,
      maxPlayers: Math.min(Math.max(parseInt(maxPlayers, 10) || 4, 1), 8),
      rules: rules || {},
      players: [host],
      gameState: null,
      chat: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.rooms.set(roomCode, room);
    this.subscribers.set(roomCode, new Set());

    return { roomCode, player: host, reconnectToken };
  }

  joinRoom({ roomCode, playerName, heroId, reconnectToken }) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error(`Room with code ${roomCode} does not exist`);
    }

    // Check if this is an existing player reconnecting
    if (reconnectToken) {
      const existing = room.players.find(p => p.reconnectToken === reconnectToken);
      if (existing) {
        existing.connected = true;
        existing.lastSeen = Date.now();
        if (playerName && playerName.trim()) {
          existing.name = playerName.trim();
        }
        this.broadcast(roomCode, { type: 'PLAYER_RECONNECTED', player: existing });
        return { room, player: existing, reconnectToken: existing.reconnectToken, reconnected: true };
      }
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Game is already in progress in this room');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error(`Room has reached maximum capacity of ${room.maxPlayers} players`);
    }

    const cleanName = (playerName || 'Player').trim();
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

    this.broadcast(roomCode, { type: 'PLAYER_JOINED', player: newPlayer });

    return { room, player: newPlayer, reconnectToken: newReconnectToken, reconnected: false };
  }

  leaveRoom(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerIdx = room.players.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return null;

    const leavingPlayer = room.players[playerIdx];
    room.players.splice(playerIdx, 1);
    room.lastActivity = Date.now();

    if (room.players.length === 0) {
      // Clean up empty room
      this.rooms.delete(roomCode);
      this.subscribers.delete(roomCode);
      return { roomClosed: true };
    }

    let hostMigrated = false;
    // Host handoff
    if (room.hostId === playerId) {
      // Deterministically assign host rights to next senior player
      room.hostId = room.players[0].id;
      room.players[0].role = 'HOST';
      hostMigrated = true;
    }

    this.broadcast(roomCode, {
      type: 'PLAYER_LEFT',
      playerId: playerId,
      playerName: leavingPlayer.name,
      newHostId: room.hostId,
      hostMigrated: hostMigrated
    });

    return { roomClosed: false, room, hostMigrated };
  }

  updateSettings(roomCode, hostId, { maxPlayers, rules, gameType }) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Only the host can modify room settings');
    if (room.status !== 'LOBBY') throw new Error('Settings cannot be changed after game starts');

    if (maxPlayers) room.maxPlayers = Math.min(Math.max(parseInt(maxPlayers, 10), 1), 8);
    if (rules) room.rules = Object.assign(room.rules, rules);
    if (gameType) room.gameType = gameType;
    room.lastActivity = Date.now();

    this.broadcast(roomCode, { type: 'SETTINGS_UPDATED', room: this.getRoomSummary(room) });
    return room;
  }

  setPlayerReady(roomCode, playerId, isReady) {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
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
    if (room.status === 'IN_GAME') throw new Error('Game is already in progress');

    const minRequired = room.gameType === 'ludo' ? 2 : (room.gameType === 'snakes' ? 1 : 1);
    if (room.players.length < minRequired) {
      throw new Error(`${room.gameType.toUpperCase()} requires at least ${minRequired} players`);
    }

    room.status = 'IN_GAME';

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

    room.status = 'LOBBY';
    room.gameState = null;
    room.players.forEach(p => {
      p.isReady = p.id === room.hostId;
    });

    this.broadcast(roomCode, { type: 'GAME_RESET_TO_LOBBY', room: this.getRoomSummary(room) });
    return room;
  }

  getRoomSummary(room) {
    return {
      code: room.code,
      gameType: room.gameType,
      status: room.status,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      rules: room.rules,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isReady: p.isReady,
        heroId: p.heroId,
        connected: p.connected
      })),
      gameState: room.gameState
    };
  }

  addSubscriber(roomCode, res) {
    if (!this.subscribers.has(roomCode)) {
      this.subscribers.set(roomCode, new Set());
    }
    this.subscribers.get(roomCode).add(res);
  }

  removeSubscriber(roomCode, res) {
    const set = this.subscribers.get(roomCode);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        // Keep room until expiry
      }
    }
  }

  broadcast(roomCode, eventData) {
    const set = this.subscribers.get(roomCode);
    if (!set) return;

    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const res of set) {
      try {
        if (typeof res.write === 'function') {
          res.write(payload);
        }
      } catch (err) {
        set.delete(res);
      }
    }
  }
}

module.exports = new RoomManager();

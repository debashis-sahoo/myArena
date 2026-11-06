import crypto from 'node:crypto';
import { ROOM_ID_ALPHABET, ROOM_ID_LENGTH, getGame, type GuestInfo, type RoomMode } from '@myarena/shared';
import { config } from '../config.js';
import { Room, RoomError, type RoomEvents } from './room.js';

export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly events: RoomEvents;

  constructor(events: RoomEvents) {
    // Closed rooms leave the store immediately so their links answer ROOM_NOT_FOUND (FR-024).
    this.events = {
      stateChanged: (room) => events.stateChanged(room),
      chat: (room, message) => events.chat(room, message),
      gameEvent: (room, event) => events.gameEvent(room, event),
      gameEventTo: (room, socketId, event) => events.gameEventTo(room, socketId, event),
      removedInactive: (room, socketId) => events.removedInactive(room, socketId),
      closed: (room, reason) => {
        this.rooms.delete(room.roomId);
        events.closed(room, reason);
      },
    };
  }

  get size(): number {
    return this.rooms.size;
  }

  get(gameId: string, roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    return room && room.game.id === gameId ? room : undefined;
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }

  create(
    gameId: string,
    mode: RoomMode,
    botCount: number | undefined,
    capacityRequest: number | undefined,
    guest: GuestInfo,
    socketId: string,
  ): { room: Room; playerId: string } {
    const game = getGame(gameId);
    if (!game || game.status !== 'active') throw new RoomError('GAME_UNAVAILABLE', 'That game is not available yet.');
    if (this.rooms.size >= config.maxRooms) {
      throw new RoomError('SERVER_BUSY', 'The arena is busy right now. Please try again soon.');
    }

    // Roster games take their player ceiling from the operator setting for that game (HOUSIE_MAX_PLAYERS, BINGO_MAX_PLAYERS).
    const maxPlayers = game.roster ? (config.rosterMaxPlayers[game.id] ?? game.maxPlayers) : game.maxPlayers;
    let capacity = game.defaultCapacity;
    let bots = 0;
    if (mode === 'ai') {
      if (!game.supportsAi) throw new RoomError('GAME_UNAVAILABLE', 'This game has no AI opponents yet.');
      bots = botCount ?? game.maxPlayers - 1;
      if (!Number.isInteger(bots) || bots < 1 || bots > game.maxPlayers - 1) {
        throw new RoomError('INVALID_PAYLOAD', `Choose 1 to ${game.maxPlayers - 1} opponents.`);
      }
      capacity = bots + 1;
    } else if (capacityRequest !== undefined) {
      if (!Number.isInteger(capacityRequest) || capacityRequest < game.minPlayers || capacityRequest > maxPlayers) {
        throw new RoomError('INVALID_PAYLOAD', `Choose between ${game.minPlayers} and ${maxPlayers} players.`);
      }
      capacity = capacityRequest;
    }

    const room = new Room(this.newRoomId(), game, mode, capacity, this.events, {
      reconnectWindowMs: config.reconnectWindowMs,
      removalCooldownMs: config.removalCooldownMs,
      maxPlayers,
    });
    const playerId = room.seedCreator(guest, socketId, bots);
    if (mode === 'ai' && game.launch?.startAiAtOnce) room.startNow();
    this.rooms.set(room.roomId, room);
    return { room, playerId };
  }

  private newRoomId(): string {
    for (let attempt = 0; attempt < 20; attempt++) {
      let id = '';
      for (let i = 0; i < ROOM_ID_LENGTH; i++) id += ROOM_ID_ALPHABET[crypto.randomInt(0, ROOM_ID_ALPHABET.length)];
      if (!this.rooms.has(id)) return id;
    }
    throw new RoomError('SERVER_BUSY', 'Could not allocate a room. Please try again.');
  }
}

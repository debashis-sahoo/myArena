import type { Server, Socket } from 'socket.io';
import type { ZodTypeAny, infer as zInfer } from 'zod';
import {
  CHAT_BURST,
  CHAT_REFILL_PER_SEC,
  EVENTS,
  invitePathFor,
  normalizeRoomCode,
  type Ack,
  type ChatMessage,
  type JoinedData,
  type LudoState,
} from '@myarena/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { Room, RoomError, type RoomEvents } from '../rooms/room.js';
import { RoomStore } from '../rooms/roomStore.js';
import { KeyedLimiter, TokenBucket, type TakeResult } from './rateLimit.js';
import {
  chatSendSchema,
  createRoomSchema,
  emptySchema,
  gameActionSchema,
  joinRoomSchema,
  kickSchema,
  setCapacitySchema,
} from './schemas.js';

interface SocketData {
  gameId?: string;
  roomId?: string;
  joinBucket?: TokenBucket;
  chatBucket?: TokenBucket;
  actionBucket?: TokenBucket;
}

function dataOf(socket: Socket): SocketData {
  return socket.data as SocketData;
}

/** Client IP for rate limiting. First forwarded entry is used; spoofing only weakens an anti-abuse limit. */
function clientIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || socket.handshake.address;
}

function enforce(result: TakeResult, message: string): void {
  if (!result.ok) throw new RoomError('RATE_LIMITED', message, result.retryAfterMs);
}

/** Builds the room store (events fan out through Socket.IO) and registers all socket handlers. */
export function createRealtime(io: Server): { store: RoomStore } {
  const events: RoomEvents = {
    stateChanged: (room) => {
      io.to(room.roomId).emit(EVENTS.ROOM_STATE, room.projection());
    },
    chat: (room, message) => {
      io.to(room.roomId).emit(EVENTS.CHAT_MESSAGE, message);
    },
    closed: (room, reason) => {
      logger.info({ roomId: room.roomId, gameId: room.game.id, reason }, 'room closed');
      io.to(room.roomId).emit(EVENTS.ROOM_CLOSED, { reason });
      io.in(room.roomId).socketsLeave(room.roomId);
    },
    gameEvent: (room, event) => {
      io.to(room.roomId).emit(EVENTS.GAME_EVENT, event);
    },
    removedInactive: (_room, socketId) => {
      const target = io.sockets.sockets.get(socketId);
      if (!target) return;
      detach(target);
      target.emit(EVENTS.PLAYER_REMOVED, { cooldownMs: 0, reason: 'inactive' });
    },
  };
  const store = new RoomStore(events);

  const createLimiter = new KeyedLimiter(5, 1 / 6);
  const joinLimiter = new KeyedLimiter(20, 2);

  function roomOf(socket: Socket): Room {
    const { gameId, roomId } = dataOf(socket);
    const room = gameId && roomId ? store.get(gameId, roomId) : undefined;
    if (!room) throw new RoomError('NOT_IN_ROOM', 'You are not in a room.');
    return room;
  }

  function detach(socket: Socket): void {
    const d = dataOf(socket);
    if (d.roomId) void socket.leave(d.roomId);
    d.gameId = undefined;
    d.roomId = undefined;
  }

  function leaveCurrent(socket: Socket): void {
    const { gameId, roomId } = dataOf(socket);
    const room = gameId && roomId ? store.get(gameId, roomId) : undefined;
    detach(socket);
    room?.leave(socket.id);
  }

  function handler<S extends ZodTypeAny>(
    socket: Socket,
    event: string,
    schema: S,
    fn: (payload: zInfer<S>) => unknown,
  ): void {
    socket.on(event, (raw: unknown, ack?: unknown) => {
      const reply = typeof ack === 'function' ? (ack as (res: Ack<unknown>) => void) : () => undefined;
      try {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) throw new RoomError('INVALID_PAYLOAD', 'That request was not valid.');
        reply({ ok: true, data: fn(parsed.data) ?? {} });
      } catch (err) {
        if (err instanceof RoomError) {
          reply({ ok: false, error: { code: err.code, message: err.message, retryAfterMs: err.retryAfterMs } });
        } else {
          logger.error({ err, event }, 'handler failed');
          reply({ ok: false, error: { code: 'INVALID_STATE', message: 'Something went wrong. Please try again.' } });
        }
      }
    });
  }

  function attach(socket: Socket, room: Room): void {
    void socket.join(room.roomId);
    const d = dataOf(socket);
    d.gameId = room.game.id;
    d.roomId = room.roomId;
  }

  io.on('connection', (socket) => {
    const d = dataOf(socket);
    d.joinBucket = new TokenBucket(10, 1);
    d.chatBucket = new TokenBucket(CHAT_BURST, CHAT_REFILL_PER_SEC);
    d.actionBucket = new TokenBucket(10, 5);

    handler(socket, EVENTS.ROOM_CREATE, createRoomSchema, (p) => {
      enforce(createLimiter.take(clientIp(socket)), 'You are creating rooms too quickly.');
      leaveCurrent(socket);
      const { room, playerId } = store.create(p.gameId, p.mode, p.botCount, p.guest, socket.id);
      attach(socket, room);
      logger.info({ roomId: room.roomId, gameId: room.game.id, mode: room.mode, capacity: room.capacity }, 'room created');
      const data: JoinedData = {
        room: room.projection(),
        you: { playerId },
        chat: room.history(),
        invitePath: room.inviteEnabled ? invitePathFor(room.game.id, room.roomId) : null,
        resumed: false,
        game: room.gameView(playerId) as LudoState | undefined,
      };
      return data;
    });

    handler(socket, EVENTS.ROOM_JOIN, joinRoomSchema, (p) => {
      const ip = clientIp(socket);
      enforce(joinLimiter.take(ip), 'Too many join attempts. Please slow down.');
      enforce(d.joinBucket!.take(), 'Too many join attempts. Please slow down.');
      const roomId = normalizeRoomCode(p.roomId);
      const room = store.get(p.gameId, roomId);
      if (!room) throw new RoomError('ROOM_NOT_FOUND', 'We could not find that room.');
      if (d.roomId && d.roomId !== room.roomId) leaveCurrent(socket);

      const result = room.join(p.guest, socket.id);
      if (result.replacedSocketId) {
        const older = io.sockets.sockets.get(result.replacedSocketId);
        if (older && older.id !== socket.id) {
          detach(older);
          older.emit(EVENTS.ROOM_CLOSED, { reason: 'taken_over' });
        }
      }
      attach(socket, room);
      logger.info({ roomId: room.roomId, resumed: result.resumed, seated: room.seatedCount() }, 'room joined');
      const data: JoinedData = {
        room: room.projection(),
        you: { playerId: result.playerId },
        chat: room.history(),
        invitePath: room.inviteEnabled ? invitePathFor(room.game.id, room.roomId) : null,
        resumed: result.resumed,
        game: room.gameView(result.playerId) as LudoState | undefined,
      };
      return data;
    });

    handler(socket, EVENTS.ROOM_LEAVE, emptySchema, () => {
      leaveCurrent(socket);
      return {};
    });

    handler(socket, EVENTS.ROOM_SET_CAPACITY, setCapacitySchema, (p) => {
      const room = roomOf(socket);
      room.setCapacity(socket.id, p.capacity);
      return { room: room.projection() };
    });

    handler(socket, EVENTS.ROOM_KICK, kickSchema, (p) => {
      const room = roomOf(socket);
      const removed = room.kick(socket.id, p.playerId);
      logger.info({ roomId: room.roomId }, 'player removed by host');
      if (removed.socketId) {
        const target = io.sockets.sockets.get(removed.socketId);
        if (target) {
          detach(target);
          target.emit(EVENTS.PLAYER_REMOVED, { cooldownMs: config.removalCooldownMs });
        }
      }
      return {};
    });

    handler(socket, EVENTS.ROOM_START, emptySchema, () => {
      const room = roomOf(socket);
      room.start(socket.id);
      logger.info({ roomId: room.roomId, seated: room.seatedCount() }, 'match started');
      return { room: room.projection() };
    });

    handler(socket, EVENTS.CHAT_SEND, chatSendSchema, (p) => {
      const room = roomOf(socket);
      enforce(d.chatBucket!.take(), 'You are sending messages too quickly.');
      const message: ChatMessage = room.sendChat(socket.id, p.text);
      return { message };
    });

    handler(socket, EVENTS.GAME_ACTION, gameActionSchema, (p) => {
      const room = roomOf(socket);
      enforce(d.actionBucket!.take(), 'You are acting too quickly.');
      room.action(socket.id, p);
      return {};
    });

    socket.on('disconnect', (reason) => {
      const { gameId, roomId } = dataOf(socket);
      const room = gameId && roomId ? store.get(gameId, roomId) : undefined;
      if (room) {
        // A heartbeat timeout means the client stopped answering pings (closed laptop, lost signal).
        if (reason === 'ping timeout') logger.info({ roomId, reason }, 'connection timed out');
        else logger.debug({ roomId, reason }, 'socket disconnected');
        room.disconnect(socket.id);
      }
    });
  });

  return { store };
}

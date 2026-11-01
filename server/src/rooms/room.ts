import crypto from 'node:crypto';
import {
  AVATAR_KEYS,
  DISPLAY_NAME_MAX,
  type ChatMessage,
  type ClosedReason,
  type ErrorCode,
  type GameDefinition,
  type GuestInfo,
  type ParticipantView,
  type RoomMode,
  type RoomState,
  type SystemCode,
} from '@myarena/shared';
import { getEngine, type ActionResult, type GameContext, type GameEngine } from '../games/registry.js';
import { logger } from '../logger.js';
import { ChatBuffer, sanitizeChatText } from './chat.js';

export class RoomError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export interface RoomEvents {
  stateChanged(room: Room): void;
  chat(room: Room, message: ChatMessage): void;
  closed(room: Room, reason: ClosedReason): void;
  /** A game event for everyone in the room. */
  gameEvent(room: Room, event: unknown): void;
  /** A still-connected human was released for inactivity: tell them and detach their socket. */
  removedInactive(room: Room, socketId: string): void;
}

export interface RoomOptions {
  reconnectWindowMs: number;
  removalCooldownMs: number;
}

interface Participant {
  playerId: string;
  kind: 'human' | 'bot';
  displayName: string;
  avatar: string;
  color: string;
  joinSeq: number;
  /** Private reclaim key. Never sent to clients, never logged. */
  guestId: string | null;
  socketId: string | null;
  connection: 'connected' | 'disconnected';
  reconnectTimer: NodeJS.Timeout | null;
}

interface Seat {
  index: number;
  color: string;
  occupant: Participant | null;
}

type Phase = 'lobby' | 'in_progress' | 'closed';

const BOT_NAMES = ['Zippy', 'Blaze', 'Nova', 'Turbo'];

function hashGuest(guestId: string): string {
  return crypto.createHash('sha256').update(guestId).digest('hex');
}

export interface JoinResult {
  participant: ParticipantView;
  playerId: string;
  resumed: boolean;
  /** An older socket for the same guest (second tab) that must be detached. */
  replacedSocketId: string | null;
}

export class Room {
  readonly roomId: string;
  readonly game: GameDefinition;
  readonly mode: RoomMode;
  state: Phase = 'lobby';
  capacity: number;
  hostPlayerId = '';
  rev = 1;
  readonly createdAt = Date.now();
  lastActivityAt = Date.now();

  private seats: Seat[] = [];
  private joinCounter = 0;
  private readonly chat = new ChatBuffer();
  /** hashed guestId -> blockedUntil (ms epoch) */
  private readonly removed = new Map<string, number>();
  private readonly engine: GameEngine;
  private match: unknown = null;
  /** Timers owned by the running match; cleared when the room closes. */
  private readonly matchTimers = new Set<NodeJS.Timeout>();
  private readonly lastSaid = new Map<string, number>();

  constructor(
    roomId: string,
    game: GameDefinition,
    mode: RoomMode,
    capacity: number,
    private readonly events: RoomEvents,
    private readonly options: RoomOptions,
  ) {
    this.roomId = roomId;
    this.game = game;
    this.mode = mode;
    this.capacity = capacity;
    this.engine = getEngine(game.id);
    for (let i = 0; i < capacity; i++) {
      this.seats.push({ index: i, color: game.seatColors[i] ?? 'blue', occupant: null });
    }
  }

  // ---------- creation ----------

  /** Seats the creator as the only host, plus bots for AI rooms. Emits nothing (no sockets yet). */
  seedCreator(guest: GuestInfo, socketId: string, botCount: number): string {
    const creator = this.addParticipant('human', guest.displayName, guest.avatar, guest.guestId, socketId);
    this.hostPlayerId = creator.playerId;
    for (let i = 0; i < botCount; i++) {
      this.addParticipant('bot', BOT_NAMES[i % BOT_NAMES.length] ?? 'Bot', 'robot', null, null);
    }
    this.announce('joined', `${creator.displayName} created the room`);
    return creator.playerId;
  }

  // ---------- queries ----------

  get inviteEnabled(): boolean {
    return this.mode === 'online';
  }

  history(): ChatMessage[] {
    return this.chat.history();
  }

  seatedCount(): number {
    return this.seats.filter((s) => s.occupant).length;
  }

  humans(): Participant[] {
    return this.seats.flatMap((s) => (s.occupant && s.occupant.kind === 'human' ? [s.occupant] : []));
  }

  connectedCount(): number {
    return this.humans().filter((p) => p.connection === 'connected').length;
  }

  projection(): RoomState {
    return {
      roomId: this.roomId,
      gameId: this.game.id,
      mode: this.mode,
      state: this.state === 'closed' ? 'lobby' : this.state,
      capacity: this.capacity,
      minPlayers: this.game.minPlayers,
      maxPlayers: this.game.maxPlayers,
      hostPlayerId: this.hostPlayerId,
      seats: this.seats.map((s) => ({
        index: s.index,
        color: s.color,
        occupant: s.occupant ? this.view(s.occupant) : null,
      })),
      rev: this.rev,
      inviteEnabled: this.inviteEnabled,
    };
  }

  playerIdForSocket(socketId: string): string | undefined {
    return this.findBySocket(socketId)?.playerId;
  }

  // ---------- membership ----------

  join(guest: GuestInfo, socketId: string): JoinResult {
    if (this.state === 'closed') throw new RoomError('ROOM_NOT_FOUND', 'That room is no longer open.');

    const existing = this.findByGuest(guest.guestId);
    if (existing) {
      const replacedSocketId = existing.socketId && existing.socketId !== socketId ? existing.socketId : null;
      const wasDisconnected = existing.connection === 'disconnected';
      this.clearTimer(existing);
      existing.socketId = socketId;
      existing.connection = 'connected';
      if (wasDisconnected) this.announce('reconnected', `${existing.displayName} is back`);
      this.changed();
      return { participant: this.view(existing), playerId: existing.playerId, resumed: true, replacedSocketId };
    }

    if (this.mode === 'ai') throw new RoomError('ROOM_NOT_FOUND', 'That room is no longer open.');

    const blockedUntil = this.removed.get(hashGuest(guest.guestId));
    if (blockedUntil !== undefined) {
      const wait = blockedUntil - Date.now();
      if (wait > 0) {
        throw new RoomError('REMOVED_COOLDOWN', 'The host removed you from this room. Please wait before rejoining.', wait);
      }
      this.removed.delete(hashGuest(guest.guestId));
    }
    if (this.state === 'in_progress') throw new RoomError('MATCH_IN_PROGRESS', 'This match has already started.');
    if (!this.seats.some((s) => !s.occupant)) throw new RoomError('ROOM_FULL', 'This room is full.');

    const participant = this.addParticipant('human', guest.displayName, guest.avatar, guest.guestId, socketId);
    this.announce('joined', `${participant.displayName} joined`);
    this.changed();
    return { participant: this.view(participant), playerId: participant.playerId, resumed: false, replacedSocketId: null };
  }

  /** Socket lost: keep the seat for the reconnect window. */
  disconnect(socketId: string): void {
    const p = this.findBySocket(socketId);
    if (!p || p.kind !== 'human' || p.connection === 'disconnected') return;
    p.connection = 'disconnected';
    p.socketId = null;
    p.reconnectTimer = setTimeout(() => this.releaseSeat(p.playerId, 'timeout'), this.options.reconnectWindowMs);
    this.announce('disconnected', `${p.displayName} lost connection`);
    this.changed();
  }

  leave(socketId: string): void {
    const p = this.findBySocket(socketId);
    if (p) this.releaseSeat(p.playerId, 'left');
  }

  // ---------- host operations ----------

  setCapacity(socketId: string, capacity: number): void {
    this.requireHost(socketId);
    if (this.mode !== 'online' || this.state !== 'lobby') {
      throw new RoomError('INVALID_STATE', 'Capacity can only be changed in an online lobby.');
    }
    if (!Number.isInteger(capacity) || capacity < this.game.minPlayers || capacity > this.game.maxPlayers) {
      throw new RoomError(
        'CAPACITY_OUT_OF_RANGE',
        `Choose between ${this.game.minPlayers} and ${this.game.maxPlayers} players.`,
      );
    }
    if (capacity < this.seatedCount()) {
      throw new RoomError('CAPACITY_BELOW_PLAYERS', 'More players are seated than that. Remove a player first.');
    }
    if (capacity === this.capacity) return;

    if (capacity > this.capacity) {
      for (let i = this.capacity; i < capacity; i++) {
        this.seats.push({ index: i, color: this.game.seatColors[i] ?? 'blue', occupant: null });
      }
    } else {
      // Move occupants of the seats being removed into open lower seats.
      for (let i = this.seats.length - 1; i >= capacity; i--) {
        const seat = this.seats[i];
        if (seat?.occupant) {
          const target = this.seats.find((s) => s.index < capacity && !s.occupant);
          if (target) {
            target.occupant = seat.occupant;
            target.occupant.color = target.color;
            seat.occupant = null;
          }
        }
      }
      this.seats.length = capacity;
    }
    this.capacity = capacity;
    this.announce('capacity_changed', `The host set the room to ${capacity} players`);
    this.changed();
  }

  /** Returns the removed human's socket so the caller can notify and detach it. */
  kick(socketId: string, targetPlayerId: string): { socketId: string | null; displayName: string } {
    const host = this.requireHost(socketId);
    if (this.state !== 'lobby') throw new RoomError('INVALID_STATE', 'Players can only be removed in the lobby.');
    const target = this.humans().find((p) => p.playerId === targetPlayerId);
    if (!target) throw new RoomError('INVALID_STATE', 'That player is not in the room.');
    if (target.playerId === host.playerId) throw new RoomError('INVALID_STATE', 'You cannot remove yourself.');
    const info = { socketId: target.socketId, displayName: target.displayName };
    if (target.guestId) this.removed.set(hashGuest(target.guestId), Date.now() + this.options.removalCooldownMs);
    this.releaseSeat(target.playerId, 'removed');
    return info;
  }

  start(socketId: string): void {
    this.requireHost(socketId);
    if (this.state !== 'lobby') throw new RoomError('INVALID_STATE', 'The match has already started.');
    if (this.seatedCount() < this.game.minPlayers) {
      throw new RoomError('NOT_ENOUGH_PLAYERS', `At least ${this.game.minPlayers} players are needed to start.`);
    }
    this.state = 'in_progress';
    // Slot order: the host first, then the other players by seat order.
    const ordered = this.seats
      .flatMap((s) => (s.occupant ? [{ seat: s, p: s.occupant }] : []))
      .sort((a, b) => Number(b.p.playerId === this.hostPlayerId) - Number(a.p.playerId === this.hostPlayerId) || a.seat.index - b.seat.index);
    const colors = this.engine.assignColors?.(
      ordered.map(({ seat, p }) => ({ playerId: p.playerId, seatIndex: seat.index, kind: p.kind })),
    );
    if (colors) this.applyColors(colors);
    this.match = this.engine.createMatch(
      ordered.map(({ p }) => ({ playerId: p.playerId, displayName: p.displayName, color: p.color, kind: p.kind })),
      this.buildContext(),
    );
    this.announce('match_started', 'The match has started');
    this.changed();
  }

  /** A game intent from a seated player. Rules and turn order are enforced by the engine. */
  action(socketId: string, action: unknown): void {
    const p = this.findBySocket(socketId);
    if (!p) throw new RoomError('NOT_IN_ROOM', 'You are not in this room.');
    if (this.state !== 'in_progress' || this.match === null) {
      throw new RoomError('INVALID_STATE', 'The match has not started.');
    }
    this.lastActivityAt = Date.now();
    const result: ActionResult = this.engine.onAction(this.match, p.playerId, action);
    if (!result.ok) throw new RoomError('INVALID_STATE', result.reason ?? 'That is not allowed right now.');
  }

  /** The game snapshot for a join, create, or resume acknowledgement while a match is running. */
  gameView(playerId: string): unknown {
    if (this.state !== 'in_progress' || this.match === null) return undefined;
    return this.engine.getView(this.match, playerId);
  }

  // ---------- chat ----------

  sendChat(socketId: string, text: string): ChatMessage {
    const p = this.findBySocket(socketId);
    if (!p || p.connection !== 'connected') throw new RoomError('NOT_IN_ROOM', 'You are not in this room.');
    const clean = sanitizeChatText(text);
    if (clean === null) throw new RoomError('INVALID_PAYLOAD', 'Messages must be 1 to 500 characters.');
    const message = this.chat.player(p.playerId, p.displayName, p.color, clean);
    this.lastActivityAt = Date.now();
    this.events.chat(this, message);
    return message;
  }

  // ---------- lifecycle ----------

  close(reason: ClosedReason): void {
    if (this.state === 'closed') return;
    this.state = 'closed';
    for (const s of this.seats) if (s.occupant) this.clearTimer(s.occupant);
    if (this.match !== null) this.engine.dispose(this.match);
    this.match = null;
    for (const t of this.matchTimers) clearTimeout(t);
    this.matchTimers.clear();
    this.events.closed(this, reason);
  }

  // ---------- internals ----------

  private buildContext(): GameContext {
    return {
      schedule: (ms, fn) => {
        const timer = setTimeout(() => {
          this.matchTimers.delete(timer);
          if (this.state === 'closed') return;
          try {
            fn();
          } catch (err) {
            logger.error({ err, roomId: this.roomId }, 'match timer failed');
          }
        }, ms);
        this.matchTimers.add(timer);
        return () => {
          clearTimeout(timer);
          this.matchTimers.delete(timer);
        };
      },
      emit: (event) => {
        this.lastActivityAt = Date.now();
        this.events.gameEvent(this, event);
      },
      say: (playerId, text) => this.say(playerId, text),
      releaseSeat: (playerId, reason) => this.releaseSeat(playerId, reason),
      now: () => Date.now(),
      log: (level, fields, message) => logger[level]({ roomId: this.roomId, ...fields }, message),
    };
  }

  /** Chat as a participant (a bot), at most one message per second each. */
  private say(playerId: string, text: string): void {
    const p = this.seats.find((s) => s.occupant?.playerId === playerId)?.occupant;
    if (!p) return;
    const now = Date.now();
    if (now - (this.lastSaid.get(playerId) ?? 0) < 1000) return;
    const clean = sanitizeChatText(text);
    if (clean === null) return;
    this.lastSaid.set(playerId, now);
    this.events.chat(this, this.chat.player(p.playerId, p.displayName, p.color, clean));
  }

  /** Applies the game's colours to occupied seats; empty seats take whatever colours are left. */
  private applyColors(colors: Record<string, string>): void {
    const used = new Set<string>();
    for (const s of this.seats) {
      const c = s.occupant ? colors[s.occupant.playerId] : undefined;
      if (s.occupant && c) {
        s.occupant.color = c;
        s.color = c;
        used.add(c);
      }
    }
    const spare = this.game.seatColors.filter((c) => !used.has(c));
    for (const s of this.seats) if (!s.occupant) s.color = spare.shift() ?? s.color;
  }

  private releaseSeat(playerId: string, reason: 'left' | 'timeout' | 'removed' | 'inactive'): void {
    const seat = this.seats.find((s) => s.occupant?.playerId === playerId);
    const p = seat?.occupant;
    if (!seat || !p) return;
    this.clearTimer(p);
    const socketId = p.socketId;
    seat.occupant = null;
    const wasHost = this.hostPlayerId === p.playerId;
    const inMatch = this.state === 'in_progress';

    if (reason === 'removed') this.announce('removed', `${p.displayName} was removed by the host`);
    else if (reason === 'inactive') this.announce('seat_released', `${p.displayName} was removed for inactivity`);
    else if (reason === 'timeout' && inMatch) this.announce('seat_released', `${p.displayName}'s seat was released`);
    else this.announce('left', `${p.displayName} left the room`);

    if (reason === 'inactive' && socketId) this.events.removedInactive(this, socketId);

    if (inMatch && this.match !== null) this.engine.onSeatReleased(this.match, p.playerId);

    if (this.humans().length === 0) {
      this.close(this.mode === 'ai' ? 'ai_owner_left' : reason === 'timeout' ? 'all_disconnected' : 'all_left');
      return;
    }
    if (wasHost) this.handOverHost();
    this.changed();
  }

  /** Exactly one host at all times: pick the longest-present human, preferring connected ones. */
  private handOverHost(): void {
    const humans = this.humans().sort((a, b) => a.joinSeq - b.joinSeq);
    const next = humans.find((h) => h.connection === 'connected') ?? humans[0];
    if (!next) return;
    this.hostPlayerId = next.playerId;
    this.announce('host_changed', `${next.displayName} is now the host`);
  }

  private requireHost(socketId: string): Participant {
    const p = this.findBySocket(socketId);
    if (!p) throw new RoomError('NOT_IN_ROOM', 'You are not in this room.');
    if (p.playerId !== this.hostPlayerId) throw new RoomError('NOT_HOST', 'Only the host can do that.');
    return p;
  }

  private addParticipant(
    kind: 'human' | 'bot',
    rawName: string,
    avatar: string,
    guestId: string | null,
    socketId: string | null,
  ): Participant {
    const seat = this.seats.find((s) => !s.occupant);
    if (!seat) throw new RoomError('ROOM_FULL', 'This room is full.');
    const p: Participant = {
      playerId: crypto.randomBytes(5).toString('hex'),
      kind,
      displayName: this.uniqueName(rawName),
      avatar: (AVATAR_KEYS as readonly string[]).includes(avatar) ? avatar : 'fox',
      color: seat.color,
      joinSeq: ++this.joinCounter,
      guestId,
      socketId,
      connection: 'connected',
      reconnectTimer: null,
    };
    seat.occupant = p;
    return p;
  }

  private uniqueName(raw: string): string {
    const taken = new Set(this.seats.flatMap((s) => (s.occupant ? [s.occupant.displayName.toLowerCase()] : [])));
    if (!taken.has(raw.toLowerCase())) return raw;
    for (let n = 2; n < 100; n++) {
      const suffix = ` ${n}`;
      const candidate = raw.slice(0, DISPLAY_NAME_MAX - suffix.length) + suffix;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return raw;
  }

  private findByGuest(guestId: string): Participant | undefined {
    return this.humans().find((p) => p.guestId === guestId);
  }

  private findBySocket(socketId: string): Participant | undefined {
    return this.humans().find((p) => p.socketId === socketId);
  }

  private clearTimer(p: Participant): void {
    if (p.reconnectTimer) clearTimeout(p.reconnectTimer);
    p.reconnectTimer = null;
  }

  private view(p: Participant): ParticipantView {
    return {
      playerId: p.playerId,
      kind: p.kind,
      displayName: p.displayName,
      avatar: p.avatar,
      color: p.color,
      isHost: p.playerId === this.hostPlayerId,
      connection: p.connection,
      joinSeq: p.joinSeq,
    };
  }

  private announce(code: SystemCode, text: string): void {
    this.lastActivityAt = Date.now();
    this.events.chat(this, this.chat.system(code, text));
  }

  private changed(): void {
    this.rev++;
    this.events.stateChanged(this);
  }
}

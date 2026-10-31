import { randomUUID } from 'node:crypto';
import type { Clock, GameAction, JsonValue } from '@myarena/game-sdk';
import type { ClientIntent, RoomEvent, ServerMessage } from '@myarena/protocol';
import { systemClock } from '../config/clock.js';
import { hashToken, issueToken, verifyToken } from '../auth/tokens.js';
import type { Environment } from '../config/env.js';
import { ProblemError } from '../errors.js';
import type { ConnectionIdentity } from './identity.js';
import { MemoryRoomStore } from '../store/memory-room-store.js';
import type { RoomStore } from '../store/room-store.js';
import { disambiguateLabel } from './display-label.js';
import { ActionLog } from './action-log.js';
import { emptyCatalog, type GameCatalog } from './catalog.js';
import { sendChat } from './chat.js';
import { removeMember, selectGame, setReady, updateSettings } from './lobby.js';
import { pickSuccessor, transferHost } from './handoff.js';
import { MatchManager, type MatchLifecycleEvent } from './match.js';
import { ok, type Context, type EventData, type Outcome } from './outcome.js';
import { RecoveryManager } from './recovery.js';
import type { RoomSetup } from './room-setup.js';
import { createInvitation, inviteLink, normalizeInvitationCode } from './invitation.js';
import type { Participant } from './participant.js';
import { lobbyFor, participantView } from './projection.js';
import { DEFAULT_MAX_PARTICIPANTS, type Room } from './room.js';

export interface RoomServiceOptions {
  config: Pick<Environment, 'maxRooms' | 'maxTotalParticipants'> & Partial<Pick<Environment, 'recoveryWindowMs'>>;
  clock?: Clock;
  store?: RoomStore<Room>;
  games?: GameCatalog;
}

export type SeatRelease = 'left' | 'removed' | 'expired';
const GAME_ACTION_DETAILS: Record<string, string> = {
  NOT_IN_MATCH: 'There is no match in progress for you.',
  NO_ACTIONS: 'This game does not take actions.',
};
export const DEFAULT_RECOVERY_WINDOW_MS = 10 * 60 * 1000;

export interface Entry { room: Room; participant: Participant; token: string; }

export class RoomService {
  readonly store: RoomStore<Room>;
  readonly games: GameCatalog;
  // `except` skips one participant, for events already covered by their fresh snapshot.
  publish: (roomId: string, event: RoomEvent, except?: string) => void = () => {};
  onSeatReleased: (roomId: string, participantId: string, reason: SeatRelease) => void = () => {};
  onHostChanged: (roomId: string, hostParticipantId: string) => void = () => {};
  // Delivers one game update; each recipient's own view comes from `gameView`.
  publishGame: (roomId: string, update: { matchId: string; seq: number; events: readonly JsonValue[] }) => void = () => {};
  /** Start and end of each match (game, seat count, duration); the HTTP layer logs it without any player or game content. */
  onMatchLifecycle: (event: MatchLifecycleEvent) => void = () => {};
  onRoomClosed: (roomId: string, participantIds: string[]) => void = () => {};
  private readonly clock: Clock;
  private readonly matches: MatchManager;
  private readonly recovery: RecoveryManager;
  private readonly limits: Pick<Environment, 'maxRooms' | 'maxTotalParticipants'>;
  private accepting = true;

  constructor(options: RoomServiceOptions) {
    this.store = options.store ?? new MemoryRoomStore<Room>();
    this.clock = options.clock ?? systemClock;
    this.games = options.games ?? emptyCatalog;
    this.matches = new MatchManager(this.clock, (roomId, events) => this.publishGameFor(roomId, events), (event) => this.onMatchLifecycle(event));
    this.recovery = new RecoveryManager(this.clock, options.config.recoveryWindowMs ?? DEFAULT_RECOVERY_WINDOW_MS, (roomId, participantId) => this.expire(roomId, participantId));
    this.limits = options.config;
  }

  now(): number { return this.clock.now(); }

  stopAcceptingRooms(): void { this.accepting = false; }

  createRoom(displayName: string, setup: RoomSetup | null = null): Entry {
    if (!this.accepting || this.store.size >= this.limits.maxRooms || this.seatCount() >= this.limits.maxTotalParticipants) {
      throw new ProblemError('SERVICE_AT_CAPACITY');
    }
    const now = this.clock.now();
    const { participant, token } = this.newParticipant(displayName, [], 'HOST', now);
    const defaults = setup ? this.games.get(setup.gameId)?.descriptor.settingsSchema.safeParse({}) : undefined;
    const room: Room = {
      id: randomUUID(), status: 'LOBBY', version: 0, selectedGameId: setup?.gameId ?? null,
      settings: {
        maxParticipants: setup?.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS,
        gameSettings: (defaults?.success ? defaults.data : {}) as Room['settings']['gameSettings'],
      },
      matchStatus: 'NONE', matchId: null, gameSeq: 0, createdAt: now, invitation: this.newInvitation(now),
      participants: [participant], chat: [],
    };
    this.store.set(room);
    return { room, participant, token };
  }

  // A browser that still holds this room's credential but has no seat is never silently re-seated.
  joinRoom(code: string, displayName: string, credential?: (roomId: string) => string | undefined): Entry {
    const room = this.invitedRoom(code);
    const presented = credential?.(room.id);
    if (presented) {
      const existing = room.participants.find((member) => verifyToken(presented, member.tokenHash));
      if (!existing) throw new ProblemError('RECOVERY_EXPIRED');
      return { room, participant: existing, token: this.rotateToken(existing) };
    }
    this.assertSpace(room);
    const labels = room.participants.map((member) => member.displayLabel);
    const { participant, token } = this.newParticipant(displayName, labels, 'PLAYER', this.clock.now());
    room.participants.push(participant);
    this.emit(room, 'participant.joined', { participant: participantView(participant) });
    return { room, participant, token };
  }

  previewInvitation(code: string): void { this.assertSpace(this.invitedRoom(code), false); }

  // Throws RECOVERY_EXPIRED for a credential that no longer holds a seat (expired, removed, or closed room).
  sessionFor(roomId: string, token: string): { room: Room; participant: Participant } {
    const room = this.store.get(roomId);
    const participant = room?.status === 'CLOSED' ? undefined : room?.participants.find((member) => verifyToken(token, member.tokenHash));
    if (!room || !participant) throw new ProblemError('RECOVERY_EXPIRED');
    return { room, participant };
  }

  authenticate(roomId: string, token: string): ConnectionIdentity {
    const { participant } = this.sessionFor(roomId, token);
    return { roomId, participantId: participant.id };
  }

  markDisconnected({ roomId, participantId }: ConnectionIdentity): void {
    const found = this.findParticipant(roomId, participantId);
    if (!found || found.participant.connection === 'DISCONNECTED') return;
    found.participant.connection = 'DISCONNECTED';
    found.participant.disconnectedAt = this.clock.now();
    this.emit(found.room, 'participant.connection', { participantId, connection: 'DISCONNECTED' });
    this.recovery.start(roomId, participantId);
  }

  markConnected({ roomId, participantId }: ConnectionIdentity): void {
    const found = this.findParticipant(roomId, participantId);
    if (!found || found.participant.connection === 'CONNECTED') return;
    found.participant.connection = 'CONNECTED';
    found.participant.disconnectedAt = null;
    this.recovery.clear(participantId);
    this.emit(found.room, 'participant.connection', { participantId, connection: 'CONNECTED' }, participantId);
  }

  // Idempotent: a credential without a seat is a no-op.
  leaveRoom(roomId: string, token: string): void {
    const room = this.store.get(roomId);
    const participant = room?.participants.find((member) => verifyToken(token, member.tokenHash));
    if (room && participant) this.releaseSeat(room, participant, 'left');
  }

  snapshotFor(identity: ConnectionIdentity): ServerMessage | undefined {
    const room = this.store.get(identity.roomId);
    const participant = room?.participants.find((member) => member.id === identity.participantId);
    if (!room || !participant) return undefined;
    const lobby = lobbyFor(room, participant);
    const state = room.matchId ? this.gameView(room.id, participant.id) : null;
    return {
      v: 1, type: 'snapshot', version: room.version, lobby, self: lobby.self,
      game: state === null || !room.matchId ? null : { matchId: room.matchId, seq: room.gameSeq, state },
    };
  }

  /** One member's projection of the running or just-ended match, or null when the game has none. */
  gameView(roomId: string, participantId: string): JsonValue | null {
    const room = this.store.get(roomId);
    if (!room || room.matchStatus === 'NONE' || !room.selectedGameId) return null;
    return this.games.get(room.selectedGameId)?.viewFor?.(roomId, participantId) ?? null;
  }

  private publishGameFor(roomId: string, events: readonly JsonValue[]): void {
    const room = this.store.get(roomId);
    if (!room || !room.matchId) return;
    room.gameSeq += 1;
    this.publishGame(roomId, { matchId: room.matchId, seq: room.gameSeq, events });
  }

  findParticipant(roomId: string, participantId: string): { room: Room; participant: Participant } | undefined {
    const room = this.store.get(roomId);
    const participant = room?.participants.find((member) => member.id === participantId);
    return room && participant ? { room, participant } : undefined;
  }

  entryResult(room: Room, participant: Participant) {
    return {
      roomId: room.id, participantId: participant.id, role: participant.role,
      ...(participant.role === 'HOST' ? { invitation: { code: room.invitation.code, link: inviteLink(room.invitation.code) } } : {}),
    };
  }

  rotateToken(participant: Participant): string {
    const token = issueToken();
    participant.tokenHash = hashToken(token);
    return token;
  }

  private invitedRoom(code: string): Room {
    const room = this.store.byInvitation(normalizeInvitationCode(code));
    if (!room || room.status === 'CLOSED') throw new ProblemError('INVITATION_UNAVAILABLE');
    return room;
  }

  private assertSpace(room: Room, includeService = true): void {
    if (room.participants.length >= room.settings.maxParticipants) throw new ProblemError('ROOM_FULL');
    if (includeService && this.seatCount() >= this.limits.maxTotalParticipants) throw new ProblemError('SERVICE_AT_CAPACITY');
  }

  private releaseSeat(room: Room, participant: Participant, reason: SeatRelease): void {
    const wasHost = participant.role === 'HOST';
    this.recovery.clear(participant.id);
    room.participants.splice(room.participants.indexOf(participant), 1);
    this.emit(room, reason === 'removed' ? 'participant.removed' : 'participant.left', { participantId: participant.id });
    this.onSeatReleased(room.id, participant.id, reason);
    this.matches.participantLeft(room, participant.id, reason, this.games);
    if (room.participants.length === 0) this.closeRoom(room);
    else if (wasHost) this.handOffHost(room, participant.id);
  }

  private handOffHost(room: Room, previousHostId: string): void {
    const successor = pickSuccessor(room.participants);
    if (!successor) { this.closeRoom(room); return; }
    successor.role = 'HOST';
    this.emit(room, 'host.changed', { hostParticipantId: successor.id, previousHostParticipantId: previousHostId });
    this.onHostChanged(room.id, successor.id);
  }

  // Deletes the room, its chat, members, invitation and recovery timers; nothing stays retrievable.
  closeRoom(room: Room): void {
    if (room.status === 'CLOSED') return;
    this.matches.abort(room, this.games);
    const memberIds = room.participants.map((member) => member.id);
    this.emit(room, 'room.closed', {});
    room.status = 'CLOSED';
    room.invitation.status = 'REVOKED';
    room.chat = [];
    room.participants = [];
    for (const id of memberIds) this.recovery.clear(id);
    this.store.delete(room.id);
    this.onRoomClosed(room.id, memberIds);
  }

  submitGameAction(roomId: string, participantId: string, action: GameAction) {
    const room = this.store.get(roomId);
    if (!room) return { accepted: false, reason: 'NOT_IN_MATCH' } as const;
    return this.matches.submitAction(room, participantId, action, this.games);
  }

  private expire(roomId: string, participantId: string): void {
    const found = this.findParticipant(roomId, participantId);
    if (found?.participant.connection === 'DISCONNECTED') this.releaseSeat(found.room, found.participant, 'expired');
  }

  private newInvitation(now: number) {
    for (;;) {
      const invitation = createInvitation(now);
      if (!this.store.byInvitation(invitation.code)) return invitation;
    }
  }

  private newParticipant(displayName: string, labels: readonly string[], role: Participant['role'], now: number) {
    const token = issueToken();
    const participant: Participant = {
      id: randomUUID(), displayName, displayLabel: disambiguateLabel(displayName, labels), role,
      ready: false, connection: 'CONNECTED', joinedAt: now, disconnectedAt: null,
      actionLog: new ActionLog(), tokenHash: hashToken(token),
    };
    return { participant, token };
  }

  private seatCount(): number {
    let seats = 0;
    for (const room of this.store.values()) seats += room.participants.length;
    return seats;
  }

  perform(room: Room, actor: Participant, intent: ClientIntent): Outcome {
    const ctx = this.contextFor(room, actor);
    switch (intent.type) {
      case 'ready.set': return setReady(ctx, intent.ready);
      case 'chat.send': return sendChat(ctx, intent.text);
      case 'game.select': return selectGame(ctx, intent.gameId);
      case 'settings.update': return updateSettings(ctx, intent.changes);
      case 'match.start': return this.matches.start(ctx, 'match.started');
      case 'match.rematch': return this.matches.start(ctx, 'match.rematch');
      case 'match.returnToLobby': return this.matches.returnToLobby(ctx);
      case 'invite.regenerate': return this.regenerateInvitation(ctx);
      case 'member.remove': {
        const target = room.participants.find((member) => member.id === intent.targetParticipantId);
        const outcome = removeMember(ctx, intent.targetParticipantId);
        if (outcome.ok && target) {
          this.recovery.clear(target.id);
          this.onSeatReleased(room.id, target.id, 'removed');
          this.matches.participantLeft(room, target.id, 'removed', this.games);
        }
        return outcome;
      }
      case 'resync':
      case 'ping': return ok;
      case 'host.transfer': {
        const outcome = transferHost(ctx, intent.targetParticipantId);
        if (outcome.ok) this.onHostChanged(room.id, intent.targetParticipantId);
        return outcome;
      }
      case 'room.close': return { ok: true, after: () => this.closeRoom(room) };
      case 'game.action': return this.gameAction(room, actor, intent.action);
    }
  }

  private gameAction(room: Room, actor: Participant, action: GameAction): Outcome {
    const result = this.matches.submitAction(room, actor.id, action, this.games);
    if (result.accepted) return ok;
    const detail = result.detail ?? GAME_ACTION_DETAILS[result.reason];
    return { ok: false, code: 'GAME_ACTION_REJECTED', ...(detail ? { detail } : {}), ...(result.nextStep ? { nextStep: result.nextStep } : {}) };
  }

  private regenerateInvitation({ room, now, emit }: Context): Outcome {
    room.invitation = this.newInvitation(now);
    emit('invite.regenerated', { invitation: { code: room.invitation.code, link: inviteLink(room.invitation.code) } });
    return ok;
  }

  private contextFor(room: Room, actor: Participant): Context {
    return {
      room, actor, now: this.clock.now(), games: this.games,
      emit: <Kind extends RoomEvent['kind']>(kind: Kind, data: EventData<Kind>) => this.emit(room, kind, data),
    };
  }

  private emit(room: Room, kind: RoomEvent['kind'], data: RoomEvent['data'], except?: string): void {
    room.version += 1;
    this.publish(room.id, { v: 1, type: 'event', version: room.version, kind, data } as RoomEvent, except);
  }
}

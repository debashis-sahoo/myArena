import type { LobbyView, RoomEvent, ServerMessage } from '@myarena/protocol';

export interface GameState { matchId: string; seq: number; state: unknown; events: readonly unknown[]; }
export interface RoomState { lobby: LobbyView | null; version: number; needsResync: boolean; game: GameState | null; }
export const initialRoomState: RoomState = { lobby: null, version: 0, needsResync: false, game: null };

function applyEvent(lobby: LobbyView, event: RoomEvent): LobbyView {
  switch (event.kind) {
    case 'participant.joined': return { ...lobby, participants: [...lobby.participants, event.data.participant] };
    case 'participant.left':
    case 'participant.removed': return { ...lobby, participants: lobby.participants.filter((participant) => participant.id !== event.data.participantId) };
    case 'participant.connection': return { ...lobby, participants: lobby.participants.map((participant) => participant.id === event.data.participantId ? { ...participant, connection: event.data.connection } : participant) };
    case 'participant.ready': return { ...lobby, participants: lobby.participants.map((participant) => participant.id === event.data.participantId ? { ...participant, ready: event.data.ready } : participant) };
    case 'chat.message': return { ...lobby, chat: [...lobby.chat, event.data.message].slice(-200) };
    case 'game.selected': return { ...lobby, selectedGameId: event.data.gameId, settings: event.data.settings };
    case 'settings.updated': return { ...lobby, settings: event.data.settings };
    case 'match.started':
    case 'match.rematch': return { ...lobby, status: 'IN_MATCH', matchStatus: 'IN_PROGRESS' };
    case 'match.ended': return { ...lobby, matchStatus: 'ENDED' };
    case 'match.returnedToLobby': return { ...lobby, status: 'LOBBY', matchStatus: 'NONE' };
    case 'invite.regenerated': return lobby.self.role === 'HOST' && event.data.invitation ? { ...lobby, invitation: event.data.invitation } : lobby;
    case 'host.changed': {
      const publicLobby = { ...lobby };
      delete publicLobby.invitation;
      return { ...publicLobby, self: { ...lobby.self, role: lobby.self.id === event.data.hostParticipantId ? 'HOST' : 'PLAYER' }, participants: lobby.participants.map((participant) => ({ ...participant, role: participant.id === event.data.hostParticipantId ? 'HOST' : 'PLAYER' })) };
    }
    case 'room.closed': {
      const publicLobby = { ...lobby };
      delete publicLobby.invitation;
      return { ...publicLobby, status: 'CLOSED', chat: [], participants: [] };
    }
  }
}

export function reduceRoomMessage(state: RoomState, message: ServerMessage): RoomState {
  if (message.type === 'snapshot') {
    if (message.version < state.version) return state;
    const fromSnapshot: GameState | null = message.game ? { matchId: message.game.matchId, seq: message.game.seq, state: message.game.state, events: [] } : null;
    const newer = state.game && fromSnapshot && state.game.matchId === fromSnapshot.matchId && state.game.seq > fromSnapshot.seq;
    return { lobby: message.lobby, version: message.version, needsResync: false, game: newer ? state.game : fromSnapshot };
  }
  if (message.type === 'game') {
    if (state.game && state.game.matchId === message.matchId && message.seq <= state.game.seq) return state;
    return { ...state, game: { matchId: message.matchId, seq: message.seq, state: message.state, events: message.events } };
  }
  if (message.type !== 'event' || message.version <= state.version) return state;
  if (!state.lobby || state.needsResync || message.version !== state.version + 1) return { ...state, needsResync: true };
  const resetsGame = message.kind === 'match.started' || message.kind === 'match.rematch' || message.kind === 'match.returnedToLobby';
  return { lobby: { ...applyEvent(state.lobby, message), version: message.version }, version: message.version, needsResync: false, game: resetsGame ? null : state.game };
}
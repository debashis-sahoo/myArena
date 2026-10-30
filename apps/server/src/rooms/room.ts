import type { ChatMessage, RoomSettings } from '@myarena/protocol';
import type { StoredRoom } from '../store/room-store.js';
import type { Invitation } from './invitation.js';
import type { Participant } from './participant.js';

export const DEFAULT_MAX_PARTICIPANTS = 100;

export interface Room extends StoredRoom {
  id: string;
  status: 'LOBBY' | 'IN_MATCH' | 'CLOSED';
  version: number;
  selectedGameId: string | null;
  settings: RoomSettings;
  matchStatus: 'NONE' | 'IN_PROGRESS' | 'ENDED';
  createdAt: number;
  invitation: Invitation;
  participants: Participant[];
  chat: ChatMessage[];
}

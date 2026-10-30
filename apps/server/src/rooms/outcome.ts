import type { RejectionCode, RoomEvent } from '@myarena/protocol';
import type { GameCatalog } from './catalog.js';
import type { Participant } from './participant.js';
import type { Room } from './room.js';

export type Outcome = { ok: true; after?: () => void } | { ok: false; code: RejectionCode };
export const ok: Outcome = { ok: true };
export const reject = (code: RejectionCode): Outcome => ({ ok: false, code });

export type EventData<Kind extends RoomEvent['kind']> = Extract<RoomEvent, { kind: Kind }>['data'];
export type Emit = <Kind extends RoomEvent['kind']>(kind: Kind, data: EventData<Kind>) => void;

export interface Context { room: Room; actor: Participant; now: number; emit: Emit; games: GameCatalog; }

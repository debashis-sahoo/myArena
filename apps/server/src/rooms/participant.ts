import type { RoomRole } from '@myarena/protocol';
import type { ActionLog } from './action-log.js';

export interface Participant {
  id: string;
  displayName: string;
  displayLabel: string;
  role: RoomRole;
  ready: boolean;
  connection: 'CONNECTED' | 'DISCONNECTED';
  joinedAt: number;
  disconnectedAt: number | null;
  actionLog: ActionLog;
  tokenHash: Buffer;
}

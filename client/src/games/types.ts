import type { RoomState } from '@myarena/shared';

/** Client half of the platform-to-game contract (specs/001-platform-hub-rooms/contracts/game-module.md). */
export interface GameBoardProps {
  room: RoomState;
  you: { playerId: string; color: string; isHost: boolean };
  matchState: 'lobby' | 'in_progress';
  /** Largest available square for the board, in CSS pixels. Updates on resize and rotation. */
  stageSize: number;
  /** Sends a game:action intent (never an outcome). */
  send: (action: unknown) => void;
  reducedMotion: boolean;
}

import type { GameDescriptor } from './descriptor.js';

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface MatchContext {
  roomId: string;
  participantIds: readonly string[];
  settings: Readonly<Record<string, unknown>>;
  clock: Clock;
  endMatch(): void;
}

export interface GameAction { type: string; payload?: unknown; }
export type ActionResult = { accepted: true } | { accepted: false; reason: string };

export interface GameLifecycle {
  descriptor: GameDescriptor;
  onMatchStart(context: MatchContext): void;
  onMatchEnd(roomId: string): void;
  // Every participant, host included, is judged by the same game rules here.
  onAction?(roomId: string, participantId: string, action: GameAction): ActionResult;
}
import type { GameDescriptor } from './descriptor.js';

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface MatchContext {
  roomId: string;
  participantIds: readonly string[];
  /** Seated members at match start, in the order they joined the room. */
  participants: readonly { id: string; label: string }[];
  settings: Readonly<Record<string, unknown>>;
  clock: Clock;
  endMatch(): void;
  /** Sends every connected member their own view of the game now; `events` only drive animation and announcements. */
  publish(events?: readonly JsonValue[]): void;
}

export interface GameAction { type: string; payload?: unknown; }
export type ActionResult =
  | { accepted: true }
  | { accepted: false; reason: string; detail?: string; nextStep?: string };

export type SeatReleaseReason = 'left' | 'removed' | 'expired';

export interface GameLifecycle {
  descriptor: GameDescriptor;
  onMatchStart(context: MatchContext): void;
  /** The match is over: stop timers. The final state stays available to `viewFor` until `releaseMatch`. */
  onMatchEnd(roomId: string): void;
  // Every participant, host included, is judged by the same game rules here.
  onAction?(roomId: string, participantId: string, action: GameAction): ActionResult;
  /** One member's projection of the game, or null for none. This is the only place state becomes visible. */
  viewFor?(roomId: string, participantId: string): JsonValue | null;
  /** A seat was released while the match was in progress. */
  onParticipantLeft?(roomId: string, participantId: string, reason: SeatReleaseReason): void;
  /** Free the finished match's state: back in the lobby, replaced by a rematch, or the room closed. */
  releaseMatch?(roomId: string): void;
}
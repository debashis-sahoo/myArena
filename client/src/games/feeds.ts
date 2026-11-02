/** Per-game client feeds: a game that keeps its own client state registers one so the platform room store can forward its snapshots and events. */
export interface GameFeed {
  /** Forget all match state (left the room, room ended, or the match was reset to the lobby). */
  reset(): void;
  /** The receiver's full game view from a create, join or resume acknowledgement. */
  onSnapshot(view: unknown): void;
  /** One game:event payload (public or private). */
  onEvent(event: unknown): void;
}

const feeds = new Map<string, GameFeed>();

export function registerGameFeed(gameId: string, feed: GameFeed): void {
  feeds.set(gameId, feed);
}

export function getGameFeed(gameId: string | undefined): GameFeed | undefined {
  return gameId ? feeds.get(gameId) : undefined;
}

export function resetGameFeeds(): void {
  feeds.forEach((f) => f.reset());
}

import type { ActionResult, GameContext, GameEngine, MatchSeat } from './registry.js';

interface PlaceholderMatch {
  seats: MatchSeat[];
  released: string[];
}

/** Platform-only engine: starts a match, ignores actions. Real game rules arrive in later features. */
export function placeholderEngine(id: string): GameEngine {
  return {
    id,
    createMatch(seats: MatchSeat[], _ctx?: GameContext): PlaceholderMatch {
      return { seats: seats.map((s) => ({ ...s })), released: [] };
    },
    getView(match: unknown): unknown {
      return match;
    },
    onAction(): ActionResult {
      return { ok: false, reason: 'No game rules are available yet.' };
    },
    onSeatReleased(match: unknown, playerId: string): void {
      (match as PlaceholderMatch).released.push(playerId);
    },
    onBotTurn(): void {
      /* bots do nothing until a game defines their behaviour */
    },
    dispose(): void {
      /* nothing to clean up */
    },
  };
}

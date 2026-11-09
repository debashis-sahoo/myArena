import type { LudoState } from '@myarena/shared';
import { playerOf, chooseAutoPawn } from './rules.js';

export { chooseAutoPawn };

/** Priority list lives in rules.ts (shared with countdown auto-play). */
export function chooseBotPawn(state: LudoState, playerId: string, roll: number, eligible: number[]): number {
  return playerOf(state, playerId) ? chooseAutoPawn(state, playerId, roll, eligible) : (eligible[0] as number);
}

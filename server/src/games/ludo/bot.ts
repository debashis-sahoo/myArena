import type { LudoState } from '@myarena/shared';
import { playerOf, chooseAutoPawn } from './rules.js';

export { chooseAutoPawn };

/** Priority list lives in rules.ts (shared with countdown auto-play); this module adds bot-only chat commentary. */
export function chooseBotPawn(state: LudoState, playerId: string, roll: number, eligible: number[]): number {
  return playerOf(state, playerId) ? chooseAutoPawn(state, playerId, roll, eligible) : (eligible[0] as number);
}

const PHRASES = {
  six: [
    '{n} rolled a 6!',
    'A six for {n}!',
    '{n} got a 6. Roll again!',
    'Lucky six, says {n}.',
    '{n} is on fire with a 6!',
    'Boom, 6 for {n}!',
  ],
  capture: [
    '{n} captured {v}\u2019s pawn!',
    'Sorry {v}, {n} sent you home!',
    '{n} bumped {v} back to the base!',
    'Gotcha, {v}! \u2014 {n}',
    '{n} sent {v}\u2019s pawn packing!',
    'Back you go, {v}! \u2014 {n}',
  ],
  home: [
    '{n} got a pawn home!',
    'Home safe for {n}!',
    '{n} brings one pawn home.',
    'One more home for {n}!',
    'Safe and sound: {n} scores a pawn.',
    '{n} reaches HOME!',
  ],
  win: [
    '{n} wins the match!',
    'All four home. {n} takes the trophy!',
    'That\u2019s the game \u2014 {n} wins!',
    '{n} is the champion!',
    'GG! {n} finished first.',
    'Victory for {n}!',
  ],
  skip: [
    '{n} has no move this time.',
    'No luck for {n}.',
    '{n} has to pass.',
    'Nothing to move for {n}.',
    '{n} skips this one.',
    'Hmm, no move for {n}.',
  ],
} as const;

export type Phrase = keyof typeof PHRASES;

export function phrase(kind: Phrase, names: { n: string; v?: string }): string {
  const pool = PHRASES[kind];
  const pick = pool[Math.floor(Math.random() * pool.length)] as string;
  return pick.replace('{n}', names.n).replace('{v}', names.v ?? 'you');
}

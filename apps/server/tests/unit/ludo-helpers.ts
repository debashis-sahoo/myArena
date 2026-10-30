import type { MatchContext } from '@myarena/game-sdk';
import type { LudoView, MatchState } from '@myarena/ludo';
import { scriptedDice, type DiceSource } from '../../src/games/ludo/dice.js';
import { MatchRunner } from '../../src/games/ludo/match-runner.js';
import { TestClock } from '../integration/helpers.js';

const NAMES = ['Host', 'Alex', 'Sam', 'Pat'];
const idOf = (index: number) => `p-${index}`;

// A runner wired to a fake clock and a scripted die, with a log of everything it publishes.
export function setup(options: { players?: number; values?: number[]; first?: number } = {}) {
  const players = options.players ?? 4;
  const clock = new TestClock();
  const published: unknown[][] = [];
  const ended: number[] = [];
  const context: MatchContext = {
    roomId: 'room', participantIds: Array.from({ length: players }, (_, index) => idOf(index)),
    participants: Array.from({ length: players }, (_, index) => ({ id: idOf(index), label: NAMES[index]! })),
    settings: {}, clock, endMatch: () => { ended.push(clock.now()); }, publish: (events = []) => { published.push([...events]); },
  };
  const scripted = scriptedDice(options.values ?? [6]);
  const dice: DiceSource = { ...scripted, firstSeat: () => options.first ?? 0 };
  const runner = new MatchRunner(context, { theme: 'classic', turnLimitSeconds: 60 }, dice);
  runner.start();
  const view = (index: number) => runner.view(idOf(index)) as unknown as LudoView;
  const matchView = (index: number) => { const result = view(index); if (result.kind !== 'MATCH') throw new Error('Expected a match view.'); return result; };
  const state = () => (runner as unknown as { state: MatchState }).state;
  return { runner, clock, published, ended, view, matchView, state, idOf };
}

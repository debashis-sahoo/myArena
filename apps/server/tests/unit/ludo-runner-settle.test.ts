import { describe, expect, it } from 'vitest';
import { setup } from './ludo-helpers.js';

const roll = { type: 'roll' };
const moveOf = (pawn: number) => ({ type: 'move', payload: { pawn } });
const kinds = (events: unknown[]) => events.map((event) => (event as { kind: string }).kind);

describe('the settle window after a roll', () => {
  it('refuses a move with DIE_STILL_ROLLING until 2400 ms have passed', () => {
    const { runner, clock, idOf: id } = setup({ values: [6] });
    runner.act(id(0), roll);
    expect(runner.act(id(0), moveOf(0))).toMatchObject({ accepted: false, reason: 'DIE_STILL_ROLLING', detail: 'The die is still rolling.' });
    clock.advance(2399);
    expect(runner.act(id(0), moveOf(0))).toMatchObject({ accepted: false, reason: 'DIE_STILL_ROLLING' });
    clock.advance(1);
    expect(runner.act(id(0), moveOf(0))).toEqual({ accepted: true });
  });

  it('reports the time left in the view and counts it down to zero', () => {
    const { runner, clock, matchView, idOf: id } = setup({ values: [6] });
    expect(matchView(1).turn.settleMsLeft).toBe(0);
    runner.act(id(0), roll);
    expect(matchView(1).turn.settleMsLeft).toBe(2400);
    clock.advance(900);
    expect(matchView(1).turn.settleMsLeft).toBe(1500);
    clock.advance(1500);
    expect(matchView(1).turn.settleMsLeft).toBe(0);
  });

  it('keeps the decided number in the view while the die is rolling', () => {
    const { runner, matchView, idOf: id } = setup({ values: [4] });
    runner.act(id(0), roll);
    expect(matchView(2).turn).toMatchObject({ phase: 'MOVE', dice: 4 });
  });

  it('passes the turn after a roll with no legal move only once it settled and the result was shown', () => {
    const { runner, clock, published, matchView, idOf: id } = setup({ values: [3] });
    runner.act(id(0), roll);
    expect(kinds(published.at(-1)!)).toEqual(['ROLLED']);
    clock.advance(2400 + 1199);
    expect(matchView(0).turn).toMatchObject({ seat: 0, phase: 'MOVE' });
    clock.advance(1);
    expect(matchView(0).turn).toMatchObject({ seat: 1, phase: 'ROLL', dice: null });
    expect(kinds(published.at(-1)!)).toEqual(['NO_MOVE', 'TURN']);
  });

  it('gives an extra roll after a 6 that cannot be used', () => {
    const { runner, clock, state, matchView, idOf: id } = setup({ values: [6] });
    state().seats[0]!.pawns = [56, 56, 56, 55];
    runner.act(id(0), roll);
    clock.advance(2400 + 1200);
    expect(matchView(0).turn).toMatchObject({ seat: 0, phase: 'ROLL' });
  });

  it('does nothing further after the runner is stopped', () => {
    const { runner, clock, published, idOf: id } = setup({ values: [3] });
    runner.act(id(0), roll);
    const before = published.length;
    runner.stop();
    clock.advance(10_000);
    expect(published).toHaveLength(before);
  });
});

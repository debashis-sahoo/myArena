import { describe, expect, it } from 'vitest';
import { cryptoDice } from '../../src/games/ludo/dice.js';
import { setup } from './ludo-helpers.js';

const roll = { type: 'roll' };
const moveOf = (pawn: number) => ({ type: 'move', payload: { pawn } });

describe('Ludo match runner', () => {
  it('gives colours in join order and starts with the seat the dice source chooses', () => {
    const { matchView, published } = setup({ first: 2 });
    const view = matchView(0);
    expect(view.seats.map((seat) => [seat.label, seat.color])).toEqual([['Host', 'RED'], ['Alex', 'GREEN'], ['Sam', 'YELLOW'], ['Pat', 'BLUE']]);
    expect(view.turn).toMatchObject({ seat: 2, phase: 'ROLL' });
    expect(published[0]).toEqual([{ kind: 'TURN', seat: 2 }]);
  });

  it('uses the two-player colours Red and Yellow', () => {
    const { matchView } = setup({ players: 2 });
    expect(matchView(0).seats.map((seat) => seat.color)).toEqual(['RED', 'YELLOW']);
  });

  it('accepts a roll only from the seat whose turn it is, once', () => {
    const { runner, idOf: id } = setup();
    expect(runner.act(id(1), roll)).toMatchObject({ accepted: false, reason: 'NOT_YOUR_TURN' });
    expect(runner.act(id(0), roll)).toEqual({ accepted: true });
    expect(runner.act(id(0), roll)).toMatchObject({ accepted: false, reason: 'ALREADY_ROLLED' });
  });

  it('publishes the roll with the decided value, a seed and the animation length', () => {
    const { runner, published, idOf: id } = setup({ values: [6] });
    runner.act(id(0), roll);
    const event = published.at(-1)![0] as { kind: string; seat: number; value: number; seed: number; durationMs: number };
    expect(event).toMatchObject({ kind: 'ROLLED', seat: 0, value: 6, durationMs: 2400 });
    expect(Number.isInteger(event.seed)).toBe(true);
    expect(event.seed).toBeGreaterThanOrEqual(0);
    expect(event.seed).toBeLessThan(2 ** 32);
  });

  it('moves only pawns the game offers, after the die has settled', () => {
    const { runner, clock, matchView, idOf: id } = setup({ values: [6, 3] });
    runner.act(id(0), roll);
    clock.advance(2400);
    expect(runner.act(id(0), moveOf(0))).toEqual({ accepted: true });
    expect(matchView(0).seats[0]!.pawns).toEqual([0, -1, -1, -1]);
    runner.act(id(0), roll);
    clock.advance(2400);
    expect(matchView(0).turn.legalPawns).toEqual([0]);
    expect(runner.act(id(0), moveOf(1))).toMatchObject({ accepted: false, reason: 'MOVE_NOT_ALLOWED', nextStep: expect.any(String) });
    expect(runner.act(id(1), moveOf(0))).toMatchObject({ accepted: false, reason: 'NOT_YOUR_TURN' });
  });

  it('refuses a move before any roll', () => {
    const { runner, idOf: id } = setup();
    expect(runner.act(id(0), moveOf(0))).toMatchObject({ accepted: false, reason: 'MOVE_NOT_ALLOWED' });
  });

  it('refuses members without a seat and anything after the match ended', () => {
    const { runner, state } = setup();
    expect(runner.act('stranger', roll)).toMatchObject({ accepted: false, reason: 'NOT_PLAYING' });
    state().phase = 'ENDED';
    expect(runner.act('p-0', roll)).toMatchObject({ accepted: false, reason: 'MATCH_ENDED' });
  });

  it('rejects anything but strict roll, move and resume actions, so no result can come from a client', () => {
    const { runner, idOf: id } = setup();
    for (const action of [
      { type: 'roll', payload: { value: 6 } }, { type: 'roll', value: 6 }, { type: 'win' }, { type: 'move' },
      { type: 'move', payload: { pawn: 1, result: 6 } }, { type: 'move', payload: { pawn: 9 } }, { type: 'Roll' },
    ]) {
      expect(runner.act(id(0), action)).toMatchObject({ accepted: false, reason: 'INVALID_ACTION' });
    }
  });

  it('refuses resume from a seat that is not away', () => {
    const { runner, idOf: id } = setup();
    expect(runner.act(id(0), { type: 'resume' })).toMatchObject({ accepted: false, reason: 'NOT_AWAY' });
  });

  it('ends the match through the platform when the fourth pawn gets home', () => {
    const { runner, clock, state, matchView, published, ended, idOf: id } = setup({ values: [3] });
    state().seats[0]!.pawns = [56, 56, 56, 53];
    runner.act(id(0), roll);
    clock.advance(2400);
    expect(runner.act(id(0), moveOf(3))).toEqual({ accepted: true });
    expect(ended).toHaveLength(1);
    expect(matchView(1).winner).toBe(0);
    expect(matchView(1).turn).toMatchObject({ phase: 'ENDED', seat: null });
    expect(published.at(-1)!.map((event) => (event as { kind: string }).kind)).toEqual(['MOVED', 'WON']);
  });

  it('shows another member the same board and their own seat', () => {
    const { matchView } = setup();
    expect(matchView(3).you).toBe(3);
    expect(matchView(0).seats).toEqual(matchView(3).seats);
  });
});

describe('fair dice and first player', () => {
  it('draws every face between 15% and 18.5% of the time over 6,000 rolls', () => {
    const dice = cryptoDice();
    const counts = new Array<number>(6).fill(0);
    for (let index = 0; index < 6000; index += 1) counts[dice.value() - 1]! += 1;
    for (const count of counts) {
      expect(count / 6000).toBeGreaterThanOrEqual(0.15);
      expect(count / 6000).toBeLessThanOrEqual(0.185);
    }
  });

  it('spreads the first seat across all seats and keeps seeds in range', () => {
    const dice = cryptoDice();
    const counts = new Array<number>(4).fill(0);
    for (let index = 0; index < 4000; index += 1) {
      counts[dice.firstSeat(4)]! += 1;
      const seed = dice.seed();
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
    for (const count of counts) expect(count).toBeGreaterThan(850);
    for (const count of counts) expect(count).toBeLessThan(1150);
  });

  it('only ever shows die faces 1 to 6', () => {
    const dice = cryptoDice();
    for (let index = 0; index < 1000; index += 1) expect([1, 2, 3, 4, 5, 6]).toContain(dice.value());
  });
});

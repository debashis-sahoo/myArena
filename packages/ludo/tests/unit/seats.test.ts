import { describe, expect, it } from 'vitest';
import { colorsFor, nextSeat } from '../../src/index.js';

describe('seat colours', () => {
  it('uses Red and Yellow for 2, Red Green Yellow for 3, and all four for 4', () => {
    expect(colorsFor(2)).toEqual(['RED', 'YELLOW']);
    expect(colorsFor(3)).toEqual(['RED', 'GREEN', 'YELLOW']);
    expect(colorsFor(4)).toEqual(['RED', 'GREEN', 'YELLOW', 'BLUE']);
  });

  it('rejects other player counts', () => {
    for (const count of [0, 1, 5]) expect(() => colorsFor(count)).toThrow(RangeError);
  });

  it('gives a solo visitor Red and computers the following colours in turn order', () => {
    expect(colorsFor(1 + 1).slice(1)).toEqual(['YELLOW']);
    expect(colorsFor(2 + 1).slice(1)).toEqual(['GREEN', 'YELLOW']);
    expect(colorsFor(3 + 1).slice(1)).toEqual(['GREEN', 'YELLOW', 'BLUE']);
  });

  it('moves clockwise to the next seat that has not left', () => {
    const seats = [{ left: false }, { left: true }, { left: false }, { left: false }];
    expect(nextSeat(seats, 0)).toBe(2);
    expect(nextSeat(seats, 3)).toBe(0);
    expect(nextSeat([{ left: false }, { left: true }], 0)).toBe(0);
    expect(nextSeat([{ left: true }, { left: true }], 0)).toBeNull();
  });
});

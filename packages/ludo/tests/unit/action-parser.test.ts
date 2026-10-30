import { describe, expect, it } from 'vitest';
import { parseLudoAction } from '../../src/index.js';

describe('parseLudoAction', () => {
  it('accepts roll, move with a pawn from 0 to 3, and resume', () => {
    expect(parseLudoAction({ type: 'roll' })).toEqual({ type: 'roll' });
    expect(parseLudoAction({ type: 'resume' })).toEqual({ type: 'resume' });
    for (const pawn of [0, 1, 2, 3]) expect(parseLudoAction({ type: 'move', payload: { pawn } })).toEqual({ type: 'move', pawn });
  });

  it('rejects unknown types, extra fields and payloads where none belong', () => {
    expect(parseLudoAction({ type: 'teleport' })).toBeNull();
    expect(parseLudoAction({ type: 'roll', value: 6 })).toBeNull();
    expect(parseLudoAction({ type: 'roll', payload: {} })).toBeNull();
    expect(parseLudoAction({ type: 'resume', payload: { seat: 1 } })).toBeNull();
    expect(parseLudoAction({ type: 'move', payload: { pawn: 1, result: 6 } })).toBeNull();
    expect(parseLudoAction({ type: 'move' })).toBeNull();
  });

  it('rejects a pawn that is not an integer from 0 to 3', () => {
    for (const pawn of [-1, 4, 1.5, '1', null, Number.NaN]) {
      expect(parseLudoAction({ type: 'move', payload: { pawn } })).toBeNull();
    }
    for (const value of [null, undefined, 'roll', 7, [], [{ type: 'roll' }]]) expect(parseLudoAction(value)).toBeNull();
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMatch, legalPawns, toMatchView, type LudoMatchView } from '@myarena/ludo';
import { Board2D } from '../../src/features/ludo/view/Board2D';
import { Controls } from '../../src/features/ludo/view/Controls';
import { placePawns } from '../../src/features/ludo/view/placement';

afterEach(cleanup);

const players = (count: number) => Array.from({ length: count }, (_, index) => ({ kind: 'HUMAN' as const, label: ['Ann', 'Bob', 'Cy', 'Di'][index]!, participantId: `p${index}` }));
const viewOf = (count: number, you: number | null = 0): LudoMatchView => {
  const state = createMatch(players(count), 0);
  return toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
};
const draw = (view: LudoMatchView, movable: number[] = [], highlight: number | null = null) =>
  render(<Board2D view={view} placed={placePawns(view, new Set(movable), highlight)} />).container;

describe('the board', () => {
  it('draws no number on any pawn or anywhere on the board', () => {
    const container = draw(viewOf(4));
    expect(container.querySelectorAll('.ludo-pin')).toHaveLength(16);
    expect(container.querySelector('.ludo-pin text')).toBeNull();
    expect(/\d/.test(container.querySelector('svg')!.textContent ?? '')).toBe(false);
  });

  it('draws four yard slots per colour and a distinct head mark for each colour', () => {
    const container = draw(viewOf(4));
    expect(container.querySelectorAll('.ludo-frame')).toHaveLength(4);
    expect(container.querySelectorAll('.ludo-slot')).toHaveLength(16);
    const marks = new Set([...container.querySelectorAll('.ludo-pin-mark')].map((mark) => mark.getAttribute('d')));
    expect(marks.size).toBe(4);
  });

  it('fades the colours that are not in play and shows no bar for them', () => {
    const container = draw(viewOf(2));
    expect(container.querySelectorAll('.ludo-frame.is-unused')).toHaveLength(2);
    expect(container.querySelectorAll('.ludo-bar')).toHaveLength(2);
  });

  it('marks the name bar of the player whose turn it is', () => {
    const container = draw(viewOf(3));
    const active = container.querySelectorAll('.ludo-bar[data-active="true"]');
    expect(active).toHaveLength(1);
    expect(active[0]?.textContent).toContain('Ann');
  });

  it('spreads pawns that share a square so every one stays visible', () => {
    const view = viewOf(2);
    const placed = placePawns({ ...view, seats: view.seats.map((seat) => (seat.index === 0 ? { ...seat, pawns: [5, 5, 5, 5] } : seat)) }, new Set());
    const own = placed.filter((item) => item.seat === 0);
    expect(new Set(own.map((item) => `${item.cx},${item.cy}`)).size).toBe(4);
    expect(own.every((item) => item.scale < 1)).toBe(true);
  });

  it('highlights only the movable pawn of the viewer', () => {
    const view = viewOf(2);
    const container = draw(view, [0, 2], 2);
    expect(container.querySelectorAll('.ludo-pin.is-movable')).toHaveLength(2);
    expect(container.querySelectorAll('.ludo-pin.is-highlighted')).toHaveLength(1);
    expect(container.querySelector('.ludo-pin.is-highlighted')?.getAttribute('data-pawn')).toBe('0:2');
  });
});

describe('linking a move button to its pawn', () => {
  it('reports the pawn while its button is pointed at or focused, and clears it after', () => {
    const state = createMatch(players(2), 0);
    const base = toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: [0, 1], decisionMsLeft: null, settleMsLeft: 0 });
    const view = { ...base, turn: { ...base.turn, phase: 'MOVE' as const, dice: 6, legalPawns: [0, 1] } };
    const seen: (number | null)[] = [];
    render(<Controls view={view} settled onRoll={() => undefined} onMove={() => undefined} onHighlight={(pawn) => seen.push(pawn)} />);
    const buttons = screen.getAllByRole('button').filter((button) => button.hasAttribute('data-ludo-pawn'));
    expect(buttons).toHaveLength(2);
    fireEvent.pointerEnter(buttons[1]!);
    fireEvent.pointerLeave(buttons[1]!);
    fireEvent.focus(buttons[0]!);
    fireEvent.blur(buttons[0]!);
    expect(seen).toEqual([1, null, 0, null]);
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, legalPawns, toMatchView, type LudoMatchView } from '@myarena/ludo';
import { MatchLayout } from '../../src/features/ludo/match/MatchLayout';
import { MatchView } from '../../src/features/ludo/match/MatchView';

let wide = false;
beforeEach(() => { vi.stubGlobal('matchMedia', () => ({ matches: wide, addEventListener: () => undefined, removeEventListener: () => undefined })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); wide = false; localStorage.clear(); });

const state = createMatch([{ kind: 'HUMAN', label: 'Alex', participantId: 'a' }, { kind: 'HUMAN', label: 'Sam', participantId: 's' }], 0);
const viewFor = (you: number | null): LudoMatchView =>
  toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
const props = { seq: 1, error: null, onRoll: () => undefined, onMove: () => undefined };

describe('the match screen parts', () => {
  it('has a turn card, die, board, controls and extras, in that order, so a phone reads top to bottom', () => {
    const { container } = render(<MatchView view={viewFor(0)} {...props}><p>extra</p></MatchView>);
    const parts = Array.from(container.querySelector('.ludo-match')!.children).map((part) => part.className.split(' ')[0]);
    expect(parts).toEqual(['ludo-hud', 'ludo-board-area', 'ludo-actions', 'ludo-extra']);
    const hud = Array.from(container.querySelector('.ludo-hud')!.children).map((part) => part.className.split(' ')[0]);
    expect(hud).toEqual(['ludo-turn', 'ludo-die', 'ludo-status']);
  });

  it('leaves out the extras area when there is nothing to put in it (solo)', () => {
    const { container } = render(<MatchView view={viewFor(0)} {...props} />);
    expect(container.querySelector('.ludo-extra')).toBeNull();
  });

  it('names whose turn it is, and says "Your turn" to the player who is up', () => {
    const { container, rerender } = render(<MatchView view={viewFor(0)} {...props} />);
    expect(container.querySelector('.ludo-turn')).toHaveTextContent('Your turn');
    expect(container.querySelector('.ludo-turn')).toHaveAttribute('data-turn', 'red');
    rerender(<MatchView view={viewFor(1)} {...props} />);
    expect(container.querySelector('.ludo-turn')).toHaveTextContent("Alex's turn");
  });

  it('enables Roll only for the player whose turn it is', () => {
    const { rerender } = render(<MatchView view={viewFor(0)} {...props} />);
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeEnabled();
    rerender(<MatchView view={viewFor(1)} {...props} />);
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeDisabled();
  });
});

describe('the arrangement for the screen size', () => {
  const layout = () => render(<MatchLayout view={viewFor(0)} messages={[]} run={vi.fn(async () => null)} {...props} />).container;

  it('puts the game log and chat in the extras area on a wide screen, without sheet buttons', () => {
    wide = true;
    const container = layout();
    expect(container.querySelector('.ludo-extra .ludo-side')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Game log' })).toBeNull();
  });

  it('puts only the two sheet buttons in the extras area on a phone', () => {
    const container = layout();
    expect(container.querySelector('.ludo-extra .ludo-sheet-buttons')).not.toBeNull();
    expect(container.querySelector('.ludo-side')).toBeNull();
    expect(screen.getByRole('button', { name: 'Game log' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();
  });
});

describe('old graphics settings', () => {
  it('ignores a saved quality or view choice, and offers no such control', () => {
    localStorage.setItem('myarena-ludo-quality', 'high');
    localStorage.setItem('myarena-ludo-view', 'top');
    const { container } = render(<MatchView view={viewFor(0)} {...props} />);
    expect(container.querySelector('svg.ludo-board-svg')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.queryByText(/visual quality/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /view/i })).toBeNull();
  });
});

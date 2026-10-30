import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMatch, legalPawns, move, roll, toMatchView, type LudoMatchView, type MatchState } from '@myarena/ludo';
import { describePawnMove, statusText } from '../../src/features/ludo/a11y/describe';
import { LudoMatch } from '../../src/features/ludo/match/LudoMatch';
import { MatchView } from '../../src/features/ludo/match/MatchView';
import { parseLudoView } from '../../src/features/ludo/match/useRoomGame';

afterEach(cleanup);

const people = [
  { kind: 'HUMAN' as const, label: 'Alex', participantId: 'a' },
  { kind: 'HUMAN' as const, label: 'Sam', participantId: 's' },
];
const base = (): MatchState => createMatch(people, 0);
const put = (state: MatchState, seat: number, pawns: number[]): MatchState => {
  const next = structuredClone(state);
  next.seats[seat]!.pawns = pawns;
  return next;
};
const viewOf = (state: MatchState, you: number | null = 0, settleMsLeft = 0): LudoMatchView =>
  toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft });
const noop = () => {};
const show = (view: LudoMatchView, handlers: { onRoll?: () => void; onMove?: (pawn: number) => void } = {}) =>
  render(<MatchView view={view} seq={1} error={null} onRoll={handlers.onRoll ?? noop} onMove={handlers.onMove ?? noop} />);

describe('Roll control', () => {
  it('is enabled only on the viewer\'s own turn while a roll is due', () => {
    show(viewOf(base(), 0));
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeEnabled();
    cleanup();
    show(viewOf(base(), 1));
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeDisabled();
    cleanup();
    show(viewOf(roll(base(), 6).state, 0));
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeDisabled();
  });

  it('asks the server to roll when pressed', () => {
    const onRoll = vi.fn();
    show(viewOf(base(), 0), { onRoll });
    fireEvent.click(screen.getByRole('button', { name: 'Roll the die' }));
    expect(onRoll).toHaveBeenCalledOnce();
  });
});

describe('pawn chooser', () => {
  it('lists only the pawns that can legally move, each named by position and effect', () => {
    const state = put(put(base(), 0, [3, 9, -1, -1]), 1, [32, -1, -1, -1]);
    const rolled = roll(state, 3).state;
    show(viewOf(rolled, 0));
    const group = screen.getByRole('group', { name: 'Choose a pawn' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Pawn 1, 3 steps from start: move 3 and capture Sam's pawn");
    expect(buttons[1]).toHaveTextContent('Pawn 2, 9 steps from start: move 3 to 12 steps from start');
  });

  it('describes leaving base, protected squares, the home lane and home', () => {
    const six = roll(base(), 6).state;
    expect(describePawnMove(viewOf(six, 0), 2)).toBe('Pawn 3, in base: move 6 to leave base onto the start square');
    const star = roll(put(base(), 0, [5, -1, -1, -1]), 3).state;
    expect(describePawnMove(viewOf(star, 0), 0)).toBe('Pawn 1, 5 steps from start: move 3 and land on a protected square');
    const lane = roll(put(base(), 0, [49, -1, -1, -1]), 3).state;
    expect(describePawnMove(viewOf(lane, 0), 0)).toContain('and enter the home lane');
    const home = roll(put(base(), 0, [52, -1, -1, -1]), 4).state;
    expect(describePawnMove(viewOf(home, 0), 0)).toContain('and reach home');
  });

  it('sends the chosen pawn', () => {
    const onMove = vi.fn();
    show(viewOf(roll(base(), 6).state, 0), { onMove });
    fireEvent.click(screen.getByRole('button', { name: /^Pawn 2, in base/ }));
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it('is empty while the die is rolling, on another seat\'s turn and when no pawn can move', () => {
    const rolled = roll(put(base(), 0, [56, 56, 56, 55]), 6).state;
    expect(legalPawns(rolled)).toEqual([]);
    show(viewOf(rolled, 0));
    expect(screen.queryByRole('group', { name: 'Choose a pawn' })).toBeNull();
    cleanup();
    const six = roll(base(), 6).state;
    show(viewOf(six, 1));
    expect(screen.queryByRole('group', { name: 'Choose a pawn' })).toBeNull();
    cleanup();
    show(viewOf(six, 0, 2400));
    expect(screen.queryByRole('group', { name: 'Choose a pawn' })).toBeNull();
  });
});

describe('status line', () => {
  it('states the phase in plain words', () => {
    const settle = (state: MatchState, you: number | null, settled = true) => statusText(viewOf(state, you), settled);
    expect(settle(base(), 0)).toBe('Your turn: roll the die.');
    expect(settle(base(), 1)).toBe("Alex's turn to roll.");
    const six = roll(base(), 6).state;
    expect(settle(six, 0, false)).toBe('You rolled a 6.');
    expect(settle(six, 0)).toBe('You rolled a 6. Choose a pawn to move.');
    expect(settle(six, 1)).toBe('Alex rolled a 6 and is choosing a pawn.');
    expect(settle(roll(base(), 3).state, 0)).toBe('You rolled a 3. No pawn can move.');
  });

  it('announces the winner and shows the result with pawns home', () => {
    const won = move(roll(put(base(), 0, [56, 56, 56, 53]), 3).state, 3).state;
    show(viewOf(won, 1));
    expect(screen.getByRole('status')).toHaveTextContent('Alex wins the match.');
    expect(screen.getByRole('heading', { name: 'Alex wins!' })).toBeInTheDocument();
    expect(screen.getByText('Sam: 0 of 4 pawns home')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Roll the die' })).toBeNull();
  });
});

describe('the flat board', () => {
  it('draws every pawn with its colour, a distinct mark and its number', () => {
    const { container } = show(viewOf(base(), 0));
    expect(container.querySelectorAll('.ludo-pawn')).toHaveLength(8);
    expect(container.querySelectorAll('.ludo-pawn-mark')).toHaveLength(8);
    expect(container.querySelectorAll('.ludo-pawn-number')).toHaveLength(8);
    const paths = new Set(Array.from(container.querySelectorAll('.ludo-pawn-mark')).map((mark) => mark.getAttribute('d')));
    expect(paths.size).toBe(2);
    expect(container.querySelector('svg')).toHaveAttribute('role', 'img');
    expect(container.querySelector('[style]')).toBeNull();
  });

  it('lets the viewer press a movable pawn on the board and exposes state for tests', () => {
    const onMove = vi.fn();
    const { container } = show(viewOf(roll(base(), 6).state, 0), { onMove });
    expect(container.querySelector('.ludo-board')).toHaveAttribute('data-die-face', '6');
    expect(container.querySelectorAll('.ludo-hit')).toHaveLength(4);
    fireEvent.click(container.querySelectorAll('.ludo-hit')[2]!);
    expect(onMove).toHaveBeenCalledWith(2);
  });
});

describe('the online match', () => {
  const run = vi.fn(async () => null);
  const game = (state: unknown) => ({ matchId: 'm', seq: 1, state, events: [] });

  it('shows only a waiting message, with no board, to a member without a seat', () => {
    const { container } = render(<LudoMatch lobby={{} as never} game={game({ kind: 'WAITING' })} run={run} />);
    expect(screen.getByRole('heading', { name: 'A Ludo match is in progress' })).toBeInTheDocument();
    expect(screen.getByText('You will be able to join the next one.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Roll the die' })).toBeNull();
  });

  it('prepares the match until the first game message arrives', () => {
    render(<LudoMatch lobby={{} as never} game={null} run={run} />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparing the match');
  });

  it('sends game actions through the room connection', async () => {
    const send = vi.fn(async () => null);
    render(<LudoMatch lobby={{} as never} game={game(viewOf(base(), 0))} run={send} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll the die' }));
    expect(send).toHaveBeenCalledWith({ type: 'game.action', action: { type: 'roll' } });
  });

  it('shows the server\'s plain-language refusal', async () => {
    const send = vi.fn(async () => 'It is not your turn. Wait for your turn.');
    render(<LudoMatch lobby={{} as never} game={game(viewOf(base(), 0))} run={send} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll the die' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('It is not your turn. Wait for your turn.');
  });
});

describe('parseLudoView', () => {
  it('accepts match and waiting views and rejects anything else', () => {
    expect(parseLudoView({ kind: 'WAITING' })).toEqual({ kind: 'WAITING' });
    expect(parseLudoView(viewOf(base(), 0))?.kind).toBe('MATCH');
    for (const value of [null, undefined, 'x', 3, {}, { kind: 'MATCH' }, { kind: 'OTHER' }]) expect(parseLudoView(value)).toBeNull();
  });
});

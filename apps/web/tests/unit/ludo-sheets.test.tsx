import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@myarena/protocol';
import { createMatch, legalPawns, toMatchView, type LudoMatchView } from '@myarena/ludo';
import { MatchLayout } from '../../src/features/ludo/match/MatchLayout';

let wide = false;
beforeEach(() => { vi.stubGlobal('matchMedia', () => ({ matches: wide, addEventListener: () => undefined, removeEventListener: () => undefined })); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); wide = false; });

const state = createMatch([{ kind: 'HUMAN', label: 'Alex', participantId: 'a' }, { kind: 'HUMAN', label: 'Sam', participantId: 's' }], 0);
const viewWith = (extra: number): LudoMatchView => {
  const view = toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
  return { ...view, log: [...view.log, ...Array.from({ length: extra }, (_, index) => ({ n: 100 + index, text: `Event ${index}` }))] };
};
const chat = (count: number): ChatMessage[] => Array.from({ length: count }, (_, index) => (
  { id: `00000000-0000-4000-8000-00000000000${index}`, senderParticipantId: '00000000-0000-4000-8000-0000000000aa', senderLabel: 'Sam', text: `hi ${index}`, sentAt: index }
));
const props = { seq: 1, error: null, onRoll: () => undefined, onMove: () => undefined };
const ui = (view: LudoMatchView, messages: ChatMessage[], run = vi.fn(async () => null)) => (
  <MatchLayout view={view} messages={messages} run={run} {...props} />
);

describe('game log and chat sheets on a narrow screen', () => {
  it('counts unread entries while closed and resets the count when a sheet opens', async () => {
    const { rerender } = render(ui(viewWith(0), chat(1)));
    expect(screen.getByRole('button', { name: 'Game log' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();

    rerender(ui(viewWith(2), chat(3)));
    expect(screen.getByRole('button', { name: 'Game log 2 unread' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat 2 unread' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chat 2 unread' }));
    expect(screen.getByRole('region', { name: 'Chat sheet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Game log 2 unread' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(screen.queryByRole('region', { name: 'Chat sheet' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chat' })).toHaveFocus());

    rerender(ui(viewWith(2), chat(4)));
    expect(screen.getByRole('button', { name: 'Chat 1 unread' })).toBeInTheDocument();
  });

  it('shows the game log entries oldest first in their own sheet', () => {
    render(ui(viewWith(2), []));
    fireEvent.click(screen.getByRole('button', { name: /Game log/ }));
    const items = within(screen.getByRole('region', { name: 'Game log sheet' })).getAllByRole('listitem').map((item) => item.textContent);
    expect(items.slice(-2)).toEqual(['Event 0', 'Event 1']);
    expect(items[0]).toContain('The match starts');
  });

  it('keeps the board and controls in view while a sheet is open, and closes on Escape', () => {
    render(ui(viewWith(0), chat(1)));
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    expect(screen.getByRole('region', { name: 'Ludo match' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeEnabled();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Chat sheet' }), { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Chat sheet' })).toBeNull();
  });

  it('sends chat as chat and never as a game action', async () => {
    const run = vi.fn(async () => null);
    render(ui(viewWith(0), [], run));
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'nice roll' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(run).toHaveBeenCalledWith({ type: 'chat.send', text: 'nice roll' });
    expect(JSON.stringify(run.mock.calls)).not.toContain('game.action');
  });
});

describe('game log and chat on a wide screen', () => {
  it('shows the game log above the chat beside the board, with no sheet buttons', () => {
    wide = true;
    const { container } = render(ui(viewWith(1), chat(2)));
    expect(screen.queryByRole('button', { name: /^Game log/ })).toBeNull();
    const headings = Array.from(container.querySelectorAll('.ludo-side h2')).map((heading) => heading.textContent);
    expect(headings).toEqual(['Game log', 'Chat']);
    expect(screen.getByRole('region', { name: 'Ludo match' })).toBeInTheDocument();
  });
});

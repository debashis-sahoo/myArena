import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LobbyView } from '@myarena/protocol';
import { ErrorSummary } from '../../src/a11y/ErrorSummary';
import { ChatPanel } from '../../src/features/chat/ChatPanel';
import { CreateRoomPanel } from '../../src/features/landing/CreateRoomPanel';
import { bothModes } from './catalog-fixtures';
import { JoinRoomForm } from '../../src/features/entry/JoinRoomForm';
import { JoinRoutePage } from '../../src/features/entry/JoinRoutePage';
import { GameSelect } from '../../src/features/lobby/GameSelect';
import { InvitePanel } from '../../src/features/lobby/InvitePanel';
import { MatchControls } from '../../src/features/lobby/MatchControls';
import { ReadyToggle } from '../../src/features/lobby/ReadyToggle';
import { SettingsPanel } from '../../src/features/lobby/SettingsPanel';
import { ConnectionBanner } from '../../src/features/recovery/ConnectionBanner';
import { RecoveryExpired } from '../../src/features/recovery/RecoveryExpired';
import type { LostReason } from '../../src/platform/reconnect';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const problem = (status: number, code: string, detail: string, nextStep: string) =>
  new Response(JSON.stringify({ type: 'x', title: 'x', status, code, detail, nextStep }), { status, headers: { 'Content-Type': 'application/problem+json' } });
const inRouter = (ui: React.ReactElement, path = '/') => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
const rejection = 'Some players are not ready. Wait for every player to be ready.';
const fail = async () => rejection;

const lobby: LobbyView = {
  id: crypto.randomUUID(), version: 1, status: 'LOBBY', selectedGameId: null, settings: { maxParticipants: 10, gameSettings: {} }, matchStatus: 'NONE',
  participants: [], chat: [], self: { id: crypto.randomUUID(), role: 'HOST' },
};

describe('every error state is announced with a next step', () => {
  it('moves focus to an alert summary that links to the field', () => {
    document.body.innerHTML = '<input id="field" />';
    render(<ErrorSummary errors={[{ message: 'Enter a name.', nextStep: 'Use 1 to 24 letters.', fieldId: 'field' }]} />, { container: document.body.appendChild(document.createElement('div')) });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter a name. Use 1 to 24 letters.');
    expect(alert).toHaveFocus();
    fireEvent.click(screen.getByRole('link', { name: 'Enter a name.' }));
    expect(document.getElementById('field')).toHaveFocus();
  });

  it('renders nothing when there are no errors', () => {
    const { container } = render(<ErrorSummary errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains an invalid create form and a refused one', async () => {
    inRouter(<CreateRoomPanel entry={bothModes} displayName="" onNameChange={() => {}} onGameUnavailable={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Use 1 to 24 characters\. Use 1 to 24 letters, numbers, or spaces\./);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(problem(503, 'SERVICE_AT_CAPACITY', 'The service is at capacity.', 'Try again later.')));
    cleanup();
    inRouter(<CreateRoomPanel entry={bothModes} displayName="Sam" onNameChange={() => {}} onGameUnavailable={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The service is at capacity. Try again later.'));
  });

  it('explains a join form with missing fields, a full room, and a network failure', async () => {
    inRouter(<JoinRoomForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Enter the room code. Ask the host for the code or the invite link.');
    expect(summary).toHaveTextContent('Use 1 to 24 characters.');

    fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'ABCDEFGH23' } });
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Sam' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(problem(409, 'ROOM_FULL', 'This room has no seats available.', 'Ask the host to make space or create another room.')));
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ask the host to make space'));

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Check your connection and retry the same request.'));
  });

  it.each([
    [problem(404, 'INVITATION_UNAVAILABLE', 'This invitation is unavailable.', 'Ask the host for a new invitation.'), 'Ask the host for a new invitation.'],
    [problem(409, 'ROOM_FULL', 'This room has no seats available.', 'Ask the host to make space or create another room.'), 'Ask the host to make space'],
  ])('explains an unusable invite link', async (response, next) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    render(<MemoryRouter initialEntries={['/join/ABCDEFGH23']}><Routes><Route path="/join/:code" element={<JoinRoutePage />} /></Routes></MemoryRouter>);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(next);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  const reasons: LostReason[] = ['expired', 'unavailable', 'removed', 'closed', 'left', 'superseded'];
  it.each(reasons)('shows the %s screen as an alert with a heading, an explanation, and a way forward', (reason) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    inRouter(<RecoveryExpired reason={reason} roomId={crypto.randomUUID()} />);
    const alert = screen.getByRole('alert');
    expect(within(alert).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(alert.textContent!.length).toBeGreaterThan(60);
    expect(within(alert).getByRole('link', { name: 'Back to the start' })).toHaveAttribute('href', '/');
  });

  it('clears the credential after a removal or closure but never after an expiry', async () => {
    for (const [reason, calls] of [['removed', 1], ['closed', 1], ['expired', 0], ['left', 0]] as const) {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);
      inRouter(<RecoveryExpired reason={reason} roomId="2c0f8c9c-5b6e-4b1b-9d9a-0d6b9f6d1a11" />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(calls));
      cleanup();
    }
  });

  it('shows the intent rejection beside the control that caused it', async () => {
    const cases: [string, React.ReactElement][] = [
      ['Start match', <MatchControls lobby={lobby} run={fail} />],
      ['I am ready', <ReadyToggle ready={false} run={fail} />],
      ['Save settings', <SettingsPanel settings={lobby.settings} seats={1} isHost editable run={fail} />],
      ['Send', <ChatPanel messages={[]} run={fail} />],
    ];
    for (const [button, ui] of cases) {
      inRouter(ui);
      if (button === 'Send') fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hi' } });
      fireEvent.click(screen.getByRole('button', { name: button }));
      expect(await screen.findByRole('alert')).toHaveTextContent(rejection);
      cleanup();
    }
  });

  it('shows a game selection failure and an invitation failure inline', async () => {
    inRouter(<GameSelect games={[{ id: 'g', name: 'Game', minParticipants: 1, maxParticipants: 4 }]} selectedGameId={null} isHost editable run={fail} />);
    fireEvent.change(screen.getByLabelText('Choose a game'), { target: { value: 'g' } });
    expect(await screen.findByRole('alert')).toHaveTextContent(rejection);
    cleanup();

    inRouter(<InvitePanel invitation={{ code: 'ABCDEFGH23', link: '/join/ABCDEFGH23' }} run={fail} />);
    fireEvent.click(screen.getByRole('button', { name: 'New invitation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(rejection);
  });

  it('announces a reconnection politely without saying anyone left', () => {
    const { rerender } = render(<ConnectionBanner status="connected" />);
    rerender(<ConnectionBanner status="reconnecting" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Reconnecting');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).not.toHaveTextContent(/left|removed|gone/i);
    rerender(<ConnectionBanner status="connected" />);
    expect(screen.getByRole('status')).toHaveTextContent('Back online.');
  });
});

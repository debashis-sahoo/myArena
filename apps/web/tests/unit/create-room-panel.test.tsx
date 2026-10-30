import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateRoomPanel } from '../../src/features/landing/CreateRoomPanel';
import { bothModes, bigRoom } from './catalog-fixtures';
import type { CatalogEntry } from '@myarena/protocol';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.localStorage.clear(); });

const problem = (status: number, code: string, detail: string, nextStep: string, fieldErrors?: unknown) =>
  new Response(JSON.stringify({ type: 'x', title: 'x', status, code, detail, nextStep, fieldErrors }), { status, headers: { 'Content-Type': 'application/problem+json' } });
const created = (roomId = 'room-123') =>
  new Response(JSON.stringify({ roomId, participantId: 'p', role: 'HOST', invitation: { code: 'ABCDEFGH23', link: '/join/ABCDEFGH23' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });

function Where() { return <p data-testid="where">{useLocation().pathname}</p>; }
function Host({ entry, initialName = 'Sam', onGameUnavailable = () => {} }: { entry: CatalogEntry; initialName?: string; onGameUnavailable?: () => void }) {
  const [name, setName] = useState(initialName);
  return <MemoryRouter><Routes>
    <Route path="/" element={<CreateRoomPanel entry={entry} displayName={name} onNameChange={setName} onGameUnavailable={onGameUnavailable} />} />
    <Route path="/room/:id" element={<Where />} />
  </Routes></MemoryRouter>;
}
const submitted = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => {
  const [, init] = fetchMock.mock.calls[call]!;
  return { body: JSON.parse(String(init.body)), key: new Headers(init.headers).get('Idempotency-Key') };
};

describe('CreateRoomPanel', () => {
  it('sends the game and chosen count, remembers the name and room, and opens the lobby', async () => {
    const fetchMock = vi.fn().mockResolvedValue(created());
    vi.stubGlobal('fetch', fetchMock);
    render(<Host entry={bothModes} />);
    fireEvent.click(screen.getByRole('radio', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/room/room-123'));
    expect(submitted(fetchMock).body).toEqual({ displayName: 'Sam', gameId: 'both-game', maxParticipants: 4 });
    expect(window.localStorage.getItem('myarena-last-room')).toBe('room-123');
    expect(window.localStorage.getItem('myarena-name')).toBe('Sam');
  });

  it('preselects the game default inside the allowed range', () => {
    render(<Host entry={bothModes} />);
    expect(screen.getByRole('radio', { name: '3' })).toBeChecked();
    cleanup();
    render(<Host entry={bigRoom} />);
    expect(screen.getByLabelText('Number of players')).toHaveValue('100');
  });

  it('rejects an out-of-range count and an invalid name without calling the server', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Host entry={bigRoom} initialName="" />);
    fireEvent.change(screen.getByLabelText('Number of players'), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Choose a number of players from 2 to 100. Pick a number in that range.');
    expect(alert).toHaveTextContent('Use 1 to 24 characters.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a server field error in plain language and keeps the entries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(problem(400, 'VALIDATION_FAILED', 'Some information is missing or invalid.', 'Check the fields and try again.', [{ field: 'maxParticipants', message: 'Choose a number of players from 2 to 4.' }])));
    render(<Host entry={bothModes} />);
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a number of players from 2 to 4. Check the fields and try again.');
    expect(screen.getByRole('radio', { name: '2' })).toBeChecked();
    expect(screen.getByLabelText('Display name')).toHaveValue('Sam');
  });

  it('reports an unavailable game and asks the page to refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(problem(409, 'GAME_UNAVAILABLE', 'This game is unavailable.', 'Select another game.')));
    const onGameUnavailable = vi.fn();
    render(<Host entry={bothModes} onGameUnavailable={onGameUnavailable} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This game is unavailable. Select another game.');
    expect(onGameUnavailable).toHaveBeenCalled();
  });

  it('reuses the idempotency key for a retry after a network failure until an input changes', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('offline')).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(created());
    vi.stubGlobal('fetch', fetchMock);
    render(<Host entry={bothModes} />);
    const create = () => fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    create();
    expect(await screen.findByRole('alert')).toHaveTextContent('The service could not be reached.');
    create();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole('alert');
    expect(submitted(fetchMock, 1).key).toBe(submitted(fetchMock, 0).key);
    fireEvent.click(screen.getByRole('radio', { name: '4' }));
    create();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(submitted(fetchMock, 2).key).not.toBe(submitted(fetchMock, 0).key);
  });
});

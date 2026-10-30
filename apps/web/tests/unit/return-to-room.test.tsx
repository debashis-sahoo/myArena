import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReturnToRoom } from '../../src/features/landing/ReturnToRoom';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.localStorage.clear(); });

const probe = (status: number) => vi.fn().mockResolvedValue(new Response(JSON.stringify(status === 200
  ? { roomId: 'r1', participantId: 'p', role: 'HOST', connection: 'CONNECTED' }
  : { detail: 'x', nextStep: 'y', code: status === 410 ? 'RECOVERY_EXPIRED' : 'UNAUTHENTICATED' }), { status }));
const show = () => render(<MemoryRouter><ReturnToRoom /></MemoryRouter>);

describe('ReturnToRoom', () => {
  it('shows nothing and asks nothing when no room is remembered', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    show();
    expect(screen.queryByRole('region')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('appears only after the probe confirms the seat, and links to the room', async () => {
    window.localStorage.setItem('myarena-last-room', 'r1');
    const fetchMock = probe(200);
    vi.stubGlobal('fetch', fetchMock);
    show();
    expect(screen.queryByRole('region', { name: 'Return to your room' })).toBeNull();
    const link = await screen.findByRole('link', { name: 'Return to your room' });
    expect(link).toHaveAttribute('href', '/room/r1');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/rooms/r1/session');
  });

  it.each([[410], [401]])('forgets the room and shows nothing when the probe says %i', async (status) => {
    window.localStorage.setItem('myarena-last-room', 'r1');
    vi.stubGlobal('fetch', probe(status));
    show();
    await waitFor(() => expect(window.localStorage.getItem('myarena-last-room')).toBeNull());
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('keeps the memory but shows nothing when the service cannot be reached', async () => {
    window.localStorage.setItem('myarena-last-room', 'r1');
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);
    show();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('region')).toBeNull();
    expect(window.localStorage.getItem('myarena-last-room')).toBe('r1');
  });
});

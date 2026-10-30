import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncerProvider } from '../../src/a11y/announcer';
import { LandingPage } from '../../src/features/landing/LandingPage';
import { bothModes, catalogResponse, comingSoon, onlineOnly, soloOnly } from './catalog-fixtures';
import type { CatalogEntry } from '@myarena/protocol';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.localStorage.clear(); });

function renderLanding(entries: CatalogEntry[] | 'fail', path = '/') {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
    if (entries === 'fail') throw new TypeError('offline');
    return catalogResponse(entries);
  }));
  return render(<MemoryRouter initialEntries={[path]}><AnnouncerProvider><LandingPage /></AnnouncerProvider></MemoryRouter>);
}

const createControls = () => screen.queryAllByLabelText(/Number of players|Display name/).filter((element) => !element.closest('#join-section'));

describe('LandingPage browsing', () => {
  it('shows both groups, the tagline, and the join section with no create controls', async () => {
    renderLanding([bothModes, onlineOnly, comingSoon]);
    expect(await screen.findByRole('heading', { name: 'Playable Games' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Future Arena Catalog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your Friends. Your Arena.' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Join with Room Code' })).toBeInTheDocument();
    expect(createControls()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Play against AI' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create private room' })).toBeNull();
    expect(screen.queryByRole('region', { name: /choose how to play/ })).toBeNull();
  });

  it('keeps the Playable group readable when nothing is playable yet', async () => {
    renderLanding([comingSoon]);
    expect(await screen.findByText(/No games are ready to play yet/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Join with Room Code' })).toBeInTheDocument();
  });

  it('explains a coming-soon tile instead of starting anything', async () => {
    renderLanding([bothModes, comingSoon]);
    fireEvent.click(await screen.findByRole('button', { name: /^Later Game Coming soon/ }));
    expect(screen.getAllByText('Later Game is not available yet.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('region', { name: /choose how to play/ })).toBeNull();
  });

  it('shows an inline error with Retry when the catalog fails, and keeps joining available', async () => {
    renderLanding('fail');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('could not be loaded');
    expect(screen.getByRole('region', { name: 'Join with Room Code' })).toBeInTheDocument();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(catalogResponse([soloOnly])));
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Solo Game Playable/ })).toBeInTheDocument());
  });
});

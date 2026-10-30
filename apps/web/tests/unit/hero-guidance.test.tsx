import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncerProvider } from '../../src/a11y/announcer';
import { LandingPage } from '../../src/features/landing/LandingPage';
import { bothModes, catalogResponse, onlineOnly, soloOnly } from './catalog-fixtures';
import type { CatalogEntry } from '@myarena/protocol';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.localStorage.clear(); });

function Where() { return <p data-testid="where">{useLocation().pathname}</p>; }

function renderLanding(entries: CatalogEntry[], path = '/') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(catalogResponse(entries)));
  render(
    <MemoryRouter initialEntries={[path]}>
      <AnnouncerProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/play/:gameId/solo" element={<Where />} />
        </Routes>
      </AnnouncerProvider>
    </MemoryRouter>,
  );
}

describe('hero shortcuts', () => {
  it('guide to choosing a game when nothing is selected', async () => {
    renderLanding([bothModes]);
    await screen.findByRole('button', { name: /^Both Game Playable/ });
    fireEvent.click(screen.getByRole('button', { name: 'Create Private Room' }));
    expect(screen.getAllByText('Choose a game first.').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Playable Games' })).toHaveFocus();
    expect(screen.queryByRole('region', { name: /choose how to play/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play Solo vs AI' }));
    expect(screen.getByRole('heading', { name: 'Playable Games' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Play against AI' })).toBeNull();
  });

  it('jump to the matching option when a game is selected', async () => {
    renderLanding([bothModes], '/?game=both-game');
    await screen.findByRole('region', { name: /choose how to play/ });
    fireEvent.click(screen.getByRole('button', { name: 'Play Solo vs AI' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/play/both-game/solo');
  });

  it('explain when the selected game lacks the mode', async () => {
    renderLanding([onlineOnly, soloOnly], '/?game=online-game');
    await screen.findByRole('region', { name: /choose how to play/ });
    fireEvent.click(screen.getByRole('button', { name: 'Play Solo vs AI' }));
    expect(screen.getAllByText('Playing against the AI is not available for this game.').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('always move to the join section for Join with Room Code', async () => {
    renderLanding([bothModes]);
    await screen.findByRole('button', { name: /^Both Game Playable/ });
    fireEvent.click(screen.getByRole('button', { name: 'Join with Room Code' }));
    expect(document.getElementById('join-section')).toHaveFocus();
  });
});

describe('selection on the landing page', () => {
  it('shows options only after a selection, replaces them on another tile, and dismisses', async () => {
    renderLanding([bothModes, onlineOnly]);
    fireEvent.click(await screen.findByRole('button', { name: /^Both Game Playable/ }));
    expect(await screen.findByRole('region', { name: /Both Game: choose how to play/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Both Game Playable/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Online Game Playable Test game/ }));
    expect(await screen.findByRole('region', { name: /Online Game: choose how to play/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play against AI' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a different game' }));
    expect(screen.queryByRole('region', { name: /choose how to play/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^Online Game Playable Test game/ })).toHaveFocus();
  });
});

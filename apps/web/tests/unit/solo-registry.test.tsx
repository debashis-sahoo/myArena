import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { loadSoloGame, soloRegistry } from '../../src/features/solo/registry';
import { SoloPage } from '../../src/features/solo/SoloPage';

afterEach(cleanup);

describe('solo registry', () => {
  it('loads a registered module lazily and returns null for unknown ids', async () => {
    expect(Object.keys(soloRegistry)).toContain('test-stub');
    const loaded = loadSoloGame('test-stub');
    expect(loaded).not.toBeNull();
    expect((await loaded!).default).toBeTypeOf('function');
    expect(loadSoloGame('missing')).toBeNull();
    expect(loadSoloGame('toString')).toBeNull();
  });
});

describe('SoloPage', () => {
  const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/play/:gameId/solo" element={<SoloPage />} /><Route path="/" element={<p>landing</p>} /></Routes></MemoryRouter>);

  it('renders the solo module with an exit control', async () => {
    at('/play/test-stub/solo');
    expect(await screen.findByRole('heading', { name: 'Test match: solo vs AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit to games' })).toBeInTheDocument();
  });

  it('shows a not-available page with a link back for unknown games', () => {
    at('/play/missing/solo');
    expect(screen.getByRole('heading', { name: 'This game is not available yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the games.' })).toHaveAttribute('href', '/');
  });
});

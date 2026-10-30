import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameTile } from '../../src/features/landing/GameTile';
import { bothModes, comingSoon, onlineOnly, soloOnly } from './catalog-fixtures';

afterEach(cleanup);
const noop = () => {};

describe('GameTile', () => {
  it('is a toggle button for a playable game with name, status and details', () => {
    render(<GameTile entry={bothModes} selected={false} onSelect={noop} onUnavailable={noop} />);
    const tile = screen.getByRole('button', { name: /^Both Game Playable/ });
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    expect(tile).not.toHaveAttribute('aria-disabled');
    expect(tile).toHaveTextContent('Works solo and online.');
    expect(tile).toHaveTextContent('2 to 4 players');
    expect(tile).toHaveTextContent('10 to 20 min');
    expect(tile).toHaveTextContent('Solo vs AI & Online');
    expect(tile.querySelector('.art')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes the selected state and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<GameTile entry={bothModes} selected onSelect={onSelect} onUnavailable={noop} />);
    const tile = screen.getByRole('button', { name: /Both Game/ });
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tile);
    expect(onSelect).toHaveBeenCalledWith(bothModes);
  });

  it('labels test games and describes single-mode games', () => {
    const { rerender } = render(<GameTile entry={onlineOnly} selected={false} onSelect={noop} onUnavailable={noop} />);
    expect(screen.getByRole('button', { name: /^Online Game Playable Test game / })).toHaveTextContent('Online');
    rerender(<GameTile entry={soloOnly} selected={false} onSelect={noop} onUnavailable={noop} />);
    expect(screen.getByRole('button', { name: /^Solo Game Playable / })).toHaveTextContent('Solo vs AI');
  });

  it('shows Coming soon as text, is aria-disabled, and never selects', () => {
    const onSelect = vi.fn();
    const onUnavailable = vi.fn();
    render(<GameTile entry={comingSoon} selected={false} onSelect={onSelect} onUnavailable={onUnavailable} />);
    const tile = screen.getByRole('button', { name: /^Later Game Coming soon/ });
    expect(tile).toHaveAttribute('aria-disabled', 'true');
    expect(tile).not.toHaveAttribute('aria-pressed');
    expect(tile).toHaveTextContent('Coming soon');
    fireEvent.click(tile);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledWith(comingSoon);
  });
});

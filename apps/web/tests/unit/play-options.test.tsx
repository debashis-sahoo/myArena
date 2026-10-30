import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncerProvider } from '../../src/a11y/announcer';
import { PlayOptions } from '../../src/features/landing/PlayOptions';
import type { CatalogEntry } from '@myarena/protocol';
import { bothModes, onlineOnly, soloOnly } from './catalog-fixtures';

afterEach(cleanup);

function show(entry: CatalogEntry, props: Partial<Parameters<typeof PlayOptions>[0]> = {}) {
  const handlers = { onCreate: vi.fn(), onSolo: vi.fn(), onDismiss: vi.fn() };
  render(<AnnouncerProvider><PlayOptions entry={entry} creating={false} {...handlers} {...props} /></AnnouncerProvider>);
  return handlers;
}

describe('PlayOptions', () => {
  it('offers both modes for a game that supports both', () => {
    const handlers = show(bothModes);
    fireEvent.click(screen.getByRole('button', { name: 'Play against AI' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create private room' }));
    expect(handlers.onSolo).toHaveBeenCalled();
    expect(handlers.onCreate).toHaveBeenCalled();
    expect(screen.queryByText(/not available for this game/)).toBeNull();
  });

  it('offers only online rooms and says solo is unavailable', () => {
    show(onlineOnly);
    expect(screen.queryByRole('button', { name: 'Play against AI' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Create private room' })).toBeInTheDocument();
    expect(screen.getByText('Playing against the AI is not available for this game.')).toBeInTheDocument();
  });

  it('offers only solo play and says private rooms are unavailable', () => {
    show(soloOnly);
    expect(screen.getByRole('button', { name: 'Play against AI' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create private room' })).toBeNull();
    expect(screen.getByText('Private rooms are not available for this game.')).toBeInTheDocument();
  });

  it('moves focus to the panel heading and announces the options', () => {
    show(bothModes);
    expect(screen.getByRole('heading', { name: /Both Game: choose how to play/ })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Play options for Both Game are available.');
  });

  it('has a dismiss control, and shows children only while creating', () => {
    const handlers = show(bothModes, { creating: true, children: <p>create controls</p> });
    expect(screen.getByText('create controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create private room' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Choose a different game' }));
    expect(handlers.onDismiss).toHaveBeenCalled();
  });

  it('hides children when not creating', () => {
    show(bothModes, { children: <p>create controls</p> });
    expect(screen.queryByText('create controls')).toBeNull();
  });
});

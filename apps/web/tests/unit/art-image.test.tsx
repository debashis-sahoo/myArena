import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from '@myarena/protocol';
import { GameArt } from '../../src/features/landing/GameArt';
import { GameTile } from '../../src/features/landing/GameTile';
import { PlayOptions } from '../../src/features/landing/PlayOptions';
import { bothModes } from './catalog-fixtures';

const pictured: CatalogEntry = { ...bothModes, id: 'ludo', name: 'Ludo', art: { icon: 'TARGET', palette: 'CRIMSON', image: 'LUDO' } };
const noop = () => undefined;

describe('game art picture', () => {
  it('renders a decorative image in a fixed-aspect banner when the entry has a picture', () => {
    const { container } = render(<GameArt art={pictured.art} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('src')).toBeTruthy();
    expect(img?.getAttribute('decoding')).toBe('async');
    expect(container.querySelector('.art--picture')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('swaps in the icon art when the picture fails to load', () => {
    const { container } = render(<GameArt art={pictured.art} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('.art--crimson')).not.toBeNull();
  });

  it('renders entries without a picture exactly as before', () => {
    const { container } = render(<GameArt art={bothModes.art} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.art--violet svg')).not.toBeNull();
    expect(container.querySelector('.art--picture')).toBeNull();
  });

  it('uses the small size in the play options header', () => {
    const { container } = render(<PlayOptions entry={pictured} creating={false} onCreate={noop} onSolo={noop} onDismiss={noop} />);
    expect(container.querySelector('.options-head .art--picture.art--mini img')).not.toBeNull();
  });

  it('keeps the tile name to its title, status and details, without the picture', () => {
    render(<GameTile entry={pictured} selected={false} onSelect={noop} onUnavailable={noop} />);
    const tile = screen.getByRole('button', { name: /Ludo/ });
    expect(tile.querySelector('img')).not.toBeNull();
    expect(tile.getAttribute('aria-labelledby')).not.toContain('art');
    expect(screen.queryByRole('img')).toBeNull();
  });
});

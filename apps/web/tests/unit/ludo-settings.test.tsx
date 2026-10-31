import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomSettings } from '@myarena/protocol';
import { LudoSettings } from '../../src/features/ludo/settings/LudoSettings';

afterEach(cleanup);

const settings = (gameSettings: RoomSettings['gameSettings'] = { theme: 'classic', turnLimitSeconds: 60 }, maxParticipants = 4): RoomSettings =>
  ({ maxParticipants, gameSettings } as RoomSettings);

const show = (options: { isHost?: boolean; editable?: boolean; seats?: number; run?: (intent: unknown) => Promise<string | null>; settings?: RoomSettings } = {}) => {
  const run = vi.fn(options.run ?? (async () => null));
  render(<LudoSettings settings={options.settings ?? settings()} isHost={options.isHost ?? true} editable={options.editable ?? true} seats={options.seats ?? 1} run={run as never} />);
  return run;
};

describe('Ludo settings', () => {
  it('lets the host pick a theme from a radio group with a preview for each', () => {
    show();
    const group = screen.getByRole('group', { name: 'Theme' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.parentElement?.textContent)).toEqual([
      expect.stringContaining('Classic'), expect.stringContaining('Super Heroes'), expect.stringContaining('Halloween'),
      expect.stringContaining('Diwali'), expect.stringContaining('Winter Holidays'),
    ]);
    expect(group.querySelectorAll('svg.ludo-theme-preview')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /Classic/ })).toBeChecked();
    // Native radios share one name, so the arrow keys move between them in the browser.
    expect(new Set(radios.map((radio) => radio.getAttribute('name'))).size).toBe(1);
  });

  it('sends the chosen theme as a settings update', async () => {
    const run = show();
    fireEvent.click(screen.getByRole('radio', { name: /Diwali/ }));
    await waitFor(() => expect(run).toHaveBeenCalledWith({ type: 'settings.update', changes: { gameSettings: { theme: 'diwali', turnLimitSeconds: 60 } } }));
  });

  it('sends a turn limit and a room size bounded to 2 to 4 and never below the people already seated', async () => {
    const run = show({ seats: 3 });
    expect(within(screen.getByRole('group', { name: 'Maximum players' })).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['3', '4']);
    fireEvent.click(screen.getByRole('radio', { name: '90 seconds' }));
    await waitFor(() => expect(run).toHaveBeenCalledWith({ type: 'settings.update', changes: { gameSettings: { theme: 'classic', turnLimitSeconds: 90 } } }));
    fireEvent.click(screen.getByRole('radio', { name: 'No limit' }));
    await waitFor(() => expect(run).toHaveBeenLastCalledWith({ type: 'settings.update', changes: { gameSettings: { theme: 'classic', turnLimitSeconds: 0 } } }));
  });

  it('shows read-only lines to everyone else and to anyone during a match', () => {
    for (const options of [{ isHost: false }, { isHost: true, editable: false }]) {
      show({ ...options, settings: settings({ theme: 'winter', turnLimitSeconds: 0 }, 3) });
      expect(screen.getByText('Maximum players: 3')).toBeInTheDocument();
      expect(screen.getByText('Theme: Winter Holidays')).toBeInTheDocument();
      expect(screen.getByText('Turn limit: No limit')).toBeInTheDocument();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      cleanup();
    }
  });

  it('shows a server error in an alert', async () => {
    show({ run: async () => 'Only the host can change the room settings.' });
    fireEvent.click(screen.getByRole('radio', { name: /Halloween/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only the host can change the room settings.');
  });

  it('does not import any 3D code', () => {
    for (const file of ['settings/LudoSettings.tsx', 'themes/ThemePicker.tsx', 'themes/ThemePreview.tsx', 'themes/themes.ts']) {
      const source = readFileSync(join(import.meta.dirname, `../../src/features/ludo/${file}`), 'utf8');
      expect(source, file).not.toMatch(/from 'three|\/scene\//);
    }
  });
});

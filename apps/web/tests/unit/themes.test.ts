import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLORS, THEME_IDS, createMatch, legalPawns, toMatchView } from '@myarena/ludo';
import { Board2D } from '../../src/features/ludo/view/Board2D';
import { placePawns } from '../../src/features/ludo/view/placement';
import { themeList, themes } from '../../src/features/ludo/themes/themes';

const css = readFileSync(join(import.meta.dirname, '../../src/styles/ludo-themes.css'), 'utf8');
const engineDir = join(import.meta.dirname, '../../../../packages/ludo/src');

describe('themes', () => {
  it('has exactly the five themes, each with a name, a description and four distinct colours', () => {
    expect(themeList.map((theme) => theme.id)).toEqual(['classic', 'super-heroes', 'halloween', 'diwali', 'winter']);
    expect([...THEME_IDS]).toEqual(themeList.map((theme) => theme.id));
    for (const theme of themeList) {
      expect(theme.name.length).toBeGreaterThan(2);
      expect(theme.description.length).toBeGreaterThan(10);
      expect(new Set(COLORS.map((color) => theme.palette[color])).size).toBe(4);
    }
  });

  it('gives each theme its own palette', () => {
    const keys = themeList.map((theme) => COLORS.map((color) => theme.palette[color]).join());
    expect(new Set(keys).size).toBe(themeList.length);
  });

  it('keeps the four player colours different from the board, the squares and the yards', () => {
    for (const theme of themeList) {
      const tints = [theme.board.surface, theme.board.cell, theme.board.yard].map((tint) => tint.toLowerCase());
      for (const color of COLORS) expect(tints, `${theme.id} ${color}`).not.toContain(theme.palette[color].toLowerCase());
    }
  });

  it('keeps the flat stylesheet in step with the theme data', () => {
    for (const theme of themeList) {
      const block = new RegExp(`\\[data-theme="${theme.id}"\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      for (const color of COLORS) expect(block, `${theme.id} ${color}`).toContain(`--ludo-${color.toLowerCase()}: ${theme.palette[color]}`);
      expect(block).toContain(`--ludo-board: ${theme.board.surface}`);
      expect(block).toContain(`--ludo-cell: ${theme.board.cell}`);
      expect(block).toContain(`--ludo-line: ${theme.board.line}`);
      expect(block).toContain(`--ludo-ink: ${theme.board.ink}`);
      expect(block).toContain(`--ludo-yard: ${theme.board.yard}`);
      expect(theme.id === 'classic' || theme.decor.length > 0, theme.id).toBe(true);
    }
  });

  it('keeps head marks and protected-square stars in every theme, and never draws a pawn number', () => {
    const state = createMatch(Array.from({ length: 4 }, (_, index) => ({ kind: 'HUMAN' as const, label: `P${index}` })), 0);
    const view = toMatchView(state, { theme: 'classic', turnLimitSeconds: 60, you: 0, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
    for (const id of THEME_IDS) {
      const themed = { ...view, theme: id };
      const { container, unmount } = render(createElement('div', { 'data-theme': id }, createElement(Board2D, { view: themed, placed: placePawns(themed, new Set()) })));
      expect(container.querySelectorAll('.ludo-pin-mark')).toHaveLength(16);
      expect(container.querySelectorAll('.ludo-star')).toHaveLength(4);
      expect(container.querySelector('.ludo-pin text')).toBeNull();
      unmount();
    }
    expect(screen.queryByText('nope')).toBeNull();
  });

  it('does not take theme data from the engine, so a look can be added without touching it', () => {
    for (const file of readdirSync(engineDir)) {
      if (!file.endsWith('.ts')) continue;
      const source = readFileSync(join(engineDir, file), 'utf8');
      expect(source, file).not.toMatch(/palette|celebration|from '\.\/themes/);
    }
    expect(Object.keys(themes)).toHaveLength(5);
  });
});

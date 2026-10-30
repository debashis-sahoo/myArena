// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const themes = readFileSync(new URL('../../src/styles/themes.css', import.meta.url), 'utf8');

function tokensOf(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)) result[match[1]!] = match[2]!;
  return result;
}

// The light block, the dark media-query block and the explicit dark block.
const light = tokensOf(themes.slice(0, themes.indexOf('@media')));
const darkAuto = tokensOf(themes.slice(themes.indexOf('@media'), themes.indexOf(':root[data-theme="dark"]')));
const dark = tokensOf(themes.slice(themes.indexOf(':root[data-theme="dark"]')));

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
const ratio = (a: string | undefined, b: string | undefined) => {
  if (!a || !b) throw new Error(`missing token: ${String(a)} ${String(b)} in ${Object.keys(light).join(',')}`);
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const themeList: [string, Record<string, string>][] = [['light', light], ['dark (explicit)', dark], ['dark (system)', darkAuto]];

for (const [name, t] of themeList) describe(`${name} theme contrast`, () => {
  it('keeps text at least 4.5:1 on the page and on surfaces', () => {
    for (const [fg, bg] of [['text', 'background'], ['text', 'surface'], ['text', 'surface-raised'], ['muted', 'background'], ['muted', 'surface'], ['muted', 'surface-raised'], ['danger', 'surface'], ['accent', 'surface'], ['on-accent', 'accent']] as const) {
      expect(ratio(t[fg]!, t[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps borders and the focus ring at least 3:1 on adjacent surfaces', () => {
    for (const [fg, bg] of [['line', 'background'], ['line', 'surface'], ['focus', 'background'], ['focus', 'surface']] as const) {
      expect(ratio(t[fg]!, t[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('theme tokens', () => {
  it('defines the same tokens in every theme', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    expect(Object.keys(darkAuto).sort()).toEqual(Object.keys(light).sort());
  });
});

import { ART_ICONS, ART_IMAGES, ART_PALETTES, GAME_MODES, type GameLifecycle } from '@myarena/game-sdk';
import { artIcons, artImages, artPalettes, gameModes } from '@myarena/protocol';
import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../../src/games/catalog.js';
import { GameRegistry } from '../../src/games/registry.js';
import { roadmap } from '../../src/games/roadmap.js';
import { createOnlineStubGame, createStubGame } from '../../src/games/stub-game.js';

const withDescriptor = (overrides: Record<string, unknown>): GameLifecycle => createStubGame({ descriptor: overrides });

describe('game registry descriptor validation', () => {
  it.each([
    ['an id with capitals', { id: 'Bad' }],
    ['a minimum below 1', { minParticipants: 0 }],
    ['a maximum above 100', { maxParticipants: 101 }],
    ['a maximum below the minimum', { minParticipants: 5, maxParticipants: 4 }],
    ['an empty description', { description: '' }],
    ['a description over 200 characters', { description: 'x'.repeat(201) }],
    ['a category over 30 characters', { category: 'x'.repeat(31) }],
    ['a duration above 600', { durationMinutes: { min: 1, max: 601 } }],
    ['a duration with min above max', { durationMinutes: { min: 5, max: 4 } }],
    ['no modes', { modes: [] }],
    ['duplicate modes', { modes: ['ONLINE', 'ONLINE'] }],
    ['a default outside the range', { defaultParticipants: 101 }],
    ['a default below 2', { defaultParticipants: 1 }],
    ['an unknown icon', { art: { icon: 'NOPE', palette: 'SLATE' } }],
    ['an unknown palette', { art: { icon: 'FLASK', palette: 'NOPE' } }],
    ['an unknown art image', { art: { icon: 'FLASK', palette: 'SLATE', image: 'NOPE' } }],
  ])('rejects %s', (_label, overrides) => {
    expect(() => new GameRegistry([withDescriptor(overrides)])).toThrow();
  });

  it('accepts a named art image and carries it into the catalog entry', () => {
    const registry = new GameRegistry([withDescriptor({ id: 'pictured', art: { icon: 'TARGET', palette: 'CRIMSON', image: 'LUDO' } })]);
    expect(buildCatalog(registry).entries[0]).toMatchObject({ id: 'pictured', art: { icon: 'TARGET', palette: 'CRIMSON', image: 'LUDO' } });
  });

  it('keeps the SDK and protocol art image names identical', () => {
    expect([...ART_IMAGES]).toEqual([...artImages]);
  });

  it('rejects duplicate ids', () => {
    expect(() => new GameRegistry([createStubGame(), createStubGame()])).toThrow();
  });

  it('lists only online-capable games for rooms but keeps solo-only games in the descriptors', () => {
    const solo = withDescriptor({ id: 'solo-only', modes: ['SOLO_AI'] });
    const registry = new GameRegistry([createStubGame(), solo]);
    expect(registry.list().map((game) => game.id)).toEqual(['test-stub']);
    expect(registry.descriptors().map((game) => game.id)).toEqual(['test-stub', 'solo-only']);
  });
});

describe('catalog assembly', () => {
  it('puts playable games first in registration order, then the roadmap', () => {
    const { entries } = buildCatalog(new GameRegistry([createStubGame(), createOnlineStubGame()]));
    expect(entries.slice(0, 2).map((entry) => [entry.id, entry.status, entry.test])).toEqual([
      ['test-stub', 'PLAYABLE', true], ['test-online', 'PLAYABLE', true],
    ]);
    expect(entries.slice(2).map((entry) => entry.id)).toEqual(roadmap.map((entry) => entry.id));
    expect(entries.slice(2).every((entry) => entry.status === 'COMING_SOON')).toBe(true);
  });

  it('shows only coming-soon entries when no game is registered', () => {
    const { entries } = buildCatalog(new GameRegistry());
    expect(entries).toHaveLength(roadmap.length);
    expect(entries.every((entry) => entry.status === 'COMING_SOON' && !entry.test)).toBe(true);
  });

  it('lets a registered game take over the roadmap entry with the same id', () => {
    const { entries } = buildCatalog(new GameRegistry([withDescriptor({ id: 'tambola', name: 'Tambola' })]));
    expect(entries.filter((entry) => entry.id === 'tambola')).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 'tambola', status: 'PLAYABLE' });
  });

  it('defaults the participant count to the game default, else the maximum capped at 100', () => {
    const { entries } = buildCatalog(new GameRegistry([createStubGame(), createOnlineStubGame()]));
    expect(entries.find((entry) => entry.id === 'test-stub')?.defaultParticipants).toBe(100);
    expect(entries.find((entry) => entry.id === 'test-online')?.defaultParticipants).toBe(4);
  });

  it('keeps the SDK and protocol vocabularies identical', () => {
    expect([...artIcons]).toEqual([...ART_ICONS]);
    expect([...artPalettes]).toEqual([...ART_PALETTES]);
    expect([...gameModes]).toEqual([...GAME_MODES]);
  });
});

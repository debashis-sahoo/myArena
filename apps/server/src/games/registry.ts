import type { GameDescriptor, GameLifecycle } from '@myarena/game-sdk';
import { ART_ICONS, ART_IMAGES, ART_PALETTES, GAME_MODES } from '@myarena/game-sdk';

const idPattern = /^[a-z0-9-]{1,40}$/;

function validate(descriptor: GameDescriptor): void {
  const { id, minParticipants: min, maxParticipants: max, description, category, durationMinutes, modes, defaultParticipants, art } = descriptor;
  const lo = Math.max(2, min);
  const hi = Math.min(100, max);
  const valid = idPattern.test(id)
    && Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min && max <= 100
    && description.length >= 1 && description.length <= 200
    && category.length >= 1 && category.length <= 30
    && Number.isInteger(durationMinutes.min) && Number.isInteger(durationMinutes.max)
    && durationMinutes.min >= 1 && durationMinutes.max <= 600 && durationMinutes.min <= durationMinutes.max
    && modes.length > 0 && new Set(modes).size === modes.length && modes.every((mode) => GAME_MODES.includes(mode))
    && (defaultParticipants === undefined || (Number.isInteger(defaultParticipants) && defaultParticipants >= lo && defaultParticipants <= hi))
    && ART_ICONS.includes(art.icon) && ART_PALETTES.includes(art.palette)
    && (art.image === undefined || ART_IMAGES.includes(art.image));
  if (!valid) throw new Error('Invalid or duplicate game descriptor.');
}

export class GameRegistry {
  private readonly games = new Map<string, GameLifecycle>();
  constructor(games: GameLifecycle[] = []) {
    for (const game of games) {
      validate(game.descriptor);
      if (this.games.has(game.descriptor.id)) throw new Error('Invalid or duplicate game descriptor.');
      this.games.set(game.descriptor.id, game);
    }
  }
  get(id: string): GameLifecycle | undefined { return this.games.get(id); }
  descriptors(): GameDescriptor[] { return Array.from(this.games.values(), ({ descriptor }) => descriptor); }
  // Games a room can select; solo-only games are not listed.
  list() {
    return this.descriptors().filter(({ modes }) => modes.includes('ONLINE')).map((descriptor) => ({
      id: descriptor.id, name: descriptor.name,
      minParticipants: descriptor.minParticipants, maxParticipants: descriptor.maxParticipants,
    }));
  }
}

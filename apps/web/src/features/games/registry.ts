import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { LobbyView, RoomSettings } from '@myarena/protocol';
import type { GameState } from '../../platform/room-state';
import type { RunIntent } from '../lobby/useRoom';

export interface GameSettingsProps {
  settings: RoomSettings;
  isHost: boolean;
  /** True only while the room is in the lobby. */
  editable: boolean;
  seats: number;
  run: RunIntent;
}

export interface GameMatchProps {
  lobby: LobbyView;
  game: GameState | null;
  run: RunIntent;
}

export interface OnlineGameModule {
  Settings: ComponentType<GameSettingsProps>;
  Match: ComponentType<GameMatchProps>;
}

export type OnlineGameLoader = () => Promise<{ default: OnlineGameModule }>;

// Each game feature adds its own lazily loaded module here; none is loaded until a room selects that game.
export const onlineGameRegistry: Record<string, OnlineGameLoader> = {
  ludo: () => import('../ludo'),
};

interface OnlineGameComponents {
  Settings: LazyExoticComponent<ComponentType<GameSettingsProps>>;
  Match: LazyExoticComponent<ComponentType<GameMatchProps>>;
}

const cache = new Map<string, OnlineGameComponents>();

/** Lazy components for a game with an online module, or null so the room keeps the generic screens. */
export function onlineGame(gameId: string | null): OnlineGameComponents | null {
  if (!gameId || !Object.hasOwn(onlineGameRegistry, gameId)) return null;
  let entry = cache.get(gameId);
  if (!entry) {
    const load = onlineGameRegistry[gameId]!;
    let pending: ReturnType<OnlineGameLoader> | undefined;
    const once = () => (pending ??= load());
    entry = {
      Settings: lazy(async () => ({ default: (await once()).default.Settings })),
      Match: lazy(async () => ({ default: (await once()).default.Match })),
    };
    cache.set(gameId, entry);
  }
  return entry;
}

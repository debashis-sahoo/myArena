import type { ComponentType } from 'react';

export interface SoloGameProps {
  displayName: string;
  soundEnabled: boolean;
  effectsEnabled: boolean;
  onExit: () => void;
}

export type SoloGameComponent = ComponentType<SoloGameProps>;
export type SoloLoader = () => Promise<{ default: SoloGameComponent }>;

// Each game feature adds its own lazily loaded solo module here; none is loaded until chosen.
export const soloRegistry: Record<string, SoloLoader> = {
  'test-stub': () => import('./test-game/TestSolo'),
  ludo: () => import('../ludo/solo/LudoSolo'),
};

export const loadSoloGame = (gameId: string): Promise<{ default: SoloGameComponent }> | null =>
  Object.hasOwn(soloRegistry, gameId) ? soloRegistry[gameId]!() : null;

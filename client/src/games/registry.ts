import type { ComponentType } from 'react';
import { LudoScreen, type MatchScreenProps } from './ludo/LudoScreen';
import { PlaceholderBoard } from './placeholder/PlaceholderBoard';
import type { GameBoardProps } from './types';

/** Maps a game id to its board component. A new game adds one entry here; the room shell does not change. */
const boards: Record<string, ComponentType<GameBoardProps>> = {
  ludo: PlaceholderBoard,
};

/** A game may take over the whole screen while its match is in progress (chat, lobby, and status screens stay the platform's). */
const matchScreens: Record<string, ComponentType<MatchScreenProps>> = {
  ludo: LudoScreen,
};

export function getMatchScreen(gameId: string): ComponentType<MatchScreenProps> | undefined {
  return matchScreens[gameId];
}

export function getBoard(gameId: string): ComponentType<GameBoardProps> {
  return boards[gameId] ?? PlaceholderBoard;
}

import type { ComponentType } from 'react';
import { PlaceholderBoard } from './placeholder/PlaceholderBoard';
import type { GameBoardProps } from './types';

/** Maps a game id to its board component. A new game adds one entry here; the room shell does not change. */
const boards: Record<string, ComponentType<GameBoardProps>> = {
  ludo: PlaceholderBoard,
};

export function getBoard(gameId: string): ComponentType<GameBoardProps> {
  return boards[gameId] ?? PlaceholderBoard;
}

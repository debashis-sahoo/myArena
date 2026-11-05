import type { ComponentType } from 'react';
import { LudoScreen, type MatchScreenProps } from './ludo/LudoScreen';
import './housie/housieStore';
import { HousieLobby } from './housie/HousieLobby';
import { HousieScreen } from './housie/HousieScreen';
import './bingo/bingoStore';
import { BingoLobby } from './bingo/BingoLobby';
import { BingoScreen } from './bingo/BingoScreen';
import { PlaceholderBoard } from './placeholder/PlaceholderBoard';
import type { GameBoardProps } from './types';

/** Maps a game id to its board component. A new game adds one entry here; the room shell does not change. */
const boards: Record<string, ComponentType<GameBoardProps>> = {
  ludo: PlaceholderBoard,
};

/** A game may take over the whole screen while its match is in progress (chat, lobby, and status screens stay the platform's). */
const matchScreens: Record<string, ComponentType<MatchScreenProps>> = {
  ludo: LudoScreen,
  housie: HousieScreen,
  bingo: BingoScreen,
};

export function getMatchScreen(gameId: string): ComponentType<MatchScreenProps> | undefined {
  return matchScreens[gameId];
}

/** A game may also take over the lobby screen (setup before the match); the platform keeps invite, roster and chat components. */
const lobbyScreens: Record<string, ComponentType<MatchScreenProps>> = {};

export function registerLobbyScreen(gameId: string, screen: ComponentType<MatchScreenProps>): void {
  lobbyScreens[gameId] = screen;
}

export function getLobbyScreen(gameId: string): ComponentType<MatchScreenProps> | undefined {
  return lobbyScreens[gameId];
}

export { getGameFeed } from './feeds';

registerLobbyScreen('housie', HousieLobby);
registerLobbyScreen('bingo', BingoLobby);

export function getBoard(gameId: string): ComponentType<GameBoardProps> {
  return boards[gameId] ?? PlaceholderBoard;
}

import {
  AUTO_INTERVALS_MS,
  BINGO_CARD_CEILING_MAX,
  BINGO_DEFAULT_CARD_CEILING,
  BINGO_DEFAULT_PATTERN_IDS,
  BINGO_PATTERNS,
  type BingoAction,
  type BingoLobby,
} from '@myarena/shared';
import type { ActionResult, MatchSeat } from '../registry.js';

const DEFAULT_AUTO_MS = 8000;
const NOT_HOST: ActionResult = { ok: false, reason: 'Only the host can do that.' };

export function createDefaultLobby(): BingoLobby {
  return {
    ceiling: BINGO_DEFAULT_CARD_CEILING,
    hostPlays: true,
    patterns: [...BINGO_DEFAULT_PATTERN_IDS],
    caller: { mode: 'manual' },
    choices: {},
  };
}

/** Cards a person takes: their explicit choice, else 1, never above the ceiling. */
export function cardsFor(lobby: BingoLobby, playerId: string): number {
  return Math.min(Math.max(lobby.choices[playerId] ?? 1, 1), lobby.ceiling);
}

export function applyLobbyAction(
  lobby: BingoLobby,
  who: { playerId: string; isHost: boolean },
  action: BingoAction,
): ActionResult {
  switch (action.type) {
    case 'setCeiling': {
      if (!who.isHost) return NOT_HOST;
      if (!Number.isInteger(action.value) || action.value < 1 || action.value > BINGO_CARD_CEILING_MAX) {
        return { ok: false, reason: `Choose 1 to ${BINGO_CARD_CEILING_MAX} cards.` };
      }
      lobby.ceiling = action.value;
      for (const [id, count] of Object.entries(lobby.choices)) {
        if (count > lobby.ceiling) lobby.choices[id] = lobby.ceiling;
      }
      return { ok: true };
    }
    case 'setHostPlays': {
      if (!who.isHost) return NOT_HOST;
      lobby.hostPlays = action.value;
      if (action.value) lobby.choices[who.playerId] ??= 1;
      else delete lobby.choices[who.playerId];
      return { ok: true };
    }
    case 'setPatterns': {
      if (!who.isHost) return NOT_HOST;
      const ids = new Set(action.ids);
      if (ids.size !== action.ids.length) return { ok: false, reason: 'Each pattern can be picked once.' };
      const known = new Set(BINGO_PATTERNS.map((p) => p.id));
      if (action.ids.some((id) => !known.has(id))) return { ok: false, reason: 'Unknown pattern.' };
      lobby.patterns = BINGO_PATTERNS.filter((p) => ids.has(p.id)).map((p) => p.id);
      return { ok: true };
    }
    case 'setCaller': {
      if (!who.isHost) return NOT_HOST;
      if (action.mode === 'manual') {
        lobby.caller = { mode: 'manual' };
        return { ok: true };
      }
      const interval = action.intervalMs ?? DEFAULT_AUTO_MS;
      if (!(AUTO_INTERVALS_MS as readonly number[]).includes(interval)) {
        return { ok: false, reason: 'Choose 5, 8 or 10 seconds.' };
      }
      lobby.caller = { mode: 'auto', intervalMs: interval };
      return { ok: true };
    }
    case 'setCards': {
      if (who.isHost && !lobby.hostPlays) return { ok: false, reason: 'You are only calling this match.' };
      if (!Number.isInteger(action.count) || action.count < 1 || action.count > lobby.ceiling) {
        return { ok: false, reason: `Choose 1 to ${lobby.ceiling} cards.` };
      }
      lobby.choices[who.playerId] = action.count;
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'The match has not started.' };
  }
}

export function onLobbyLeave(lobby: BingoLobby, playerId: string): void {
  delete lobby.choices[playerId];
}

export function validateLobbyStart(lobby: BingoLobby, seated: MatchSeat[]): string | null {
  if (lobby.patterns.length < 1) return 'Pick at least one pattern.';
  if (seated.length < 2) return 'Wait for at least one more person.';
  return null;
}

/** Public view: settings and explicit choices only (a person without an entry has 1 card). */
export function lobbyView(lobby: BingoLobby): BingoLobby {
  return {
    ceiling: lobby.ceiling,
    hostPlays: lobby.hostPlays,
    patterns: [...lobby.patterns],
    caller: { ...lobby.caller },
    choices: { ...lobby.choices },
  };
}

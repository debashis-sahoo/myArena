import {
  AUTO_INTERVALS_MS,
  DEFAULT_PATTERN_IDS,
  DEFAULT_TICKET_CEILING,
  PATTERNS,
  TICKET_CEILING_MAX,
  type HousieAction,
  type HousieLobby,
} from '@myarena/shared';
import type { ActionResult, MatchSeat } from '../registry.js';

const DEFAULT_AUTO_MS = 8000;

export function createDefaultLobby(): HousieLobby {
  return {
    ceiling: DEFAULT_TICKET_CEILING,
    hostPlays: true,
    patterns: [...DEFAULT_PATTERN_IDS],
    caller: { mode: 'manual' },
    choices: {},
  };
}

/** Tickets a person takes: their explicit choice, else 1, never above the ceiling. */
export function ticketsFor(lobby: HousieLobby, playerId: string): number {
  return Math.min(Math.max(lobby.choices[playerId] ?? 1, 1), lobby.ceiling);
}

const NOT_HOST: ActionResult = { ok: false, reason: 'Only the host can do that.' };

export function applyLobbyAction(
  lobby: HousieLobby,
  who: { playerId: string; isHost: boolean },
  action: HousieAction,
): ActionResult {
  switch (action.type) {
    case 'setCeiling': {
      if (!who.isHost) return NOT_HOST;
      lobby.ceiling = Math.min(Math.max(action.value, 1), TICKET_CEILING_MAX);
      for (const [id, count] of Object.entries(lobby.choices)) {
        if (count > lobby.ceiling) lobby.choices[id] = lobby.ceiling;
      }
      return { ok: true };
    }
    case 'setHostPlays': {
      if (!who.isHost) return NOT_HOST;
      lobby.hostPlays = action.value;
      if (!action.value) delete lobby.choices[who.playerId];
      return { ok: true };
    }
    case 'setPatterns': {
      if (!who.isHost) return NOT_HOST;
      const ids = new Set(action.ids);
      if (ids.size !== action.ids.length) return { ok: false, reason: 'Each combination can be picked once.' };
      const known = new Set(PATTERNS.map((p) => p.id));
      if (action.ids.some((id) => !known.has(id))) return { ok: false, reason: 'Unknown combination.' };
      lobby.patterns = PATTERNS.filter((p) => ids.has(p.id)).map((p) => p.id);
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
    case 'setTickets': {
      if (who.isHost && !lobby.hostPlays) return { ok: false, reason: 'You are only calling this match.' };
      if (action.count < 1 || action.count > lobby.ceiling) {
        return { ok: false, reason: `Choose 1 to ${lobby.ceiling} tickets.` };
      }
      lobby.choices[who.playerId] = action.count;
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'The match has not started.' };
  }
}

export function onLobbyLeave(lobby: HousieLobby, playerId: string): void {
  delete lobby.choices[playerId];
}

export function validateLobbyStart(lobby: HousieLobby, seated: MatchSeat[]): string | null {
  if (lobby.patterns.length < 1) return 'Pick at least one combination.';
  if (seated.length < 2) return 'Wait for at least one more person.';
  return null;
}

/** Public view: settings and explicit choices only (a person without an entry has 1 ticket). */
export function lobbyView(lobby: HousieLobby): HousieLobby {
  return {
    ceiling: lobby.ceiling,
    hostPlays: lobby.hostPlays,
    patterns: [...lobby.patterns],
    caller: { ...lobby.caller },
    choices: { ...lobby.choices },
  };
}

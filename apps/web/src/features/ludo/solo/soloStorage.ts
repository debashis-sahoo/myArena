import {
  COLORS, DEFAULT_DIFFICULTY, DEFAULT_THEME, DIFFICULTIES, THEME_IDS, colorsFor,
  type Difficulty, type MatchState, type ThemeId,
} from '@myarena/ludo';

export interface SoloSettings { opponents: 1 | 2 | 3; difficulty: Difficulty; theme: ThemeId; }
export interface SavedSolo { savedAt: number; settings: SoloSettings; state: MatchState; }

export const SAVE_KEY = 'myarena-ludo-solo';
export const SETUP_KEY = 'myarena-ludo-solo-setup';
export const SAVE_MAX_AGE_MS = 30 * 60 * 1000;
const SAVE_MAX_CHARS = 10_000;

export const DEFAULT_SETUP: SoloSettings = { opponents: 1, difficulty: DEFAULT_DIFFICULTY, theme: DEFAULT_THEME };

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function isSoloSettings(value: unknown): value is SoloSettings {
  if (typeof value !== 'object' || value === null) return false;
  const { opponents, difficulty, theme } = value as Record<string, unknown>;
  return (opponents === 1 || opponents === 2 || opponents === 3)
    && DIFFICULTIES.includes(difficulty as Difficulty) && THEME_IDS.includes(theme as ThemeId);
}

/** A saved state is only trusted when it has exactly the shape the engine produces. */
export function isMatchState(value: unknown): value is MatchState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<MatchState>;
  if (!Array.isArray(state.seats) || state.seats.length < 2 || state.seats.length > 4) return false;
  const colors = colorsFor(state.seats.length);
  const seatsOk = state.seats.every((seat, index) => typeof seat === 'object' && seat !== null
    && seat.color === colors[index] && COLORS.includes(seat.color)
    && (seat.kind === 'HUMAN' || seat.kind === 'COMPUTER')
    && typeof seat.label === 'string' && seat.label.length <= 60
    && Array.isArray(seat.pawns) && seat.pawns.length === 4 && seat.pawns.every((step) => isInt(step, -1, 56))
    && typeof seat.away === 'boolean' && typeof seat.left === 'boolean' && isInt(seat.missed, 0, 3));
  if (!seatsOk) return false;
  const phaseOk = state.phase === 'ROLL' || state.phase === 'MOVE' || state.phase === 'ENDED';
  const currentOk = state.current === null || isInt(state.current, 0, state.seats.length - 1);
  const winnerOk = state.winner === null || isInt(state.winner, 0, state.seats.length - 1);
  const diceOk = state.dice === null || isInt(state.dice, 1, 6);
  const logOk = Array.isArray(state.log) && state.log.length <= 50
    && state.log.every((entry) => typeof entry === 'object' && entry !== null && typeof entry.n === 'number' && typeof entry.text === 'string');
  return phaseOk && currentOk && winnerOk && diceOk && logOk
    && isInt(state.sixesInRow, 0, 2) && typeof state.forfeit === 'boolean' && typeof state.logCount === 'number'
    && (state.phase === 'ENDED') === (state.current === null)
    && (state.phase === 'MOVE') === (state.dice !== null);
}

const read = (key: string): unknown => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch { return null; }
};
const write = (key: string, value: unknown): void => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be blocked or full */ }
};
const remove = (key: string): void => {
  try { window.localStorage.removeItem(key); } catch { /* storage may be blocked */ }
};

export function loadSetup(): SoloSettings {
  const value = read(SETUP_KEY);
  return isSoloSettings(value) ? value : DEFAULT_SETUP;
}
export const saveSetup = (settings: SoloSettings): void => write(SETUP_KEY, settings);

/** The saved match, or null when there is none, it is invalid or it is older than 30 minutes (then it is discarded). */
export function loadSaved(now: number): SavedSolo | null {
  const value = read(SAVE_KEY) as Partial<SavedSolo> | null;
  if (value === null) return null;
  const fresh = typeof value.savedAt === 'number' && now - value.savedAt >= 0 && now - value.savedAt < SAVE_MAX_AGE_MS;
  if (!fresh || !isSoloSettings(value.settings) || !isMatchState(value.state) || value.state.phase === 'ENDED') {
    remove(SAVE_KEY);
    return null;
  }
  return { savedAt: value.savedAt as number, settings: value.settings, state: value.state };
}

export function save(settings: SoloSettings, state: MatchState, now: number): void {
  let kept = state;
  let text = JSON.stringify({ savedAt: now, settings, state: kept });
  // The log is the only part that grows; trim it so a save stays small.
  for (let keep = 25; text.length > SAVE_MAX_CHARS && keep >= 0; keep -= 5) {
    kept = { ...state, log: state.log.slice(-keep) };
    text = JSON.stringify({ savedAt: now, settings, state: kept });
  }
  try { window.localStorage.setItem(SAVE_KEY, text); } catch { /* storage may be blocked or full */ }
}

export const clearSaved = (): void => remove(SAVE_KEY);

import {
  BASE_PROGRESS,
  COLOR_ORDER,
  HOME_PROGRESS,
  PAWNS_PER_PLAYER,
  REMOVED_PROGRESS,
  RING_LENGTH,
  TURN_TIMER_MS,
  cellOf,
  isSafeRingIndex,
  ringIndexOf,
  type CapturedPawn,
  type LudoColor,
  type LudoState,
  type PlayerState,
  type SquareRef,
  type StandingEntry,
} from '@myarena/shared';

/** Colours by slot: 2 players are Yellow and Blue, 3 add Green, 4 use every corner (data-model.md). */
export function assignColors(count: number): LudoColor[] {
  if (count <= 2) return ['yellow', 'blue'].slice(0, count) as LudoColor[];
  if (count === 3) return ['yellow', 'green', 'blue'];
  return [...COLOR_ORDER];
}

export interface SeatInput {
  playerId: string;
  color: LudoColor;
  kind: 'human' | 'bot';
}

/** The state at match start; the first activity entry is added by the engine. */
export function createInitialState(seated: SeatInput[], turnMs: number = TURN_TIMER_MS): LudoState {
  const players: PlayerState[] = seated.map((s, i) => ({
    playerId: s.playerId,
    color: s.color,
    slot: i + 1,
    kind: s.kind,
    pawns: Array.from({ length: PAWNS_PER_PLAYER }, () => BASE_PROGRESS),
    home: 0,
    status: 'active',
  }));
  return {
    matchRev: 0,
    phase: 'waiting_roll',
    players,
    turn: players[0]?.playerId ?? null,
    bonus: false,
    roll: null,
    eligible: [],
    remainingMs: turnMs,
    sixStreak: 0,
    winner: null,
    standings: [],
    warning: null,
    lastPlayer: null,
    activity: [],
  };
}

export function playerOf(state: LudoState, playerId: string): PlayerState | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

/** Pawns of `playerId` that may use `roll`: base pawns only on a 6, and an exact finish. */
export function eligiblePawns(state: LudoState, playerId: string, roll: number): number[] {
  const player = playerOf(state, playerId);
  if (!player || player.status !== 'active') return [];
  const out: number[] = [];
  player.pawns.forEach((progress, index) => {
    if (progress === REMOVED_PROGRESS || progress >= HOME_PROGRESS) return;
    if (progress === BASE_PROGRESS) {
      if (roll === 6) out.push(index);
    } else if (progress + roll <= HOME_PROGRESS) {
      out.push(index);
    }
  });
  return out;
}

export interface MoveResult {
  from: number;
  to: number;
  path: SquareRef[];
  captured: CapturedPawn[];
  reachedHome: boolean;
  bonus: boolean;
}

/** Opposing pawns that a landing on `progress` would capture (ring squares that are not safe). */
function capturesAt(state: LudoState, player: PlayerState, progress: number): { other: PlayerState; pawn: number }[] {
  if (progress < 0 || progress > 50) return [];
  const idx = ringIndexOf(player.color, progress);
  if (isSafeRingIndex(idx)) return [];
  const hits: { other: PlayerState; pawn: number }[] = [];
  for (const other of state.players) {
    if (other.playerId === player.playerId || other.status !== 'active') continue;
    other.pawns.forEach((p, pawn) => {
      if (p >= 0 && p <= 50 && ringIndexOf(other.color, p) === idx) hits.push({ other, pawn });
    });
  }
  return hits;
}

/** Applies a validated move in place and describes it: one path square per hop, captures, and the bonus roll. */
export function applyMove(state: LudoState, playerId: string, pawn: number, roll: number): MoveResult {
  const player = playerOf(state, playerId);
  if (!player) throw new Error('unknown player');
  const from = player.pawns[pawn] as number;
  const leavingBase = from === BASE_PROGRESS;
  const to = leavingBase ? 0 : from + roll;

  const path: SquareRef[] = [];
  if (leavingBase) path.push(cellOf(player.color, 0));
  else for (let step = from + 1; step <= to; step++) path.push(cellOf(player.color, step));

  const captured: CapturedPawn[] = [];
  for (const hit of capturesAt(state, player, to)) {
    captured.push({ playerId: hit.other.playerId, pawn: hit.pawn, from: cellOf(hit.other.color, hit.other.pawns[hit.pawn] as number) });
    hit.other.pawns[hit.pawn] = BASE_PROGRESS;
  }

  player.pawns[pawn] = to;
  const reachedHome = to === HOME_PROGRESS;
  player.home = player.pawns.filter((p) => p === HOME_PROGRESS).length;
  return { from, to, path, captured, reachedHome, bonus: roll === 6 || captured.length > 0 || reachedHome };
}

/** The next active player after `fromPlayerId` in slot order, or null when nobody is active. */
export function nextActivePlayer(state: LudoState, fromPlayerId: string): string | null {
  const n = state.players.length;
  const start = state.players.findIndex((p) => p.playerId === fromPlayerId);
  for (let step = 1; step <= n; step++) {
    const candidate = state.players[(start + step + n) % n];
    if (candidate && candidate.status === 'active') return candidate.playerId;
  }
  return null;
}

export function winnerOf(state: LudoState): string | null {
  return state.players.find((p) => p.status === 'active' && p.home >= PAWNS_PER_PLAYER)?.playerId ?? null;
}

/** Ranked by pawns home, the winner first. */
export function standingsOf(state: LudoState): StandingEntry[] {
  const winner = winnerOf(state);
  return [...state.players]
    .sort((a, b) => Number(b.playerId === winner) - Number(a.playerId === winner) || b.home - a.home || a.slot - b.slot)
    .map((p, i) => ({ playerId: p.playerId, color: p.color, home: p.home, rank: i + 1 }));
}

interface Preview {
  to: number;
  captures: number;
  reachedHome: boolean;
  safe: boolean;
}

function preview(state: LudoState, player: PlayerState, pawn: number, roll: number): Preview {
  const from = player.pawns[pawn] as number;
  const to = from === BASE_PROGRESS ? 0 : from + roll;
  const safe = to > 50 || isSafeRingIndex(ringIndexOf(player.color, to));
  return { to, captures: capturesAt(state, player, to).length, reachedHome: to === HOME_PROGRESS, safe };
}

/** A pawn on a non-safe ring square with an opponent 1 to 6 squares behind it. */
function inDanger(state: LudoState, player: PlayerState, progress: number): boolean {
  if (progress < 0 || progress > 50) return false;
  const idx = ringIndexOf(player.color, progress);
  if (isSafeRingIndex(idx)) return false;
  for (const other of state.players) {
    if (other.playerId === player.playerId || other.status !== 'active') continue;
    for (const p of other.pawns) {
      if (p < 0 || p > 50) continue;
      const gap = (idx - ringIndexOf(other.color, p) + RING_LENGTH) % RING_LENGTH;
      if (gap >= 1 && gap <= 6) return true;
    }
  }
  return false;
}

/**
 * The shared priority list for bots and countdown auto-play (research R5): finish a pawn, capture, leave the base
 * on a 6, move a pawn that is in danger, land on a safe square, otherwise advance the pawn with the most progress.
 */
export function chooseAutoPawn(state: LudoState, playerId: string, roll: number, eligible: number[]): number {
  const player = playerOf(state, playerId);
  const first = eligible[0] as number;
  if (!player || eligible.length === 1) return first;
  const progressOf = (pawn: number): number => player.pawns[pawn] as number;
  const best = (pawns: number[]): number => pawns.reduce((a, b) => (progressOf(b) > progressOf(a) ? b : a));
  const info = eligible.map((pawn) => ({ pawn, ...preview(state, player, pawn, roll) }));

  const finishing = info.filter((i) => i.reachedHome).map((i) => i.pawn);
  if (finishing.length) return best(finishing);
  const capturing = info.filter((i) => i.captures > 0);
  if (capturing.length) {
    const most = Math.max(...capturing.map((i) => i.captures));
    return best(capturing.filter((i) => i.captures === most).map((i) => i.pawn));
  }
  const leaving = info.filter((i) => progressOf(i.pawn) === BASE_PROGRESS).map((i) => i.pawn);
  if (leaving.length) return leaving[0] as number;
  const endangered = info.filter((i) => inDanger(state, player, progressOf(i.pawn))).map((i) => i.pawn);
  if (endangered.length) return best(endangered);
  const safe = info.filter((i) => i.safe).map((i) => i.pawn);
  if (safe.length) return best(safe);
  return best(eligible);
}

import type { UnoTable, UnoYou } from '@myarena/shared';

export type ActorConnection = 'connected' | 'disconnected' | 'gone';

export type TurnKind = 'play' | 'drawn' | 'penalty' | 'auto' | 'thinking' | 'wheel' | 'wait' | 'done';

/** What the turn strip says: derived from the shown table only (specs/007 research R10, data-model section 6). */
export interface TurnLabel {
  text: string;
  /** Secondary note while a catch window is open; never replaces `text`. */
  note: string | null;
  /** The seat that must act, or null while dealing and when finished. */
  actorId: string | null;
  /** The local player must act. */
  mine: boolean;
  kind: TurnKind;
  /** table.remainingMs while a human must act. */
  countdownMs: number | null;
}

const NAME_MAX = 14;

/** Cuts a name to 14 characters with an ellipsis so the verb that follows is never pushed out of the strip. */
export function shortName(name: string): string {
  const chars = Array.from(name.trim());
  return chars.length <= NAME_MAX ? chars.join('') : `${chars.slice(0, NAME_MAX - 1).join('')}…`;
}

function catchNote(table: UnoTable, me: string | null): string | null {
  const w = table.catchWindow;
  if (!w) return null;
  if (w.victim === me) return 'Say UNO!';
  const victim = table.players.find((p) => p.playerId === w.victim);
  return victim ? `Catch ${shortName(victim.name)}!` : null;
}

/**
 * First matching rule wins: finished, local colour wheel, settling, connection waiting, drawn, pending penalty,
 * bot thinking, ordinary turn. The catch window only sets `note`.
 */
export function describeTurn(
  table: UnoTable,
  you: UnoYou | null,
  wheelOpen: boolean,
  actorConnection: ActorConnection,
  compact = false,
): TurnLabel {
  const me = you?.playerId ?? null;
  const note = catchNote(table, me);
  const idle = { note, actorId: null, mine: false, countdownMs: null } as const;

  if (table.phase === 'finished') {
    const winner = table.players.find((p) => p.playerId === table.winner);
    const text = winner ? (winner.playerId === me ? 'You win!' : `${shortName(winner.name)} wins`) : 'Match over';
    return { ...idle, text, kind: 'done' };
  }

  const playing = table.phase === 'turn' || table.phase === 'drawn';
  const actorId = playing ? table.turn : null;
  const seat = actorId ? (table.players.find((p) => p.playerId === actorId) ?? null) : null;
  const mine = actorId !== null && actorId === me;
  const human = seat?.kind === 'human';
  const name = seat ? shortName(seat.name) : 'Someone';
  const countdownMs = actorId !== null && human ? table.remainingMs : null;
  const base = { note, actorId, mine, countdownMs };

  if (wheelOpen && mine) return { ...base, text: 'Pick a colour', kind: 'wheel' };
  if (table.phase === 'settling' || !seat) {
    return { ...idle, text: table.turn === null ? 'Dealing...' : 'Next turn...', kind: 'wait' };
  }
  if (!mine && human && actorConnection === 'disconnected') return { ...base, text: `${name} is reconnecting...`, kind: 'wait' };

  if (table.phase === 'drawn') {
    const mineText = compact ? 'Play it or keep it' : 'Play the card you drew, or keep it';
    return { ...base, text: mine ? mineText : `${name} is deciding on a drawn card`, kind: 'drawn' };
  }

  if (table.pending) {
    const { kind, total } = table.pending;
    const automatic = human && table.remainingMs === null;
    if (automatic) return { ...base, text: mine ? `You draw ${total}...` : `${name} draws ${total}`, kind: 'auto' };
    const card = kind === 'wild4' ? 'Wild Draw 4' : 'Draw 2';
    if (compact) return { ...base, text: mine ? `Your turn: stack or draw ${total}` : `${name}: stack or draw ${total}`, kind: 'penalty' };
    return { ...base, text: mine ? `Your turn: stack a ${card} or draw ${total}` : `${name} may stack or draw ${total}`, kind: 'penalty' };
  }

  if (table.thinking === actorId) return { ...base, text: `${name} is thinking...`, kind: 'thinking' };
  return { ...base, text: mine ? (compact ? 'Your turn' : 'Your turn: play a card or draw') : `${name}'s turn`, kind: 'play' };
}

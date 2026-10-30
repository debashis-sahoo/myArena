import type { Participant } from './participant.js';
import { ok, reject, type Context, type Outcome } from './outcome.js';

// Seat holders only: connected members first, then the earliest to join.
export function pickSuccessor(candidates: readonly Participant[]): Participant | undefined {
  return [...candidates].sort(
    (left, right) => Number(right.connection === 'CONNECTED') - Number(left.connection === 'CONNECTED') || left.joinedAt - right.joinedAt,
  )[0];
}

// Roles swap in one synchronous step, so no observer ever sees zero or two hosts.
export function transferHost({ room, actor, emit }: Context, targetId: string): Outcome {
  const target = room.participants.find((member) => member.id === targetId);
  if (!target || target === actor) return reject('TARGET_NOT_ELIGIBLE');
  target.role = 'HOST';
  actor.role = 'PLAYER';
  emit('host.changed', { hostParticipantId: target.id, previousHostParticipantId: actor.id });
  return ok;
}

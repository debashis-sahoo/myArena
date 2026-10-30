import { z } from 'zod';
import type { GameDescriptor, GameLifecycle, MatchContext } from '@myarena/game-sdk';

type DescriptorOverrides = Partial<Omit<GameDescriptor, 'settingsSchema'>>;

export function createStubGame(options: { defaultDurationSeconds?: number; descriptor?: DescriptorOverrides } = {}): GameLifecycle {
  const defaultDuration = options.defaultDurationSeconds ?? 30;
  const running = new Map<string, { context: MatchContext; timer: unknown }>();
  // The stub's one rule: each participant may move once per match.
  const moved = new Map<string, Set<string>>();
  return {
    descriptor: {
      id: 'test-stub', name: 'Test match', minParticipants: 2, maxParticipants: 100,
      description: 'A short test match for trying rooms, readiness and the lobby.',
      category: 'Testing', durationMinutes: { min: 1, max: 2 }, modes: ['SOLO_AI', 'ONLINE'],
      art: { icon: 'FLASK', palette: 'SLATE' }, test: true,
      ...options.descriptor,
      settingsSchema: z.strictObject({ durationSeconds: z.number().int().min(1).max(3600).default(defaultDuration) }),
    },
    onMatchStart(context) {
      const duration = Number(context.settings.durationSeconds ?? defaultDuration);
      const timer = context.clock.setTimeout(() => context.endMatch(), duration * 1000);
      running.set(context.roomId, { context, timer });
      moved.set(context.roomId, new Set());
    },
    onAction(roomId, participantId) {
      const done = moved.get(roomId);
      if (!done) return { accepted: false, reason: 'NOT_IN_MATCH' };
      if (done.has(participantId)) return { accepted: false, reason: 'ALREADY_MOVED' };
      done.add(participantId);
      return { accepted: true };
    },
    onMatchEnd(roomId) {
      const match = running.get(roomId);
      if (match) match.context.clock.clearTimeout(match.timer);
      running.delete(roomId);
      moved.delete(roomId);
    },
  };
}

// Online-only, small-room test game so tests cover a second mode set and range.
export function createOnlineStubGame(options: { defaultDurationSeconds?: number } = {}): GameLifecycle {
  return createStubGame({
    ...options,
    descriptor: {
      id: 'test-online', name: 'Test room game', minParticipants: 2, maxParticipants: 6, defaultParticipants: 4,
      description: 'An online-only test game for rooms of up to six players.',
      durationMinutes: { min: 1, max: 3 }, modes: ['ONLINE'], art: { icon: 'DISCS', palette: 'INDIGO' },
    },
  });
}
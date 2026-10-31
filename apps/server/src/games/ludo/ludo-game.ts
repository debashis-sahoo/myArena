import type { GameLifecycle } from '@myarena/game-sdk';
import { cryptoDice, type DiceSource } from './dice.js';
import { MatchRunner } from './match-runner.js';
import { ludoSettingsSchema } from './settings.js';

export function createLudoGame(options: { dice?: DiceSource } = {}): GameLifecycle {
  const dice = options.dice ?? cryptoDice();
  const matches = new Map<string, MatchRunner>();
  return {
    descriptor: {
      id: 'ludo', name: 'Ludo', minParticipants: 2, maxParticipants: 4, defaultParticipants: 4,
      description: 'Race your four tokens home and send rivals back to start.', category: 'Classic board',
      durationMinutes: { min: 20, max: 45 }, modes: ['SOLO_AI', 'ONLINE'],
      art: { icon: 'TARGET', palette: 'CRIMSON', image: 'LUDO' },
      settingsSchema: ludoSettingsSchema,
    },
    onMatchStart(context) {
      matches.get(context.roomId)?.stop();
      const runner = new MatchRunner(context, ludoSettingsSchema.parse(context.settings), dice);
      matches.set(context.roomId, runner);
      runner.start();
    },
    onMatchEnd(roomId) {
      matches.get(roomId)?.stop();
    },
    onAction(roomId, participantId, action) {
      const runner = matches.get(roomId);
      if (!runner) return { accepted: false, reason: 'NOT_PLAYING', detail: 'You are not playing in this match.', nextStep: 'Wait in the room for the next match.' };
      return runner.act(participantId, action);
    },
    viewFor(roomId, participantId) {
      return matches.get(roomId)?.view(participantId) ?? null;
    },
    releaseMatch(roomId) {
      matches.get(roomId)?.stop();
      matches.delete(roomId);
    },
    onParticipantLeft(roomId, participantId) {
      matches.get(roomId)?.participantLeft(participantId);
    },
  };
}

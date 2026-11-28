import { pino } from 'pino';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';

/** One JSON line per event on stdout; Azure and local operators capture it. */
export const logger = pino({
  level: config.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'secret',
      'token',
      'candidateVerifier',
      'CANDIDATE_VERIFIER_TOKEN_HASH',
      'authorization',
      'cookie',
      'headers.authorization',
      'headers.cookie',
      'guestId',
      'displayName',
      'chat',
      'payload',
    ],
    censor: '[REDACTED]',
  },
});

export type OperationalCategory = 'startup' | 'health' | 'routing' | 'swap' | 'capacity' | 'release' | 'error';
export type OperationalSeverity = 'info' | 'warn' | 'error';

export function operational(
  severity: OperationalSeverity,
  category: OperationalCategory,
  event: string,
  metric?: number,
  unit?: string,
): void {
  logger[severity](
    {
      releaseId: config.releaseId,
      slot: config.slotIdentity,
      category,
      event,
      safeCorrelationId: randomUUID(),
      ...(metric !== undefined ? { metric } : {}),
      ...(unit ? { unit } : {}),
    },
    event.replaceAll('_', ' '),
  );
}

import { pino } from 'pino';
import { config } from './config.js';

/** One JSON line per event on stdout; Render captures it. Never log guestId. */
export const logger = pino({
  level: config.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

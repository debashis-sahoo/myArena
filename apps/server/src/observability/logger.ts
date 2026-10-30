import pino from 'pino';
import type { DestinationStream } from 'pino';
import type { FastifyBaseLogger } from 'fastify';

export function redactUrl(value: string): string {
  return value.split('?')[0]!.replace(/\/(join|api\/invitations)\/[^/#\s]+/g, '/$1/[REDACTED]');
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactUrl(value);
  if (value instanceof Error) return { type: value.name, message: 'Request failed.' };
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, /token|cookie|authorization|invitation|recovery|^code$/i.test(key) ? '[REDACTED]' : sanitize(item, seen),
  ]));
}

export function createLogger(destination?: DestinationStream): FastifyBaseLogger {
  return pino({
    level: 'info',
    serializers: {
      req: (request) => ({ method: request.method, url: redactUrl(request.url ?? '') }),
      res: (response) => ({ statusCode: response.statusCode }),
      err: (error) => ({ type: error.name, message: 'Request failed.' }),
    },
    redact: { paths: ['token', 'tokenHash', 'cookie', 'invitation', 'recovery', 'req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'], censor: '[REDACTED]' },
    hooks: {
      logMethod(args, method) {
        const safe = args.map((value) => sanitize(value));
        method.apply(this, safe as Parameters<typeof method>);
      },
    },
  }, destination);
}
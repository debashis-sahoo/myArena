import { it } from 'vitest';
import { buildApp } from '../../src/http/app.js';
import { validateResponse } from './helpers.js';

it('matches the health response contract', async () => {
  const app = await buildApp({ logger: false });
  try { const response = await app.inject('/healthz'); validateResponse('/healthz', 'get', response.statusCode, response.json()); }
  finally { await app.close(); }
});
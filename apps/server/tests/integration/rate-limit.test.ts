import { describe, expect, it } from 'vitest';
import { startTestServer } from './helpers.js';

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

describe('per-IP rate limits', () => {
  async function statuses(count: number, send: () => Promise<Response>) {
    const results: Response[] = [];
    for (let index = 0; index < count; index++) results.push(await send());
    return results;
  }

  it('limits invitation previews', async () => {
    const server = await startTestServer();
    try {
      const client = server.client();
      const results = await statuses(31, () => client.request('/api/invitations/ZZZZZZZZZZ'));
      expect(results.slice(0, 30).every((response) => response.status === 404)).toBe(true);
      expect(results[30]!.status).toBe(429);
      expect(results[30]!.headers.get('content-type')).toContain('application/problem+json');
      expect(await results[30]!.json()).toMatchObject({ code: 'RATE_LIMITED', nextStep: expect.any(String) });
    } finally { await server.close(); }
  });

  it('limits joins and room creation', async () => {
    const server = await startTestServer();
    try {
      const client = server.client();
      const joins = await statuses(21, () => client.request('/api/rooms/join', json({ code: 'ZZZZZZZZZZ', displayName: 'Alex' })));
      expect(joins[20]!.status).toBe(429);
      const creates = await statuses(11, () => client.request('/api/rooms', json({ displayName: 'Sam' })));
      expect(creates[10]!.status).toBe(429);
      expect(creates.slice(0, 10).every((response) => response.status === 201)).toBe(true);
    } finally { await server.close(); }
  });
});

import { z } from '@myarena/protocol';
import type { CatalogResponse } from '@myarena/protocol';

const problemSchema = z.object({
  detail: z.string(), nextStep: z.string(), code: z.string().optional(),
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});
export interface EntryResult {
  roomId: string;
  participantId: string;
  role: 'HOST' | 'PLAYER';
  invitation?: { code: string; link: string };
}
export interface FieldProblem { field: string; message: string }
export class ApiError extends Error {
  constructor(
    public readonly status: number, public readonly code: string, detail: string, public readonly nextStep: string,
    public readonly fieldErrors: FieldProblem[] = [],
  ) { super(detail); }
}
export async function apiRequest<Result>(path: string, options: RequestInit = {}): Promise<Result> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (options.method === 'POST' && ['/api/rooms', '/api/rooms/join'].includes(path) && !headers.has('Idempotency-Key')) headers.set('Idempotency-Key', crypto.randomUUID());
  let response: Response;
  try { response = await fetch(path, { ...options, headers, credentials: 'same-origin' }); }
  catch { throw new ApiError(0, 'NETWORK_UNAVAILABLE', 'The service could not be reached.', 'Check your connection and retry the same request.'); }
  if (!response.ok) {
    const parsed = problemSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) throw new ApiError(response.status, parsed.data.code ?? 'REQUEST_FAILED', parsed.data.detail, parsed.data.nextStep, parsed.data.fieldErrors);
    throw new ApiError(response.status, 'REQUEST_FAILED', 'The request could not be completed.', 'Try again later.');
  }
  if (response.status === 204) return undefined as Result;
  return response.json() as Promise<Result>;
}

export const getCatalog = () => apiRequest<CatalogResponse>('/api/catalog');
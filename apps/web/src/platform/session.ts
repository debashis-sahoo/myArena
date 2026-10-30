import { ApiError, apiRequest } from './api-client';
import type { SessionProbe } from './reconnect';

// Tells a temporary outage apart from a seat that is gone, so the user gets the right explanation.
export async function probeSession(roomId: string): Promise<SessionProbe> {
  try {
    await apiRequest(`/api/rooms/${encodeURIComponent(roomId)}/session`);
    return 'ok';
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 410) return 'expired';
      if (error.status === 401) return 'unauthenticated';
    }
    return 'unknown';
  }
}

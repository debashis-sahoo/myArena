import type { Request, Response } from 'express';
import { getServerPhase } from './serverState.js';

export interface HealthStats {
  rooms: number;
  connections: number;
}

/** GET /healthz: no session or cookies; reports healthy only when ready to serve. */
export function healthHandler(getStats: () => HealthStats) {
  return (_req: Request, res: Response): void => {
    res.setHeader('Cache-Control', 'no-store');
    const phase = getServerPhase();
    if (phase !== 'ready') {
      res.status(503).json({ status: phase });
      return;
    }
    const { rooms, connections } = getStats();
    res.status(200).json({ status: 'ok', uptimeSec: Math.round(process.uptime()), rooms, connections });
  };
}

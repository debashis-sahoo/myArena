export interface Profile { rooms: number; players: number; }
export const PROFILES: Record<string, Profile> = {
  '2x100': { rooms: 2, players: 100 },
  '20x10': { rooms: 20, players: 10 },
};

export function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const index = Math.min(sortedAscending.length - 1, Math.ceil((p / 100) * sortedAscending.length) - 1);
  return sortedAscending[Math.max(0, index)]!;
}

export interface Summary {
  changes: number; lost: number; p50: number; p95: number; p99: number; max: number;
  withinOneSecond: number; percentWithinOneSecond: number;
}

// A change counts as visible only once every member has received it; one that never arrives everywhere is lost.
export function summarize(latenciesMs: number[], lost: number): Summary {
  const sorted = [...latenciesMs].sort((left, right) => left - right);
  const total = sorted.length + lost;
  const within = sorted.filter((latency) => latency <= 1000).length;
  return {
    changes: total, lost, p50: percentile(sorted, 50), p95: percentile(sorted, 95), p99: percentile(sorted, 99),
    max: sorted.at(-1) ?? 0, withinOneSecond: within, percentWithinOneSecond: total === 0 ? 0 : (within / total) * 100,
  };
}

export interface ReadyEvent { version: number; kind: string; data: { participantId?: string; ready?: boolean }; }

export function foldReady(initial: Record<string, boolean>, events: ReadyEvent[]): Record<string, boolean> {
  const state = { ...initial };
  for (const event of events) {
    if (event.kind === 'participant.ready' && event.data.participantId !== undefined) state[event.data.participantId] = Boolean(event.data.ready);
  }
  return state;
}

export function versionGaps(versions: number[]): number {
  let gaps = 0;
  for (let index = 1; index < versions.length; index++) if (versions[index] !== versions[index - 1]! + 1) gaps += 1;
  return gaps;
}

export const sameReadiness = (left: Record<string, boolean>, right: Record<string, boolean>): boolean => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => left[key] === right[key]);
};

export interface Verdict { sc009: boolean; sc010: boolean; reasons: string[]; }

export function judge(summary: Summary, gaps: number, inconsistencies: number): Verdict {
  const reasons: string[] = [];
  if (summary.lost > 0) reasons.push(`${summary.lost} change(s) never reached every member`);
  if (gaps > 0) reasons.push(`${gaps} version gap(s) observed by clients`);
  if (inconsistencies > 0) reasons.push(`${inconsistencies} member view(s) disagreed with the server`);
  const sc009 = summary.lost === 0 && gaps === 0 && inconsistencies === 0;
  const sc010 = summary.percentWithinOneSecond >= 95;
  if (!sc010) reasons.push(`only ${summary.percentWithinOneSecond.toFixed(1)}% of changes were visible to everyone within 1 second`);
  return { sc009, sc010, reasons };
}

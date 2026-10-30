import { describe, expect, it } from 'vitest';
import { PROFILES, foldReady, judge, percentile, sameReadiness, summarize, versionGaps } from '../src/stats.js';

describe('load statistics', () => {
  it('defines the two required profiles at the launch capacity', () => {
    expect(PROFILES['2x100']).toEqual({ rooms: 2, players: 100 });
    expect(PROFILES['20x10']).toEqual({ rooms: 20, players: 10 });
    for (const profile of Object.values(PROFILES)) expect(profile.rooms * profile.players).toBe(200);
  });

  it('computes nearest-rank percentiles', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(95);
    expect(percentile(values, 99)).toBe(99);
    expect(percentile([], 95)).toBe(0);
    expect(percentile([7], 99)).toBe(7);
  });

  it('counts lost changes against the within-one-second share', () => {
    const summary = summarize([10, 20, 30, 40, 2000], 5);
    expect(summary).toMatchObject({ changes: 10, lost: 5, withinOneSecond: 4, max: 2000 });
    expect(summary.percentWithinOneSecond).toBe(40);
  });

  it('folds ready events onto the starting snapshot', () => {
    const start = { a: false, b: false };
    const folded = foldReady(start, [
      { version: 1, kind: 'participant.ready', data: { participantId: 'a', ready: true } },
      { version: 2, kind: 'chat.message', data: {} },
      { version: 3, kind: 'participant.ready', data: { participantId: 'a', ready: false } },
      { version: 4, kind: 'participant.ready', data: { participantId: 'b', ready: true } },
    ]);
    expect(folded).toEqual({ a: false, b: true });
    expect(start).toEqual({ a: false, b: false });
    expect(sameReadiness(folded, { a: false, b: true })).toBe(true);
    expect(sameReadiness(folded, { a: true, b: true })).toBe(false);
  });

  it('detects gaps in a version sequence', () => {
    expect(versionGaps([4, 5, 6, 7])).toBe(0);
    expect(versionGaps([4, 6, 7, 9])).toBe(2);
    expect(versionGaps([])).toBe(0);
  });

  it('passes only when nothing is lost, views agree, and 95% of changes are fast', () => {
    expect(judge(summarize(Array(100).fill(50), 0), 0, 0)).toMatchObject({ sc009: true, sc010: true, reasons: [] });
    expect(judge(summarize(Array(100).fill(50), 1), 0, 0).sc009).toBe(false);
    expect(judge(summarize(Array(100).fill(50), 0), 1, 0).sc009).toBe(false);
    expect(judge(summarize(Array(100).fill(50), 0), 0, 1).sc009).toBe(false);
    const slow = judge(summarize([...Array(90).fill(50), ...Array(10).fill(1500)], 0), 0, 0);
    expect(slow).toMatchObject({ sc009: true, sc010: false });
    expect(slow.reasons[0]).toContain('90.0%');
  });
});

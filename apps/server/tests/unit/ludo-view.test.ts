import { describe, expect, it } from 'vitest';
import { createMatch } from '@myarena/ludo';
import { projectView } from '../../src/games/ludo/view.js';

const state = () => createMatch([
  { kind: 'HUMAN', label: 'Host', participantId: 'p-host' },
  { kind: 'HUMAN', label: 'Alex', participantId: 'p-alex' },
  { kind: 'HUMAN', label: 'Sam', participantId: 'p-sam' },
], 1);
const input = (overrides = {}) => ({ state: state(), theme: 'diwali', turnLimitSeconds: 60, settleMsLeft: 0, decisionMsLeft: null, ...overrides });

describe('Ludo view projection', () => {
  it('gives a seated member exactly the documented fields', () => {
    const view = projectView(input(), 'p-alex');
    expect(view.kind).toBe('MATCH');
    if (view.kind !== 'MATCH') return;
    expect(Object.keys(view).sort()).toEqual(['kind', 'log', 'seats', 'theme', 'turn', 'turnLimitSeconds', 'winner', 'you']);
    expect(Object.keys(view.turn).sort()).toEqual(['decisionMsLeft', 'dice', 'legalPawns', 'phase', 'seat', 'settleMsLeft', 'sixesInRow']);
    expect(Object.keys(view.seats[0]!).sort()).toEqual(['away', 'color', 'home', 'index', 'kind', 'label', 'left', 'participantId', 'pawns']);
    expect(view.theme).toBe('diwali');
    expect(view.turnLimitSeconds).toBe(60);
    expect(view.seats.map((seat) => seat.color)).toEqual(['RED', 'GREEN', 'YELLOW']);
    expect(view.turn).toMatchObject({ seat: 1, phase: 'ROLL', dice: null, legalPawns: [], sixesInRow: 0, settleMsLeft: 0, decisionMsLeft: null });
    expect(view.winner).toBeNull();
    expect(view.log.length).toBeGreaterThan(0);
  });

  it('tells each seated member their own seat index', () => {
    const youOf = (id: string) => { const view = projectView(input(), id); return view.kind === 'MATCH' ? view.you : undefined; };
    expect(youOf('p-host')).toBe(0);
    expect(youOf('p-alex')).toBe(1);
    expect(youOf('p-sam')).toBe(2);
  });

  it('gives a member without a seat nothing but a waiting marker', () => {
    expect(projectView(input(), 'p-late')).toEqual({ kind: 'WAITING' });
  });

  it('gives a released seat no board either', () => {
    const released = state();
    released.seats[2]!.left = true;
    expect(projectView(input({ state: released }), 'p-sam')).toEqual({ kind: 'WAITING' });
  });

  it('carries the remaining times it is given', () => {
    const view = projectView(input({ settleMsLeft: 1500, decisionMsLeft: 30_000 }), 'p-host');
    expect(view.kind === 'MATCH' && view.turn.settleMsLeft).toBe(1500);
    expect(view.kind === 'MATCH' && view.turn.decisionMsLeft).toBe(30_000);
  });

  it('serializes to plain JSON without losing anything', () => {
    const view = projectView(input(), 'p-host');
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });
});

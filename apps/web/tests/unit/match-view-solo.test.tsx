import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { legalPawns, toMatchView } from '@myarena/ludo';
import { MatchView } from '../../src/features/ludo/match/MatchView';
import { createSoloMatch } from '../../src/features/ludo/solo/soloRunner';

afterEach(cleanup);

describe('MatchView with a solo-shaped view', () => {
  it('renders computer seats with no countdown, away banner or chat', () => {
    const state = createSoloMatch({ opponents: 2, difficulty: 'normal', theme: 'classic' }, 'Pat', 0);
    const view = toMatchView(state, { theme: 'classic', turnLimitSeconds: 0, you: 0, legalPawns: legalPawns(state), decisionMsLeft: null, settleMsLeft: 0 });
    render(<MatchView view={view} seq={1} error={null} onRoll={() => undefined} onMove={() => undefined} />);
    expect(screen.getByRole('region', { name: 'Ludo match' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll the die' })).toBeEnabled();
    expect(screen.queryByText(/seconds left|away|Message/i)).toBeNull();
    expect(screen.queryByRole('log', { name: /chat/i })).toBeNull();
  });
});

import { useState } from 'react';
import type { SoloGameProps } from '../registry';

// Test-only solo module: one button to make a move, plus the exit control every solo game must offer.
export default function TestSolo({ displayName, soundEnabled, effectsEnabled, onExit }: SoloGameProps) {
  const [moves, setMoves] = useState(0);
  return (
    <section aria-labelledby="solo-test-heading" className="panel stack" data-effects-enabled={effectsEnabled}>
      <h1 id="solo-test-heading">Test match: solo vs AI</h1>
      <p>{displayName ? `Playing as ${displayName}.` : 'Playing as a guest.'} Sound is {soundEnabled ? 'on' : 'off'}.</p>
      <p role="status">Moves made: {moves}</p>
      <div className="cluster">
        <button type="button" className="btn-primary" onClick={() => setMoves((count) => count + 1)}>Make a move</button>
        <button type="button" className="btn-secondary" onClick={onExit}>Exit to games</button>
      </div>
    </section>
  );
}

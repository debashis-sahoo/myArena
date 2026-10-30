import { Suspense, lazy, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getPreferences, prefersReducedMotion } from '../../platform/preferences';
import { loadSoloGame } from './registry';

export function SoloPage() {
  const { gameId = '' } = useParams();
  const navigate = useNavigate();
  const Game = useMemo(() => {
    const loader = loadSoloGame(gameId);
    return loader ? lazy(() => loader) : null;
  }, [gameId]);

  if (!Game) {
    return (
      <section className="stack">
        <h1>This game is not available yet</h1>
        <p>Playing against the AI is not available for this game. <Link to="/">Back to the games.</Link></p>
      </section>
    );
  }
  const preferences = getPreferences();
  return (
    <Suspense fallback={<p role="status">Loading the game…</p>}>
      <Game
        displayName={preferences.displayName} soundEnabled={preferences.sound} effectsEnabled={preferences.effects && !prefersReducedMotion()}
        onExit={() => navigate(`/?game=${encodeURIComponent(gameId)}`)}
      />
    </Suspense>
  );
}

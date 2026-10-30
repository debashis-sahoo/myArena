import { useState } from 'react';
import type { LobbyView } from '@myarena/protocol';
import type { RunIntent } from './useRoom';

export function MatchControls({ lobby, run }: { lobby: LobbyView; run: RunIntent }) {
  const [error, setError] = useState<string | null>(null);
  const isHost = lobby.self.role === 'HOST';
  const act = async (type: 'match.start' | 'match.rematch' | 'match.returnToLobby') => setError(await run({ type }));
  const status = lobby.status === 'LOBBY' ? 'In the lobby.' : lobby.matchStatus === 'ENDED' ? 'The match has ended.' : 'A match is in progress.';

  return (
    <section aria-labelledby="match-heading" className="panel stack">
      <h2 id="match-heading">Match</h2>
      <p role="status">{status}</p>
      {isHost ? (
        <div className="cluster">
          {lobby.status === 'LOBBY' ? <button type="button" onClick={() => act('match.start')}>Start match</button> : null}
          {lobby.matchStatus === 'ENDED' ? (
            <>
              <button type="button" onClick={() => act('match.rematch')}>Rematch</button>
              <button type="button" onClick={() => act('match.returnToLobby')}>Back to lobby</button>
            </>
          ) : null}
        </div>
      ) : <p>The host starts the match.</p>}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

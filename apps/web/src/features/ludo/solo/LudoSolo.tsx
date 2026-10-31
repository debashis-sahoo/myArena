import { useEffect, useRef, useState } from 'react';
import type { MatchState } from '@myarena/ludo';
import type { SoloGameProps } from '../../solo/registry';
import { MatchView } from '../match/MatchView';
import { SoloSetup } from './SoloSetup';
import { createSoloRunner, type SoloRunner, type SoloUpdate } from './soloRunner';
import { GENERIC_NAME, clearSaved, loadSaved, save, withVisitorName, type SoloSettings } from './soloStorage';

interface Session { id: number; settings: SoloSettings; resume: MatchState | null; }

function SoloMatch({ session, visitorLabel, onAgain, onExit }: { session: Session; visitorLabel: string; onAgain: () => void; onExit: () => void }) {
  const [update, setUpdate] = useState<SoloUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runner = useRef<SoloRunner | null>(null);

  useEffect(() => {
    const created = createSoloRunner({
      settings: session.settings, visitorLabel, resume: session.resume ? withVisitorName(session.resume, visitorLabel) : null,
      onUpdate: setUpdate,
      onState: (state) => (state.phase === 'ENDED' ? clearSaved() : save(session.settings, state, Date.now())),
    });
    runner.current = created;
    created.start();
    return () => created.stop();
  }, [session, visitorLabel]);

  if (!update) return <p role="status">Preparing the match…</p>;
  const ended = update.view.turn.phase === 'ENDED';
  const leave = (): void => { runner.current?.stop(); clearSaved(); onExit(); };
  return (
    <div className="stack">
      <h1 className="ludo-solo-title">Ludo: you against the computer</h1>
      <MatchView
        view={update.view} seq={update.seq} events={update.events} error={error}
        onRoll={() => setError(runner.current?.roll() ?? null)}
        onMove={(pawn) => setError(runner.current?.move(pawn) ?? null)}
      />
      <div className="cluster">
        {ended ? (
          <>
            <button type="button" className="btn-primary" onClick={onAgain}>Play again</button>
            <button type="button" className="btn-secondary" onClick={onExit}>Back to games</button>
          </>
        ) : <button type="button" className="btn-quiet" onClick={leave}>Leave match</button>}
      </div>
    </div>
  );
}

/** Solo Ludo: setup, the shared match view driven by the on-device runner, and an end screen. */
export default function LudoSolo({ displayName, onExit }: SoloGameProps) {
  const counter = useRef(1);
  const [session, setSession] = useState<Session | null>(() => {
    const saved = loadSaved(Date.now());
    return saved ? { id: 0, settings: saved.settings, resume: saved.state } : null;
  });
  const start = (settings: SoloSettings): void => { counter.current += 1; setSession({ id: counter.current, settings, resume: null }); };

  if (!session) return <SoloSetup onStart={start} onBack={onExit} />;
  return (
    <SoloMatch
      key={session.id} session={session} visitorLabel={displayName.trim() || GENERIC_NAME}
      onAgain={() => start(session.settings)}
      onExit={() => { clearSaved(); onExit(); }}
    />
  );
}

import type { LudoMatchView } from '@myarena/ludo';
import { BoardView } from '../view/BoardView';
import { Controls } from '../view/Controls';
import { ResultPanel } from '../view/ResultPanel';
import { StatusBar } from '../view/StatusBar';
import { useSettled } from './useSettled';

export interface MatchViewProps {
  view: LudoMatchView;
  /** Changes with every update, so the settle countdown restarts. */
  seq: number;
  error: string | null;
  onRoll: () => void;
  onMove: (pawn: number) => void;
}

// Presentational only: it knows nothing about rooms or chat, so online and solo matches share it.
export function MatchView({ view, seq, error, onRoll, onMove }: MatchViewProps) {
  const settled = useSettled(seq, view.turn.settleMsLeft);
  return (
    <section className="ludo-match stack" aria-label="Ludo match">
      <StatusBar view={view} settled={settled} />
      <BoardView view={view} settled={settled} onChoose={onMove} />
      {view.turn.phase === 'ENDED' ? <ResultPanel view={view} /> : <Controls view={view} settled={settled} onRoll={onRoll} onMove={onMove} />}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

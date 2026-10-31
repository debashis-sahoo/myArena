import type { LudoMatchView } from '@myarena/ludo';
import { themeOf } from '../themes/themes';
import { Board2D } from './Board2D';

export interface BoardViewProps {
  view: LudoMatchView;
  settled: boolean;
  onChoose: (pawn: number) => void;
}

// Chooses the renderer; for now the flat board is the only one. The wrapper exposes state for tests.
export function BoardView({ view, settled, onChoose }: BoardViewProps) {
  const mine = view.turn.seat === view.you && view.you !== null;
  const movable = mine && view.turn.phase === 'MOVE' && settled ? view.turn.legalPawns : [];
  return (
    <div className="ludo-board" data-theme={themeOf(view.theme).id} data-render-state="ready" data-die-face={settled && view.turn.dice !== null ? String(view.turn.dice) : ''}>
      <Board2D view={view} movable={movable} onChoose={onChoose} />
    </div>
  );
}

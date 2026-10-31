import { useMemo } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import { useHops } from '../match/useHops';
import { themeOf } from '../themes/themes';
import { Board2D } from './Board2D';
import { placePawns } from './placement';

export interface BoardViewProps {
  view: LudoMatchView;
  settled: boolean;
  onChoose: (pawn: number) => void;
  /** This viewer's die: `face` is empty while it rolls. */
  face: number | null;
  rolling: boolean;
  /** The viewer's pawn whose move button is pointed at or focused. */
  highlight: number | null;
  seq: number;
  /** The events of the latest update; empty or missing for a snapshot, so nothing is replayed. */
  events: readonly unknown[] | undefined;
  instant: boolean;
}

const NONE: readonly number[] = [];

// The wrapper exposes data-theme and data-die-face (empty while the die rolls) for styling and tests.
export function BoardView({ view, settled, onChoose, face, rolling, highlight, seq, events, instant }: BoardViewProps) {
  const mine = view.turn.seat === view.you && view.you !== null;
  const movable = mine && view.turn.phase === 'MOVE' && settled ? view.turn.legalPawns : NONE;
  const placed = useMemo(() => placePawns(view, new Set(movable), highlight), [view, movable, highlight]);
  const poses = useHops(placed, seq, events, instant);
  return (
    <div className="ludo-board" data-theme={themeOf(view.theme).id} data-die-face={rolling || face === null ? '' : String(face)}>
      <Board2D view={view} placed={placed} poses={poses} onChoose={onChoose} />
    </div>
  );
}

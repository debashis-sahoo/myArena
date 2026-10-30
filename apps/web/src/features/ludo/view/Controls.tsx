import type { LudoMatchView } from '@myarena/ludo';
import { describePawnMove } from '../a11y/describe';

export interface ControlsProps {
  view: LudoMatchView;
  /** False while the die is still rolling. */
  settled: boolean;
  onRoll: () => void;
  onMove: (pawn: number) => void;
}

export function Controls({ view, settled, onRoll, onMove }: ControlsProps) {
  const mine = view.turn.seat === view.you && view.you !== null;
  const canRoll = mine && view.turn.phase === 'ROLL';
  const choices = mine && view.turn.phase === 'MOVE' && settled ? view.turn.legalPawns : [];
  return (
    <div className="ludo-controls stack">
      <button type="button" className="btn-primary" disabled={!canRoll} onClick={onRoll}>Roll the die</button>
      {choices.length > 0 ? (
        <div role="group" aria-label="Choose a pawn" className="ludo-chooser">
          {choices.map((pawn) => (
            <button key={pawn} type="button" className="btn-secondary" onClick={() => onMove(pawn)}>{describePawnMove(view, pawn)}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

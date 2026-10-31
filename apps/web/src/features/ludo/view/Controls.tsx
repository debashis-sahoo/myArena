import type { LudoMatchView } from '@myarena/ludo';
import { describePawnMove } from '../a11y/describe';

export interface ControlsProps {
  view: LudoMatchView;
  /** False while the die is still rolling. */
  settled: boolean;
  onRoll: () => void;
  onMove: (pawn: number) => void;
  /** True while this viewer's die is still rolling on screen. */
  rolling?: boolean;
  /** Ends the roll animation for this viewer only. */
  onSkip?: () => void;
  /** Tells the board which pawn's move button is pointed at or focused (null when none). */
  onHighlight?: (pawn: number | null) => void;
}

export function Controls({ view, settled, onRoll, onMove, rolling = false, onSkip, onHighlight }: ControlsProps) {
  const mine = view.turn.seat === view.you && view.you !== null;
  const canRoll = mine && view.turn.phase === 'ROLL';
  const choices = mine && view.turn.phase === 'MOVE' && settled ? view.turn.legalPawns : [];
  return (
    <div className="ludo-controls stack">
      <button type="button" className="btn-primary" data-ludo-roll disabled={!canRoll} onClick={onRoll}>Roll the die</button>
      {rolling && onSkip ? <button type="button" className="btn-quiet" onClick={onSkip}>Skip animation</button> : null}
      {choices.length > 0 ? (
        <div role="group" aria-label="Choose a pawn" className="ludo-chooser">
          {choices.map((pawn) => (
            <button
              key={pawn} type="button" className="btn-secondary" data-ludo-pawn onClick={() => onMove(pawn)}
              onPointerEnter={() => onHighlight?.(pawn)} onPointerLeave={() => onHighlight?.(null)}
              onFocus={() => onHighlight?.(pawn)} onBlur={() => onHighlight?.(null)}
            >{describePawnMove(view, pawn)}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

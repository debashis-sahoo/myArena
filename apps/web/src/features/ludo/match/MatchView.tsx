import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import { AwayBanner } from '../view/AwayBanner';
import { BoardDescription } from '../view/BoardDescription';
import { BoardView } from '../view/BoardView';
import { Controls } from '../view/Controls';
import { Die3D } from '../view/Die3D';
import { ResultPanel } from '../view/ResultPanel';
import { StatusBar } from '../view/StatusBar';
import { TurnCard } from '../view/TurnCard';
import { useInstantMotion } from './useMotion';
import { useAnnouncements } from './useAnnouncements';
import { useCountdown } from './useCountdown';
import { useRollPlayback } from './rollPlayback';
import { useSettled } from './useSettled';

export interface MatchViewProps {
  view: LudoMatchView;
  /** Changes with every update, so the settle countdown restarts. */
  seq: number;
  error: string | null;
  onRoll: () => void;
  onMove: (pawn: number) => void;
  /** The events of the latest update; empty or missing for a snapshot, so nothing is replayed. */
  events?: readonly unknown[] | undefined;
  /** Online only: "I'm back" for a seat marked away. */
  onResume?: () => void;
  /** Online only: a one-off line such as "You ran out of time, so the game played for you." */
  notice?: string | null;
  /** Shown below the controls (in the right column on wide screens): the game log and chat, or their buttons. */
  children?: ReactNode;
}

const isTextEntry = (element: Element | null): boolean =>
  element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;

/**
 * Moves focus when the viewer's own decision starts (to Roll, or to the first pawn button once the die has settled) and
 * when the match ends (to the result heading). It never moves for anyone else's turn, and never out of a text field.
 */
function useDecisionFocus(root: React.RefObject<HTMLElement | null>, view: LudoMatchView, settled: boolean): void {
  const done = useRef('');
  const mine = view.turn.seat === view.you && view.you !== null;
  const last = view.log.at(-1)?.n ?? -1;
  const { phase } = view.turn;
  const choices = view.turn.legalPawns.length;
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let key = '';
    let target: HTMLElement | null = null;
    if (phase === 'ENDED') { key = 'ended'; target = element.ownerDocument.getElementById('ludo-result-heading'); }
    else if (mine && phase === 'ROLL') { key = `roll:${last}`; target = element.querySelector<HTMLElement>('[data-ludo-roll]'); }
    else if (mine && phase === 'MOVE' && settled && choices > 0) { key = `move:${last}`; target = element.querySelector<HTMLElement>('[data-ludo-pawn]'); }
    if (key === '' || done.current === key || !target) return;
    done.current = key;
    if (!isTextEntry(element.ownerDocument.activeElement)) target.focus({ preventScroll: false });
  }, [root, mine, phase, last, settled, choices]);
}

/**
 * Presentational only: it knows nothing about rooms or chat, so online and solo matches share it. The four parts (turn and
 * die, board, controls, extra) are laid out by the stylesheet: side by side on wide screens, stacked on phones.
 */
export function MatchView({ view, seq, error, onRoll, onMove, events, onResume, notice = null, children }: MatchViewProps) {
  // `settled` gates the controls and follows the game's own clock; the die on screen follows this viewer's playback.
  const settled = useSettled(seq, view.turn.settleMsLeft);
  const instant = useInstantMotion();
  const die = useRollPlayback(view, seq, events, instant);
  const left = useCountdown(view, seq);
  const seconds = left === null ? null : Math.ceil(left / 1000);
  const root = useRef<HTMLElement>(null);
  const [pointed, setPointed] = useState<number | null>(null);
  const highlight = view.turn.phase === 'MOVE' && settled ? pointed : null;
  useAnnouncements(view, seq, events);
  useDecisionFocus(root, view, settled);
  return (
    <section ref={root} className="ludo-match" aria-label="Ludo match" data-theme={view.theme}>
      <div className="ludo-hud">
        <TurnCard view={view} seconds={seconds} />
        <Die3D face={die.face} throwing={die.throwing} />
        <StatusBar view={view} settled={settled} rolling={die.rolling} seconds={seconds} />
      </div>
      <div className="ludo-board-area stack">
        {notice ? <p className="ludo-notice" role="status">{notice}</p> : null}
        {onResume ? <AwayBanner view={view} onResume={onResume} /> : null}
        <BoardView
          view={view} settled={settled} onChoose={onMove} face={die.face} rolling={die.rolling}
          highlight={highlight} seq={seq} events={events} instant={instant}
        />
        <BoardDescription view={view} />
      </div>
      <div className="ludo-actions stack">
        {view.turn.phase === 'ENDED' ? <ResultPanel view={view} /> : (
          <Controls view={view} settled={settled} onRoll={onRoll} onMove={onMove} rolling={die.rolling} onSkip={die.skip} onHighlight={setPointed} />
        )}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      {children ? <div className="ludo-extra">{children}</div> : null}
    </section>
  );
}

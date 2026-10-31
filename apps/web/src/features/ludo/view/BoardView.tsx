import { useCallback, useState } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import type { Throw } from '../match/rollPlayback';
import { chooseQuality, lowerQuality, saveQuality, storedQuality, webglAvailable, type Quality } from '../quality/quality';
import { themeOf } from '../themes/themes';
import { Board2D } from './Board2D';
import { BoardView3D, type RenderState } from './BoardView3D';
import { QualityControl, type QualityChoice } from './QualityControl';

export interface BoardViewProps {
  view: LudoMatchView;
  settled: boolean;
  onChoose: (pawn: number) => void;
  /** This viewer's die: `face` is empty while it rolls; `throwing` is the throw being shown. */
  face: number | null;
  rolling: boolean;
  throwing: Throw | null;
  events: readonly unknown[];
  seq: number;
  instant: boolean;
}

export const FLAT_NOTICE = 'Switched to the simpler board so you can keep playing.';

// Chooses the renderer: the 3D board when WebGL is available and the quality allows it, the flat board otherwise.
// The wrapper exposes state for tests and styling: data-render (2d or 3d) and data-render-state (loading, ready, fallback).
export function BoardView({ view, settled, onChoose, face, rolling, throwing, events, seq, instant }: BoardViewProps) {
  const [quality, setQuality] = useState<Quality>(() => chooseQuality());
  const [state, setState] = useState<RenderState>(() => (chooseQuality() === 'lite' ? 'ready' : 'loading'));
  // Without WebGL the flat board is the only choice, and the player is told once so the change is not a surprise.
  const [notice, setNotice] = useState<string | null>(() => (!webglAvailable() && storedQuality() !== 'lite' ? FLAT_NOTICE : null));
  const mine = view.turn.seat === view.you && view.you !== null;
  const movable = mine && view.turn.phase === 'MOVE' && settled ? view.turn.legalPawns : [];
  const flat = quality === 'lite';

  const fallback = useCallback(() => { setQuality('lite'); setState('fallback'); setNotice(FLAT_NOTICE); }, []);
  const slow = useCallback(() => {
    // A quality the player chose themselves is never lowered behind their back.
    if (storedQuality() !== null) return;
    setQuality((current) => {
      const next = lowerQuality(current);
      if (next === 'lite') { setState('fallback'); setNotice(FLAT_NOTICE); }
      return next;
    });
  }, []);

  const change = (choice: QualityChoice): void => {
    saveQuality(choice === 'auto' ? null : choice);
    const next = chooseQuality();
    setNotice(null);
    setState(next === 'lite' ? 'ready' : 'loading');
    setQuality(next);
  };

  return (
    <>
      <div
        className="ludo-board" data-theme={themeOf(view.theme).id} data-render={flat ? '2d' : '3d'}
        data-render-state={flat ? (state === 'fallback' ? 'fallback' : 'ready') : state} data-die-face={rolling || face === null ? '' : String(face)}
      >
        {flat ? <Board2D view={view} movable={movable} onChoose={onChoose} /> : (
          <BoardView3D
            view={view} movable={movable} onChoose={onChoose} events={events} seq={seq} throwing={throwing} instant={instant}
            quality={quality} onState={setState} onFallback={fallback} onSlow={slow}
          />
        )}
      </div>
      {notice ? <p className="ludo-notice" role="status">{notice}</p> : null}
      <details className="ludo-quality">
        <summary>Visual quality</summary>
        <QualityControl value={storedQuality() ?? 'auto'} onChange={change} />
      </details>
    </>
  );
}

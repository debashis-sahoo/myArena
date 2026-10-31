import { useEffect, useRef, useState } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import type { Throw } from '../match/rollPlayback';
import { saveView, storedView } from '../quality/preferences';
import type { Quality } from '../quality/quality';
import type { LudoScene } from '../scene/LudoScene';
import { themeOf } from '../themes/themes';
import { ViewToggle } from './ViewToggle';

export type RenderState = 'loading' | 'ready' | 'fallback';

export interface BoardView3DProps {
  view: LudoMatchView;
  movable: readonly number[];
  onChoose: (pawn: number) => void;
  events: readonly unknown[];
  seq: number;
  throwing: Throw | null;
  instant: boolean;
  quality: Exclude<Quality, 'lite'>;
  onState: (state: RenderState) => void;
  /** The 3D board cannot be used (it failed to start, or the graphics context was lost and did not come back). */
  onFallback: () => void;
  /** The device cannot keep up; the owner may lower the quality. */
  onSlow: () => void;
}

/** How long a lost graphics context may take to come back before the flat board takes over. */
const RESTORE_WAIT_MS = 2000;

/**
 * The 3D board on a canvas. The scene (and Three.js with it) is loaded on demand when the match starts; until then a
 * status line says the board is being prepared. The canvas is a picture for sighted players: every action and every
 * fact is also available as text and buttons.
 */
export function BoardView3D(props: BoardView3DProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<LudoScene | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false);
  const [top, setTop] = useState(() => storedView() === 'top');
  const lost = useRef({ count: 0, timer: 0 });

  useEffect(() => {
    let cancelled = false;
    let created: LudoScene | null = null;
    latest.current.onState('loading');
    import('../scene/LudoScene').then(({ createLudoScene }) => {
      if (cancelled || !canvas.current) return;
      created = createLudoScene({
        canvas: canvas.current,
        quality: props.quality,
        theme: themeOf(latest.current.view.theme).id,
        onPick: (pawn) => latest.current.onChoose(pawn),
        onSlow: () => latest.current.onSlow(),
        onContextLost: () => {
          lost.current.count += 1;
          window.clearTimeout(lost.current.timer);
          if (lost.current.count > 1) { latest.current.onFallback(); return; }
          lost.current.timer = window.setTimeout(() => latest.current.onFallback(), RESTORE_WAIT_MS);
        },
        onContextRestored: () => { window.clearTimeout(lost.current.timer); created?.redraw(); },
      });
      scene.current = created;
      setReady(true);
      latest.current.onState('ready');
    }).catch(() => {
      if (cancelled) return;
      latest.current.onFallback();
    });
    return () => {
      cancelled = true;
      window.clearTimeout(lost.current.timer);
      created?.dispose();
      scene.current = null;
      setReady(false);
    };
  }, [props.quality]);

  const { view, movable, events, seq, throwing, instant } = props;
  useEffect(() => {
    if (!ready || !scene.current) return;
    scene.current.setTheme(themeOf(view.theme).id);
    scene.current.update({ view, movable, events, seq, throwing, instant });
  }, [ready, view, movable, events, seq, throwing, instant]);

  useEffect(() => { if (ready) scene.current?.setCameraMode(top ? 'top' : 'angled', !instant); }, [ready, top, instant]);

  return (
    <>
      <canvas ref={canvas} className="ludo-canvas" role="img" aria-label="Ludo board, 3D view" />
      {ready ? null : <p className="ludo-preparing" role="status">Preparing the board…</p>}
      {ready ? <ViewToggle top={top} onToggle={() => { saveView(top ? 'angled' : 'top'); setTop(!top); }} /> : null}
    </>
  );
}

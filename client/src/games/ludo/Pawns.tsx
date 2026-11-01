import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactElement } from 'react';
import { HOME_CENTER, HOME_PROGRESS, type LudoState } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { bounceHome, celebrateHome } from './anim/capture';
import { hopAlong, place, type PawnParts, type Point } from './anim/hop';
import { spawnPuff } from './anim/puff';
import { cellKey } from './Board';
import { PawnArt, PawnDefs } from './Pawn';
import { centerOf, layoutPawns, pawnKey } from './pawnLayout';
import type { AnimState } from './useLudo';

export interface Fx {
  route: ReadonlySet<string>;
  landing: string | null;
}

interface Props {
  state: LudoState;
  side: number;
  youId: string;
  /** Pawns of mine that may move now. */
  eligible: number[];
  anim: AnimState | null;
  reduced: boolean;
  onMove: (pawn: number) => void;
  onFx: (fx: Fx) => void;
}

const NO_FX: Fx = { route: new Set(), landing: null };

function partsOf(outer: HTMLElement | undefined): PawnParts | null {
  if (!outer) return null;
  const inner = outer.querySelector<HTMLElement>('.pawn-inner');
  const shadow = outer.querySelector<HTMLElement>('.pawn-shadow');
  return inner && shadow ? { outer, inner, shadow } : null;
}

function label(color: string, index: number, progress: number): string {
  const name = `${color[0]?.toUpperCase()}${color.slice(1)} pawn ${index + 1}`;
  if (progress < 0) return `${name}, in the base`;
  if (progress >= HOME_PROGRESS) return `${name}, home`;
  const left = HOME_PROGRESS - progress;
  return `${name}, ${left} ${left === 1 ? 'square' : 'squares'} from home`;
}

/**
 * The pawn layer: glossy pawns at their squares, eligible ones pulsing and tappable, hopping square by square with
 * dust puffs, squash-and-stretch, and an explosive bounce home on capture.
 */
export function Pawns({ state, side, youId, eligible, anim, reduced, onMove, onFx }: Props): ReactElement {
  const cell = side / 15;
  const hit = Math.max(cell, 40);
  const anchor = hit / 2;
  const items = useMemo(() => layoutPawns(state, cell), [state, cell]);
  const layerRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const movingKey = anim?.event.type === 'moved' ? pawnKey(anim.event.by, anim.event.pawn) : null;

  // After a state commit the stylesheet and React own positions again: drop any animation still holding styles.
  useLayoutEffect(() => {
    for (const el of elements.current.values()) {
      el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    }
  }, [state.matchRev]);

  const animId = anim?.id;
  useEffect(() => {
    const event = anim?.event;
    if (!event || event.type !== 'moved') return;
    let cancelled = false;
    const layer = layerRef.current;
    if (!layer) return;
    const byKey = new Map(itemsRef.current.map((i) => [i.key, i]));
    const finalByKey = new Map(layoutPawns(event.state, cell).map((i) => [i.key, i]));
    const key = pawnKey(event.by, event.pawn);
    const parts = partsOf(elements.current.get(key));
    const start = byKey.get(key);
    if (!parts || !start) return;

    const squares: Point[] = event.path.map((sq) => centerOf(sq.cell, cell));
    const end = finalByKey.get(key);
    if (end && squares.length) squares[squares.length - 1] = end.point;
    const routeKeys = event.path.map((sq) => cellKey(sq.cell));
    onFx({ route: new Set(routeKeys), landing: null });

    void (async () => {
      await hopAlong(parts, start.point, squares, cell, anchor, reduced, (p, i) => {
        if (cancelled) return;
        if (!reduced) spawnPuff(layer, p.x, p.y, cell);
        sfx.tap();
        onFx({ route: new Set(routeKeys.slice(i + 1)), landing: routeKeys[i] ?? null });
      });
      if (cancelled) return;
      await Promise.all(
        event.captured.map((c) => {
          const victim = partsOf(elements.current.get(pawnKey(c.playerId, c.pawn)));
          const from = byKey.get(pawnKey(c.playerId, c.pawn));
          const to = finalByKey.get(pawnKey(c.playerId, c.pawn));
          if (!victim || !from || !to) return Promise.resolve();
          return bounceHome(victim, layer, from.point, to.point, cell, anchor, reduced);
        }),
      );
      if (cancelled) return;
      if (event.reachedHome) {
        const c = centerOf(HOME_CENTER, cell);
        celebrateHome(layer, c.x, c.y, cell, reduced);
        sfx.success();
      }
      onFx(NO_FX);
    })();
    return () => {
      cancelled = true;
    };
    // The animation is keyed by its id; the other inputs are read from refs or are stable for that event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animId]);

  const eligibleSet = new Set(eligible);
  const sorted = [...items].sort((a, b) => a.point.y - b.point.y);

  return (
    <div className="pawn-layer" ref={layerRef}>
      <PawnDefs />
      {sorted.map((item) => {
        const mine = item.playerId === youId;
        const canMove = mine && eligibleSet.has(item.index);
        const moving = item.key === movingKey;
        const style = {
          width: hit,
          height: hit,
          transform: place(item.point, anchor),
          zIndex: Math.round(item.point.y) + (canMove ? 2000 : 0) + (moving ? 4000 : 0),
          ['--ps' as string]: item.scale,
        } as CSSProperties;
        const common = {
          ref: (el: HTMLElement | null) => {
            if (el) elements.current.set(item.key, el);
            else elements.current.delete(item.key);
          },
          style,
          'data-color': item.color,
        };
        const body = (
          <>
            <span className="pawn-shadow" aria-hidden="true" />
            <span className="pawn-inner">
              <PawnArt color={item.color} />
            </span>
            <span className="pawn-badge" aria-hidden="true">
              {item.index + 1}
            </span>
          </>
        );
        return canMove ? (
          <button
            {...common}
            key={item.key}
            type="button"
            className={`pawn ${item.color} eligible ${moving ? 'moving' : ''}`}
            aria-label={`${label(item.color, item.index, item.progress)}. Move this pawn`}
            onClick={() => onMove(item.index)}
          >
            {body}
          </button>
        ) : (
          <div
            {...common}
            key={item.key}
            role="img"
            className={`pawn ${item.color} ${moving ? 'moving' : ''}`}
            aria-label={label(item.color, item.index, item.progress)}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}

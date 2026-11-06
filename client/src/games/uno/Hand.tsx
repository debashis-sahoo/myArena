/*
 * The viewer's hand: cards fanned on an arc (planHand from useFit), sorted by sortUnoHand.
 * Props:
 *   playerId  own playerId (you.playerId); the root carries data-uno-hand and data-uno-seat so flights can find the hand.
 *   hand      you.hand, any order.
 *   playable  you.playable.
 *   yourTurn  the viewer may act now: playable cards are raised and bright, the others dimmed. When false every card is shown normally.
 *   drawn     you.drawn (outlined in gold and scrolled into view in a scrolling hand).
 *   width     width of the fan area (fit.hand.width); cardH is fit.hand.cardH. The root is cardH + lift + handPad(cardH) tall.
 *   pad       side padding the screen keeps around the fan area (fit.hand.pad); tilted end cards may use it.
 *   onWild    a playable Wild or Wild Draw 4 was chosen: open the colour wheel (nothing is sent here).
 * Interaction (research R17): click or tap plays; a drag released over the table plays, anywhere else cancels; on touch a press
 * lifts the card, sliding along the hand previews neighbours, releasing on the pressed card plays and releasing over another card
 * cancels. Cards are buttons with aria-disabled (never disabled) so an illegal tap still reaches the server for the bounce and
 * the reason; the bounce and the shake themselves are played by useUnoAnimator from the store's rejection.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactElement } from 'react';
import { sortUnoHand, unoCardLabel, unoCardOf } from '@myarena/shared';
import { CardFace } from './CardFace';
import { playCard } from './unoStore';
import { HAND_PAD, clamp, handPad, planHand, type HandPlan } from './useFit';
import './Hand.css';

export interface HandProps {
  playerId: string;
  hand: readonly number[];
  playable: readonly number[];
  yourTurn: boolean;
  drawn?: number | null;
  width: number;
  cardH: number;
  /** Side padding around the fan area; defaults to HAND_PAD. */
  pad?: number;
  onWild: (card: number) => void;
}

const DRAG_PX = 12;
/** Step that leaves a slice of at least 40 px once the tilt of the neighbours has trimmed it (SC-010). */
const SLICE_FLOOR = 42;
const HOVER_SCALE = 1.12;
/** A resting playable card sits this fraction of the card height higher. */
const RAISE = 0.05;
const PART_NEAR = 0.16;
const DROP_HOLD_MS = 1500;

interface Press {
  pointerId: number;
  id: number;
  index: number;
  x: number;
  y: number;
}

interface Drag {
  id: number;
  dx: number;
  dy: number;
}

interface CardProps {
  id: number;
  index: number;
  left: number;
  top: number;
  w: number;
  h: number;
  z: number;
  transform: string;
  canPlay: boolean;
  dim: boolean;
  lifted: boolean;
  dragging: boolean;
  isDrawn: boolean;
  tab: boolean;
  onFocus: (e: FocusEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
  onActivate: (e: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * planHand's fan, adjusted so the tilted end cards do not poke past the side padding the screen reserves (`pad`): the fan
 * area narrows by the excess, and the tilt eases off only where the narrower area would cost a card slice below SLICE_FLOOR.
 */
function fitFan(width: number, cardH: number, count: number, pad: number): HandPlan {
  const base = planHand(width, cardH, count);
  if (count < 2 || base.scroll) return base;
  const overhang = (deg: number): number => {
    const t = (deg * Math.PI) / 180;
    return Math.ceil(0.5 * (base.cardH * Math.sin(t) - base.cardW * (1 - Math.cos(t))));
  };
  for (let k = 1; k >= 0.1; k -= 0.05) {
    const extra = Math.max(0, overhang(base.spread * k) - pad);
    const plan = planHand(width - 2 * extra, cardH, count);
    if (plan.scroll || (extra > 0 && plan.step < Math.min(SLICE_FLOOR, base.step - 0.5))) continue;
    if (k === 1) return plan;
    return { ...plan, slots: plan.slots.map((s) => ({ ...s, rotation: Math.round(s.rotation * k * 10) / 10 })) };
  }
  return base;
}

const HandCard = memo(function HandCard(p: CardProps): ReactElement {
  const cls = ['un-card-btn', 'un-hc', p.canPlay ? 'playable' : '', p.dim ? 'dim' : '', p.lifted ? 'lifted' : '', p.dragging ? 'dragging' : '', p.isDrawn ? 'drawn' : '']
    .filter(Boolean)
    .join(' ');
  const style: CSSProperties = { left: p.left, top: p.top, width: p.w, height: p.h, zIndex: p.z, transform: p.transform };
  return (
    <button
      type="button"
      className={cls}
      style={style}
      data-uno-card={p.id}
      data-i={p.index}
      aria-label={unoCardLabel(p.id)}
      aria-disabled={p.canPlay ? undefined : true}
      tabIndex={p.tab ? 0 : -1}
      onFocus={p.onFocus}
      onBlur={p.onBlur}
      onClick={p.onActivate}
    >
      <CardFace card={p.id} height={p.h} />
    </button>
  );
});

export function Hand({ playerId, hand, playable, yourTurn, drawn = null, width, cardH, pad = HAND_PAD, onWild }: HandProps): ReactElement {
  const cards = useMemo(() => sortUnoHand(hand), [hand]);
  const ok = useMemo(() => new Set(playable), [playable]);
  const n = cards.length;
  const plan = useMemo(() => fitFan(width, cardH, n, pad), [width, cardH, n, pad]);

  const [hover, setHover] = useState(-1);
  const [preview, setPreview] = useState(-1);
  const [focusLift, setFocusLift] = useState(-1);
  const [rove, setRove] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const live = useRef({ cards, ok, plan, onWild });
  live.current = { cards, ok, plan, onWild };

  /** The card whose visible slice holds this x, by the fan's own geometry (the lifted card's larger footprint cannot steal it). */
  const indexAt = useCallback((clientX: number): number => {
    const fan = fanRef.current;
    const { plan: pl } = live.current;
    const count = pl.slots.length;
    const first = pl.slots[0];
    if (!fan || !first || count === 0) return -1;
    const rel = clientX - fan.getBoundingClientRect().left;
    if (rel < first.x || rel > first.x + (count - 1) * pl.step + pl.cardW) return -1;
    if (count === 1 || pl.step <= 0) return count - 1;
    return clamp(0, Math.floor((rel - first.x) / pl.step), count - 1);
  }, []);

  const fire = useCallback((id: number): void => {
    const { ok: playableIds, onWild: openWheel } = live.current;
    // Only a card the server listed as playable opens the wheel; any other tap goes to the server for its refusal.
    if (playableIds.has(id) && unoCardOf(id).color === null) {
      setDrag(null);
      openWheel(id);
      return;
    }
    void playCard(id).then((accepted) => {
      if (!accepted) setDrag((d) => (d && d.id === id ? null : d));
      else window.setTimeout(() => setDrag((d) => (d && d.id === id ? null : d)), DROP_HOLD_MS);
    });
  }, []);

  const overTable = (x: number, y: number): boolean => {
    const table = document.querySelector('[data-uno-table]');
    if (!table) return true;
    const r = table.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (press.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const index = indexAt(e.clientX);
    const id = live.current.cards[index];
    if (index < 0 || id === undefined) return;
    press.current = { pointerId: e.pointerId, id, index, x: e.clientX, y: e.clientY };
    try {
      rootRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
    setPreview(index);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const p = press.current;
    if (!p) {
      if (e.pointerType === 'mouse') setHover(indexAt(e.clientX));
      return;
    }
    if (e.pointerId !== p.pointerId || !rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (e.clientY < r.top && Math.hypot(dx, dy) > DRAG_PX) {
      setDrag({ id: p.id, dx, dy });
      setPreview(p.index);
    } else {
      setDrag(null);
      setPreview(e.clientY <= r.bottom ? indexAt(e.clientX) : -1);
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId || !rootRef.current) return;
    press.current = null;
    const r = rootRef.current.getBoundingClientRect();
    let play = false;
    if (e.clientY < r.top && Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_PX) play = overTable(e.clientX, e.clientY);
    else if (e.clientY <= r.bottom) play = indexAt(e.clientX) === p.index;
    setPreview(-1);
    setHover(e.pointerType === 'mouse' && e.clientY <= r.bottom ? indexAt(e.clientX) : -1);
    if (play) fire(p.id);
    else setDrag(null);
  };

  const cancelPress = (e: PointerEvent<HTMLDivElement>): void => {
    if (!press.current || e.pointerId !== press.current.pointerId) return;
    press.current = null;
    setPreview(-1);
    setDrag(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-uno-card]') ?? []);
    const cur = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (cur < 0) return;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : clamp(0, cur + (e.key === 'ArrowRight' ? 1 : -1), buttons.length - 1);
    e.preventDefault();
    buttons[next]?.focus();
  };

  const onFocus = useCallback((e: FocusEvent<HTMLButtonElement>): void => {
    const i = Number(e.currentTarget.dataset.i);
    setRove(i);
    setFocusLift(e.currentTarget.matches(':focus-visible') ? i : -1);
  }, []);
  const onBlur = useCallback((): void => setFocusLift(-1), []);
  // Pointer plays are handled above; a click with no pointer behind it (detail 0) is the keyboard or assistive technology.
  const onActivate = useCallback(
    (e: MouseEvent<HTMLButtonElement>): void => {
      if (e.detail === 0) fire(Number(e.currentTarget.dataset.unoCard));
    },
    [fire],
  );

  // A drawn card in a scrolling hand is brought into the visible band before it is flown to.
  useEffect(() => {
    const root = rootRef.current;
    const { cards: list, plan: pl } = live.current;
    if (!root || drawn === null || !pl.scroll) return;
    const slot = pl.slots[list.indexOf(drawn)];
    if (slot) root.scrollLeft = Math.max(0, slot.x - (root.clientWidth - pl.cardW) / 2);
  }, [drawn]);

  const lifted = preview >= 0 ? preview : hover >= 0 ? hover : focusLift;
  const tabbed = Math.min(rove, n - 1);

  return (
    <div
      ref={rootRef}
      className={`un-hand${plan.scroll ? ' scroll' : ''}`}
      style={{ width, height: plan.cardH + plan.lift + handPad(plan.cardH) }}
      data-uno-hand=""
      data-uno-seat={playerId}
      role="group"
      aria-label={`Your hand, ${n} ${n === 1 ? 'card' : 'cards'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelPress}
      onLostPointerCapture={cancelPress}
      onPointerLeave={() => {
        if (!press.current) setHover(-1);
      }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={fanRef} className="un-hand-fan" style={{ width: plan.contentWidth }}>
        {cards.map((id, i) => {
          const slot = plan.slots[i];
          if (!slot) return null;
          const canPlay = ok.has(id);
          const isLifted = lifted === i;
          const dragging = drag?.id === id;
          let tx = 0;
          let ty = 0;
          let rot = slot.rotation;
          let scale = 1;
          if (dragging) {
            tx = drag.dx;
            ty = drag.dy;
            rot = 0;
            scale = HOVER_SCALE;
          } else if (isLifted) {
            ty = plan.scroll ? -(slot.y - Math.max(slot.liftedY, 0.07 * plan.cardH)) : -plan.lift;
            rot = 0;
            scale = HOVER_SCALE;
          } else {
            if (lifted >= 0) {
              const gap = Math.abs(i - lifted);
              if (gap <= 3) tx = Math.sign(i - lifted) * PART_NEAR * plan.cardW * Math.max(0, 1 - (gap - 1) * 0.5);
            }
            if (yourTurn && canPlay) ty = -RAISE * plan.cardH;
          }
          return (
            <HandCard
              key={id}
              id={id}
              index={i}
              left={slot.x}
              top={slot.y}
              w={plan.cardW}
              h={plan.cardH}
              z={dragging ? 400 : isLifted ? 300 : i}
              transform={`translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot}deg) scale(${scale})`}
              canPlay={canPlay}
              dim={yourTurn && !canPlay}
              lifted={isLifted}
              dragging={dragging}
              isDrawn={drawn === id}
              tab={i === tabbed}
              onFocus={onFocus}
              onBlur={onBlur}
              onActivate={onActivate}
            />
          );
        })}
      </div>
    </div>
  );
}

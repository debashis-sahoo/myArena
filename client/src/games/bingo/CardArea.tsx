import type { ReactElement } from 'react';
import type { BingoCard } from '@myarena/shared';
import { CardGrid } from './CardGrid';
import { planCards, useRegionSize } from './useFit';

export interface CardAreaProps {
  cards: BingoCard[];
  /** One 25-bit daub mask per card. */
  daubs: number[];
  /** One flag per card: true once its FREE cell was tapped (hides the FREE hint). */
  freeTapped: boolean[];
  selected: number;
  onSelect: (index: number) => void;
  onToggle: (card: number, cell: number) => void;
}

/** Fills its region with the player's cards: stacked, side by side, or one at a time under a tab strip (planCards). */
export function CardArea({ cards, daubs, freeTapped, selected, onSelect, onToggle }: CardAreaProps): ReactElement {
  const { ref, width, height } = useRegionSize<HTMLDivElement>();
  const n = cards.length;
  const plan = planCards(width, height, n);
  const sel = Math.min(Math.max(0, selected), Math.max(0, n - 1));
  const label = (i: number): string => `Card ${i + 1} of ${n}`;
  const choose = (i: number): void => {
    if (i !== sel) onSelect(i);
  };

  const renderCard = (i: number): ReactElement | null => {
    const card = cards[i];
    if (!card) return null;
    return (
      <div
        key={i}
        className="bz-ca__item"
        onClick={() => choose(i)}
        onFocus={(e) => {
          if (e.target.matches(':focus-visible')) choose(i);
        }}
      >
        <CardGrid
          card={card}
          daubs={daubs[i] ?? 0}
          cellW={plan.cellW}
          cellH={plan.cellH}
          label={label(i)}
          selected={i === sel}
          freeHint={freeTapped[i] !== true}
          tabLabel={n > 1 && plan.mode !== 'tabs' ? label(i) : undefined}
          onToggle={(cell) => onToggle(i, cell)}
        />
      </div>
    );
  };

  const indices = cards.map((_, i) => i);

  return (
    <div ref={ref} className="bz-ca" data-mode={plan.mode}>
      {width > 0 && plan.mode === 'stack' && <div className="bz-ca__stack">{indices.map(renderCard)}</div>}
      {width > 0 && plan.mode === 'row' && <div className="bz-ca__row">{indices.map(renderCard)}</div>}
      {width > 0 && plan.mode === 'tabs' && (
        <div className="bz-ca__tabs">
          <div className="bz-ca__strip" role="group" aria-label="Choose card">
            {indices.map((i) => (
              <button
                key={i}
                type="button"
                className={`bz-ca__tab${i === sel ? ' is-active' : ''}`}
                aria-pressed={i === sel}
                aria-label={label(i)}
                onClick={() => choose(i)}
              >
                {i === sel ? label(i) : `Card ${i + 1}`}
              </button>
            ))}
          </div>
          {renderCard(sel)}
        </div>
      )}
    </div>
  );
}

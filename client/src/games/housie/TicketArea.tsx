import type { MouseEvent, ReactElement } from 'react';
import type { Ticket as TicketData } from '@myarena/shared';
import { Ticket } from './Ticket';
import { WIDE_FROM, planTickets, useRegionSize } from './useFit';
import './TicketArea.css';

export interface TicketAreaProps {
  tickets: TicketData[];
  marks: number[];
  selected: number;
  onSelect: (index: number) => void;
  onToggle: (ticket: number, row: number, col: number) => void;
}

export function TicketArea({ tickets, marks, selected, onSelect, onToggle }: TicketAreaProps): ReactElement {
  const { ref, width, height } = useRegionSize<HTMLDivElement>();
  const plan = planTickets(width, height, tickets.length, typeof window === 'undefined' ? WIDE_FROM : window.innerWidth);
  const sel = Math.min(Math.max(0, selected), Math.max(0, tickets.length - 1));

  const renderTicket = (i: number): ReactElement | null => {
    const t = tickets[i];
    if (!t) return null;
    const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
      if ((e.target as HTMLElement).closest('button')) return;
      onSelect(i);
    };
    return (
      <div
        key={i}
        className="hz-ta__item"
        onClick={handleClick}
        onFocus={(e) => {
          if (e.target.matches(':focus-visible')) onSelect(i);
        }}
      >
        <Ticket
          ticket={t}
          marks={marks[i] ?? 0}
          ink={i % 2 === 0 ? 'red' : 'blue'}
          cell={plan.cell}
          rowH={plan.rowH}
          fontPx={plan.fontPx}
          compact={plan.mode === 'tabs' || tickets.length === 1}
          label={`Ticket #${i + 1}`}
          selected={i === sel}
          onToggle={(row, col) => onToggle(i, row, col)}
        />
      </div>
    );
  };

  const indices = tickets.map((_, i) => i);

  return (
    <div ref={ref} className={`hz-ta${plan.scrollY ? ' is-scroll' : ''}`} data-mode={plan.mode}>
      {width > 0 && plan.mode === 'stack' && <div className="hz-ta__stack">{indices.map(renderTicket)}</div>}
      {width > 0 && plan.mode === 'grid' && <div className="hz-ta__grid">{indices.map(renderTicket)}</div>}
      {width > 0 && plan.mode === 'tabs' && (
        <div className="hz-ta__tabs">
          <div className="hz-ta__strip" role="group" aria-label="Choose ticket">
            {indices.map((i) => (
              <button
                key={i}
                type="button"
                className={`hz-ta__tab${i === sel ? ' is-active' : ''}`}
                aria-pressed={i === sel}
                onClick={() => onSelect(i)}
              >
                Ticket #{i + 1}
              </button>
            ))}
          </div>
          {renderTicket(sel)}
        </div>
      )}
    </div>
  );
}

import type { PatternDef, NumberFilter } from './patterns.js';
import { cellAt, cellBit, columnsOfRow, type Ticket } from './ticket.js';

const FILTERS: Record<NumberFilter, (n: number) => boolean> = {
  any: () => true,
  odd: (n) => n % 2 === 1,
  even: (n) => n % 2 === 0,
  '1-45': (n) => n <= 45,
  '46-90': (n) => n >= 46,
};

/**
 * Whether a claim for `pattern` is valid on `ticket`. A cell counts only if its number was called AND the claimant crossed it
 * (bit `row * 9 + col` of `marks`). Crosses elsewhere on the ticket do not matter.
 */
export function evaluatePattern(
  pattern: PatternDef,
  ticket: Ticket,
  marks: number,
  called: ReadonlySet<number>,
): boolean {
  const satisfied = (row: number, col: number): boolean => {
    const n = cellAt(ticket, row, col);
    return n !== 0 && called.has(n) && (marks & (1 << cellBit(row, col))) !== 0;
  };
  const rowSatisfied = (row: number): boolean => columnsOfRow(ticket, row).every((col) => satisfied(row, col));
  const rule = pattern.rule;

  switch (rule.kind) {
    case 'cells':
      return rule.cells.every(([row, position]) => {
        const col = columnsOfRow(ticket, row)[position - 1];
        return col !== undefined && satisfied(row, col);
      });
    case 'rows':
      return [0, 1, 2].some(rowSatisfied);
    case 'count': {
      const numbers: number[] = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) if (satisfied(row, col)) numbers.push(cellAt(ticket, row, col));
      }
      return rule.parts.every((part) => numbers.filter(FILTERS[part.filter]).length >= part.n);
    }
    case 'full':
      return [0, 1, 2].every(rowSatisfied);
  }
}

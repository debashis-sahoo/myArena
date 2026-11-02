/** A Housie ticket: 3 rows of 9 cells, 0 = empty. */
export type Ticket = number[][];

/** Inclusive [min, max] per column: 1-9, 10-19, ... 70-79, 80-90. */
export const COLUMN_RANGES: ReadonlyArray<readonly [number, number]> = [
  [1, 9],
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 49],
  [50, 59],
  [60, 69],
  [70, 79],
  [80, 90],
];

/** Bit index of a cell in a ticket's 27-bit mark mask. */
export function cellBit(row: number, col: number): number {
  return row * 9 + col;
}

/** The number in a cell, or 0 when empty or out of range. */
export function cellAt(ticket: Ticket, row: number, col: number): number {
  return ticket[row]?.[col] ?? 0;
}

export function ticketKey(ticket: Ticket): string {
  return ticket.flat().join(',');
}

/** Column indexes (ascending) holding numbers in a row: positions 1 to 5. */
export function columnsOfRow(ticket: Ticket, row: number): number[] {
  const cols: number[] = [];
  for (let c = 0; c < 9; c++) if (cellAt(ticket, row, c) !== 0) cols.push(c);
  return cols;
}

/** All 15 numbers, row-major. */
export function ticketNumbers(ticket: Ticket): number[] {
  return ticket.flat().filter((n) => n !== 0);
}

/** Returns an error message, or null when the ticket is valid. */
export function validateTicket(ticket: Ticket): string | null {
  if (!Array.isArray(ticket) || ticket.length !== 3) return 'ticket must have 3 rows';
  for (const row of ticket) {
    if (!Array.isArray(row) || row.length !== 9 || !row.every((n) => Number.isInteger(n))) {
      return 'each row must have 9 integers';
    }
  }
  for (let r = 0; r < 3; r++) {
    if (columnsOfRow(ticket, r).length !== 5) return `row ${r + 1} must have exactly 5 numbers`;
  }
  const numbers = ticketNumbers(ticket);
  if (numbers.length !== 15) return 'ticket must have 15 numbers';
  for (let c = 0; c < 9; c++) {
    const range = COLUMN_RANGES[c];
    if (!range) return 'bad column';
    const [min, max] = range;
    const values = [0, 1, 2].map((r) => cellAt(ticket, r, c)).filter((n) => n !== 0);
    if (values.length < 1 || values.length > 3) return `column ${c + 1} must hold 1 to 3 numbers`;
    for (let i = 0; i < values.length; i++) {
      const v = values[i] ?? 0;
      const prev = i > 0 ? (values[i - 1] ?? 0) : 0;
      if (v < min || v > max) return `column ${c + 1} has a number out of range`;
      if (i > 0 && v <= prev) return `column ${c + 1} must ascend top to bottom`;
    }
  }
  if (new Set(numbers).size !== numbers.length) return 'a number appears twice';
  return null;
}

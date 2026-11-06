/** UNO card table. Ids 0..107 map to colour and value; see specs/006-uno-game-module/data-model.md section 1. */

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoKind = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  /** 0..107 */
  id: number;
  color: UnoColor | null;
  kind: UnoKind;
  /** 0..9 for 'number', otherwise null. */
  rank: number | null;
}

export const UNO_COLORS: readonly UnoColor[] = ['red', 'yellow', 'green', 'blue'];
export const UNO_DECK_SIZE = 108;

export const UNO_COLOR_LABEL: Record<UnoColor, string> = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

export const UNO_COLOR_GLYPH: Record<UnoColor, string> = {
  red: '\u25B2',
  yellow: '\u25CF',
  green: '\u25A0',
  blue: '\u25C6',
};

export const UNO_COLOR_HEX: Record<UnoColor, string> = {
  red: '#ff3b4e',
  yellow: '#ffc928',
  green: '#26c76a',
  blue: '#2f80ff',
};

function buildTable(): UnoCard[] {
  const table: UnoCard[] = [];
  UNO_COLORS.forEach((color, c) => {
    const base = 25 * c;
    table[base] = { id: base, color, kind: 'number', rank: 0 };
    for (let n = 1; n <= 9; n++) {
      for (let copy = 0; copy < 2; copy++) {
        const id = base + 1 + 2 * (n - 1) + copy;
        table[id] = { id, color, kind: 'number', rank: n };
      }
    }
    const actions: UnoKind[] = ['skip', 'reverse', 'draw2'];
    actions.forEach((kind, i) => {
      for (let copy = 0; copy < 2; copy++) {
        const id = base + 19 + 2 * i + copy;
        table[id] = { id, color, kind, rank: null };
      }
    });
  });
  for (let id = 100; id < 104; id++) table[id] = { id, color: null, kind: 'wild', rank: null };
  for (let id = 104; id < 108; id++) table[id] = { id, color: null, kind: 'wild4', rank: null };
  return table;
}

const TABLE: readonly UnoCard[] = buildTable();

/** Decodes a card id. Throws RangeError for anything outside 0..107. */
export function unoCardOf(id: number): UnoCard {
  const card = Number.isInteger(id) ? TABLE[id] : undefined;
  if (!card) throw new RangeError(`Not an UNO card id: ${id}`);
  return card;
}

/** Spoken and visible name of a card, for example "Red 7", "Blue Skip", "Wild Draw Four". */
export function unoCardLabel(id: number): string {
  const card = unoCardOf(id);
  switch (card.kind) {
    case 'number':
      return `${UNO_COLOR_LABEL[card.color as UnoColor]} ${card.rank}`;
    case 'skip':
      return `${UNO_COLOR_LABEL[card.color as UnoColor]} Skip`;
    case 'reverse':
      return `${UNO_COLOR_LABEL[card.color as UnoColor]} Reverse`;
    case 'draw2':
      return `${UNO_COLOR_LABEL[card.color as UnoColor]} Draw Two`;
    case 'wild':
      return 'Wild';
    case 'wild4':
      return 'Wild Draw Four';
  }
}

const KIND_ORDER: Record<UnoKind, number> = { number: 0, skip: 10, reverse: 11, draw2: 12, wild: 20, wild4: 21 };

function sortKey(card: UnoCard): number {
  const colorIndex = card.color ? UNO_COLORS.indexOf(card.color) : UNO_COLORS.length;
  return colorIndex * 100 + KIND_ORDER[card.kind] + (card.rank ?? 0);
}

/** Display order: by colour, then rank, then Skip, Reverse, Draw 2; Wild then Wild Draw 4 last. */
export function sortUnoHand(ids: readonly number[]): number[] {
  return [...ids].sort((a, b) => sortKey(unoCardOf(a)) - sortKey(unoCardOf(b)) || a - b);
}

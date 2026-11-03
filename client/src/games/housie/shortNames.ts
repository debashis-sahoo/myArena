/** Display-only short names (at most 9 characters) used when a full combination title cannot fit its tile at 10 px. */
export const SHORT_NAMES: Record<string, string> = {
  'early-five': 'Early 5',
  'early-seven': 'Early 7',
  'early-ten': 'Early 10',
  'early-twelve': 'Early 12',

  'any-line': 'Any Line',
  'top-line': 'Top Line',
  'middle-line': 'Mid Line',
  'bottom-line': 'Bot Line',
  'top-and-middle': 'Top+Mid',
  'middle-and-bottom': 'Mid+Bot',
  'top-and-bottom': 'Top+Bot',

  'four-corners': '4 Cnrs',
  star: 'Star',
  pyramid: 'Pyramid',
  'reverse-pyramid': 'Rev Pyr',
  diamond: 'Diamond',
  'left-edge': 'L Edge',
  'right-edge': 'R Edge',
  'both-edges': '2 Edges',
  'middle-column': 'Mid Col',
  plus: 'Plus',
  'letter-h': 'Letter H',
  'letter-u': 'Letter U',
  'letter-t': 'Letter T',
  frame: 'Frame',
  'letter-l': 'Letter L',
  'letter-z': 'Letter Z',
  checkerboard: 'Checkers',
  'diagonal-down': 'Diag Down',
  'diagonal-up': 'Diag Up',
  'corners-and-middle-line': 'Corn+Mid',

  'five-odds': '5 Odds',
  'five-evens': '5 Evens',
  'young-five': 'Young 5',
  'old-five': 'Old 5',
  'young-and-old': 'Young+Old',

  'almost-house': 'Alm House',
  'full-house-1': 'House 1st',
  'full-house-2': 'House 2nd',
  'full-house-3': 'House 3rd',
};

export function shortNameOf(id: string, fullName: string): string {
  return SHORT_NAMES[id] ?? fullName;
}

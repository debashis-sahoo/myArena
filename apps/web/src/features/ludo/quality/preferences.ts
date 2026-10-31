export type ViewMode = 'angled' | 'top';
export const VIEW_KEY = 'myarena-ludo-view';

/** The camera the player last chose; the angled view when nothing is stored or storage is blocked. */
export function storedView(): ViewMode {
  try { return window.localStorage.getItem(VIEW_KEY) === 'top' ? 'top' : 'angled'; } catch { return 'angled'; }
}

export function saveView(mode: ViewMode): void {
  try { window.localStorage.setItem(VIEW_KEY, mode); } catch { /* storage may be blocked; the choice just does not persist */ }
}

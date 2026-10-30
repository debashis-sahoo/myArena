const key = 'myarena-last-room';

export function getLastRoom(): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function setLastRoom(roomId: string): void {
  try { window.localStorage.setItem(key, roomId); } catch { /* storage may be blocked */ }
}

export function clearLastRoom(): void {
  try { window.localStorage.removeItem(key); } catch { /* storage may be blocked */ }
}

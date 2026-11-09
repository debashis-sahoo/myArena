import { useSyncExternalStore } from 'react';

/**
 * The half-typed message per room, kept in memory only (specs/007 contracts/platform-extensions.md section 3). Closing a drawer,
 * collapsing a dock or changing layout unmounts the chat panel, so the draft lives here instead of in the panel. Nothing is persisted.
 */
const drafts = new Map<string, string>();
const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((l) => l());

export function getDraft(roomId: string): string {
  return drafts.get(roomId) ?? '';
}

export function setDraft(roomId: string, text: string): void {
  if (getDraft(roomId) === text) return;
  if (text === '') drafts.delete(roomId);
  else drafts.set(roomId, text);
  notify();
}

export function clearDraft(roomId: string): void {
  if (!drafts.delete(roomId)) return;
  notify();
}

export function subscribeDraft(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The draft of one room, re-read whenever any draft changes. */
export function useDraft(roomId: string | null): string {
  return useSyncExternalStore(
    subscribeDraft,
    () => (roomId ? getDraft(roomId) : ''),
    () => '',
  );
}

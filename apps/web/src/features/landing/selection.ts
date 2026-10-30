import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { CatalogEntry } from '@myarena/protocol';

/** Resolves the selected playable game from `?game=`; unknown or coming-soon ids are ignored. */
export function resolveSelection(entries: readonly CatalogEntry[], gameId: string | null): CatalogEntry | null {
  if (!gameId) return null;
  return entries.find((entry) => entry.id === gameId && entry.status === 'PLAYABLE') ?? null;
}

export function useSelection(entries: readonly CatalogEntry[]) {
  const [params, setParams] = useSearchParams();
  const gameId = params.get('game');
  const selected = useMemo(() => resolveSelection(entries, gameId), [entries, gameId]);

  const select = useCallback((entry: CatalogEntry) => {
    setParams((previous) => { const next = new URLSearchParams(previous); next.set('game', entry.id); return next; }, { replace: true });
  }, [setParams]);

  const dismiss = useCallback(() => {
    setParams((previous) => { const next = new URLSearchParams(previous); next.delete('game'); return next; }, { replace: true });
  }, [setParams]);

  return { selected, select, dismiss };
}

import { useCallback, useEffect, useState } from 'react';
import type { CatalogEntry } from '@myarena/protocol';
import { getCatalog } from '../../platform/api-client';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; entries: CatalogEntry[] };

export function useCatalog(): { state: CatalogState; reload: () => void } {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    getCatalog().then(
      (response) => { if (current) setState({ status: 'ready', entries: response.entries }); },
      () => { if (current) setState({ status: 'error' }); },
    );
    return () => { current = false; };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, reload };
}

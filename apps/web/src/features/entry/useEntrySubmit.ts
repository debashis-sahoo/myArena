import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { FormError } from '../../a11y/ErrorSummary';
import { ApiError, apiRequest, type EntryResult } from '../../platform/api-client';
import { setLastRoom } from '../../platform/last-room';
import { saveDisplayName } from '../../platform/preferences';
import { toFormErrors } from './entry-errors';

type EntryPath = '/api/rooms' | '/api/rooms/join';

/** Shared submit state for create and join: one retry key until the inputs change, errors, and navigation on success. */
export function useEntrySubmit(nameFieldId: string, fieldMap: Record<string, string> = {}) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FormError[]>([]);
  const [busy, setBusy] = useState(false);
  const retryKey = useRef<string | null>(null);

  const inputsChanged = () => { retryKey.current = null; };

  async function submit(path: EntryPath, body: { displayName: string } & Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: unknown }> {
    retryKey.current ??= crypto.randomUUID();
    setBusy(true);
    setErrors([]);
    try {
      const result = await apiRequest<EntryResult>(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': retryKey.current } });
      retryKey.current = null;
      saveDisplayName(body.displayName);
      setLastRoom(result.roomId);
      navigate(`/room/${result.roomId}`);
      return { ok: true };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 0) retryKey.current = null;
      setErrors(toFormErrors(error, nameFieldId, fieldMap));
      setBusy(false);
      return { ok: false, error };
    }
  }

  return { errors, setErrors, busy, submit, inputsChanged };
}

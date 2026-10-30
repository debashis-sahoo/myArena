import type { LudoMatchView } from '@myarena/ludo';
import { statusText } from '../a11y/describe';

/** One plain-language line about what is happening now, announced politely. */
export function StatusBar({ view, settled }: { view: LudoMatchView; settled: boolean }) {
  return <p className="ludo-status" role="status">{statusText(view, settled)}</p>;
}

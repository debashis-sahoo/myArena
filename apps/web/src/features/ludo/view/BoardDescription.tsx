import type { LudoMatchView } from '@myarena/ludo';
import { describeBoard } from '../a11y/describe';

/** The board in words, visually hidden: every seat in turn order, then the current phase. It follows every state change. */
export function BoardDescription({ view }: { view: LudoMatchView }) {
  return (
    <ul className="sr-only" aria-label="Board description">
      {describeBoard(view).map((line, index) => <li key={index}>{line}</li>)}
    </ul>
  );
}

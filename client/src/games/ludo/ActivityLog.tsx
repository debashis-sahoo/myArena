import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX, type ActivityEntry } from '@myarena/shared';

/** Game events in order with the acting player's colour (rolls, moves, captures, pawns home, turn changes). */
export function ActivityLog({ entries }: { entries: ActivityEntry[] }): ReactElement {
  const ref = useRef<HTMLOListElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <section className="activity" aria-label="Game activity">
      <h3 className="panel-title">Activity</h3>
      <ol
        className="activity-list"
        ref={ref}
        role="log"
        aria-live="off"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {entries.map((e) => (
          <li key={e.id} className={`activity-item ${e.kind}`} style={{ ['--c' as string]: COLOR_HEX[e.color ?? ''] ?? 'var(--muted)' } as CSSProperties}>
            <span className="dot" aria-hidden="true" />
            <span className="activity-text">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

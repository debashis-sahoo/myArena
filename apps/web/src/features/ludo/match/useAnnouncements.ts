import { useEffect, useRef } from 'react';
import type { LudoMatchView } from '@myarena/ludo';
import { useAnnouncer } from '../../../a11y/announcer';
import { announcementFor } from '../a11y/describe';

/**
 * One polite message per live update about what the status line does not already say (moves, captures, automatic play,
 * away, departures). Updates without events (the first render, a snapshot after a reconnect) say nothing, and a roll is
 * announced by the die itself when it settles.
 */
export function useAnnouncements(view: LudoMatchView, seq: number, events: readonly unknown[] | undefined): void {
  const announce = useAnnouncer();
  const spoken = useRef<number | null>(null);
  useEffect(() => {
    if (spoken.current === seq) return;
    const first = spoken.current === null;
    spoken.current = seq;
    if (first || !events || events.length === 0) return;
    const text = announcementFor(view, events);
    if (text) announce(text);
  }, [seq, events, view, announce]);
}

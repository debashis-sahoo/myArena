import { createContext, useContext, useState, type ReactNode } from 'react';

const AnnouncerContext = createContext<(text: string) => void>(() => {});
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [announcement, setAnnouncement] = useState({ text: '', sequence: 0 });
  return <AnnouncerContext value={(text) => setAnnouncement((previous) => ({ text, sequence: previous.sequence + 1 }))}>
    {children}
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only"><span key={announcement.sequence}>{announcement.text}</span></div>
  </AnnouncerContext>;
}
export const useAnnouncer = () => useContext(AnnouncerContext);
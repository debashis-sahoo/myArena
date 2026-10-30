import { useEffect, useRef, useState } from 'react';
import type { ConnectionStatus } from '../../platform/reconnect';

// Never implies the member left: a dropped connection only holds the seat while it recovers.
export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  const [recovered, setRecovered] = useState(false);
  const wasReconnecting = useRef(false);

  useEffect(() => {
    if (status === 'reconnecting') { wasReconnecting.current = true; setRecovered(false); return; }
    if (status === 'connected' && wasReconnecting.current) {
      wasReconnecting.current = false;
      setRecovered(true);
      const timer = setTimeout(() => setRecovered(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const text = status === 'reconnecting' ? 'Reconnecting. Your seat is held while we reconnect you.' : recovered ? 'Back online.' : '';
  return <div role="status" aria-live="polite" className={text ? 'banner' : 'sr-only'}>{text}</div>;
}

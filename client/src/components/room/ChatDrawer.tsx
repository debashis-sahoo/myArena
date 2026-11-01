import type { ReactElement } from 'react';
import type { ChatMessage } from '@myarena/shared';
import { setDrawerOpen, useRoom } from '../../state/roomStore';
import { ChatPanel } from './ChatPanel';

/** Phone layout: collapsible bottom drawer with an unread badge while collapsed (FR-028). */
export function ChatDrawer({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  const { drawerOpen, unread } = useRoom();
  return (
    <div className={`chat-drawer ${drawerOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="drawer-handle"
        aria-expanded={drawerOpen}
        aria-controls="chat-drawer-body"
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        <span aria-hidden="true">💬</span>
        <span>Chat</span>
        {!drawerOpen && unread > 0 && (
          <span className="unread" aria-label={`${unread} unread messages`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <span className="drawer-chevron" aria-hidden="true">
          {drawerOpen ? '▾' : '▴'}
        </span>
      </button>
      <div id="chat-drawer-body" className="drawer-body" hidden={!drawerOpen}>
        <ChatPanel messages={messages} youId={youId} className="in-drawer" />
      </div>
    </div>
  );
}

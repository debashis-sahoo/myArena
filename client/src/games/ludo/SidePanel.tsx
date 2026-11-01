import { useEffect, type ReactElement } from 'react';
import type { ActivityEntry, ChatMessage } from '@myarena/shared';
import { ChatPanel } from '../../components/room/ChatPanel';
import { setDrawerOpen, useRoom } from '../../state/roomStore';
import { ActivityLog } from './ActivityLog';
import { updateLayoutPrefs, useLayoutPrefs } from './layoutPrefs';

interface Props {
  messages: ChatMessage[];
  youId: string;
  activity: ActivityEntry[];
  /** True while the panel is actually on screen (column open or drawer expanded). */
  visible: boolean;
}

/**
 * Chat and Activity tabs, shared by the landscape column and the portrait drawer. Unread counting reuses the platform
 * store: chat counts as "read" only while the Chat tab is visible.
 */
export function SidePanel({ messages, youId, activity, visible }: Props): ReactElement {
  const { activityTab: tab } = useLayoutPrefs();
  const { unread } = useRoom();
  const chatVisible = visible && tab === 'chat';

  useEffect(() => {
    setDrawerOpen(chatVisible);
  }, [chatVisible]);

  return (
    <div className="side-panel">
      <div className="side-tabs" role="tablist" aria-label="Chat and activity">
        <button
          type="button"
          role="tab"
          id="tab-chat"
          aria-selected={tab === 'chat'}
          aria-controls="panel-chat"
          className={`side-tab ${tab === 'chat' ? 'on' : ''}`}
          onClick={() => updateLayoutPrefs({ activityTab: 'chat' })}
        >
          Chat
          {!chatVisible && unread > 0 && (
            <span className="unread" aria-label={`${unread} unread messages`}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-activity"
          aria-selected={tab === 'activity'}
          aria-controls="panel-activity"
          className={`side-tab ${tab === 'activity' ? 'on' : ''}`}
          onClick={() => updateLayoutPrefs({ activityTab: 'activity' })}
        >
          Activity
        </button>
      </div>
      <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat" className="side-body" hidden={tab !== 'chat'}>
        <ChatPanel messages={messages} youId={youId} className="in-side" />
      </div>
      <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" className="side-body" hidden={tab !== 'activity'}>
        <ActivityLog entries={activity} />
      </div>
    </div>
  );
}

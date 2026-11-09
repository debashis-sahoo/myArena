# Contract: Platform Extensions

What the Platform Core gains so that games can use it without duplicating room, chat or audio plumbing (constitution Principle IV). Every addition is optional for a game; a game that
ignores them behaves exactly as before.

## 1. Server: `GameContext` and `GameEngine` (`server/src/games/registry.ts`)

```ts
interface GameContext {
  // existing members unchanged ...
  /** One system chat line, sanitised and rate limited (at most 5 per second per room). `code` defaults to 'game_notice'. */
  notice(text: string, code?: 'game_notice' | 'humor'): void;
  /** True while the participant has a live connection (bots are always connected). Used to avoid acting for people who are away. */
  isConnected(playerId: string): boolean;
}

interface GameEngine {
  // existing members unchanged ...
  /**
   * Optional. A routine room line (joined, left, disconnected, reconnected, removed, host_changed, seat_released, capacity_changed)
   * that the platform would have written to chat but suppressed because the game is a quiet-chat game with a running match.
   * The game may record it in its own activity feed. It must not write chat in response.
   */
  onRoomNotice?(match: unknown, code: SystemCode, text: string): void;
}
```

### `Room.announce` behavior

| Game `quietChat` | Room state | Engine implements `onRoomNotice` | Result |
|------------------|------------|----------------------------------|--------|
| false | any | n/a | chat line written (unchanged) |
| true | lobby | n/a | chat line written (unchanged) |
| true | in progress | no | nothing written (unchanged) |
| true | in progress | yes | `onRoomNotice(match, code, text)`; nothing written to chat |

`match_started` is never forwarded (an engine already records its own start). `isConnected` reads the room's participant table: `connection === 'connected'` for a human, always true for
a bot, false for an unknown id.

### Guarantees

- No change for Housie, Bingo and UNO (they are quiet-chat games without the hook): checked by V12.
- `notice` keeps the existing sanitizing and rate limit; the `humor` code does not change them.
- The hook runs synchronously inside `announce`, before the room broadcasts its next state; it must not throw (a throw is caught and logged by the room).

## 2. Shared: `SystemCode` (`shared/src/protocol.ts`)

`SystemCode` gains `'humor'`. Clients that do not know a code render system lines as before; the chat panel styles `humor` lines (icon, italic) and does not count them as unread.

## 3. Client: chat panel, draft and presentation preference

### `ChatPanel` (platform component, unchanged props)

- The draft text is read from and written to `state/chatDraft.ts` for the current room, so unmounting the panel (closing a drawer, collapsing a dock, a mode change) does not lose it.
  A successful send clears it; a failed send restores it (today's behavior); leaving the room clears it.
- System lines with `systemCode === 'humor'` render with the class `chat-humor` (a small icon and italic text). Other system lines are unchanged.

### `state/chatDraft.ts`

```ts
getDraft(roomId: string): string
setDraft(roomId: string, text: string): void
clearDraft(roomId: string): void
```

### `state/chatPrefs.ts`

```ts
type ChatPref = 'open' | 'minimized' | null;           // null: the game's default applies
useChatPref(gameId: string): [ChatPref, (p: 'open' | 'minimized') => void]
```

Storage key `myarena.chat.<gameId>`; invalid values read as `null`; when storage is unavailable the value lives in memory for the session. A game reads the preference and decides what
"open" and "minimized" look like in its layout. Housie keeps its existing store; Ludo keeps its existing layout preference.

## 4. Client: audio (summary; details in [audio-platform.md](audio-platform.md))

- `audio/prefs.ts`: `useAudioPrefs()`, `setSoundOn`, `setSoundVolume`, `setMusicOn`, `setMusicVolume`.
- `components/common/AudioControls.tsx`: the only audio UI; used by every room screen header and the Hub header.
- `audio/useRoomMusic.ts`: mounted once by `RoomShell`; the only place that starts or stops a theme.

## 5. What a game must and must not do

| A game must | A game must not |
|-------------|-----------------|
| Mount `AudioControls` in each of its screen headers | Create its own audio context, preference record or music player |
| Use `ChatPanel` for chat and `useChatPref` if it offers minimize | Keep its own draft or build a parallel chat |
| Record routine room lines through `onRoomNotice` if it wants them in an activity feed | Write routine lines to chat while a quiet match runs |

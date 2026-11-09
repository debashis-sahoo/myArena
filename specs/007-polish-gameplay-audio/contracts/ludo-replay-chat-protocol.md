# Contract: Ludo Replay, Chat Routing and Humor

Server-authoritative additions to the Ludo protocol ([specs/002-ludo-game-module/contracts](../../002-ludo-game-module/contracts/)). Everything not listed here is unchanged.

## 1. Intent: `playAgain`

```jsonc
// client -> server, existing event "game:action" (the strict action schema already contains this shape for UNO)
{ "type": "playAgain" }
// ack: { "ok": true }  or  { "ok": false, "message": "<reason>" }
```

Checks run in this order; the first failure is the refusal and changes nothing:

| # | Check | Refusal message |
|---|-------|-----------------|
| 1 | caller is the current host (`ctx.hostId()` at action time) | "Only the host can do that." |
| 2 | `state.phase === 'finished'` | "The match is not over." |
| 3 | at least two players have `status === 'active'` | "At least two players are needed to play again." |
| 4 | every active human is connected (`ctx.isConnected`); players who left are not checked | "Waiting for {Name} to reconnect." |

A repeated request finds the match no longer finished and fails check 2, so one finished match starts at most one new match. The same rules apply in Play Online and Play with AI (bots
are always connected and never leave; in an AI room the only human is the host). The next match is made of the players with `status === 'active'`; players who left are not part of it.

## 2. Replay events

On acceptance the engine emits, in order, with `seq` continuing from the previous match:

1. `match_started` with `state` = the fresh match (phase `waiting_roll`, only the active players of the finished match in their existing order with the same ids, colours and kinds and
   `slot` renumbered 1 to N, all pawns in base, `winner` null, `standings` empty, `warning` null, `lastPlayer` null) and `entry` = a `match` Activity entry ("Match 2 started: Alice, Bob
   and Casey"). `state.activity` still holds the earlier entries (at most the last 100).
2. The normal first-turn `turn` event (`reason: 'start'`), from `startTurn`.

Clients need no new handling: `match_started` is already treated as a state commit, the results overlay closes because `phase` is no longer `finished`, and the board and panels redraw
from the snapshot (a corner with no player simply has no pawns or label). A client that missed events receives the newest snapshot through the existing resync path.

## 3. New Activity kinds and event

```ts
type ActivityKind = 'turn' | 'roll' | 'move' | 'capture' | 'home' | 'bonus' | 'skip' | 'timeout' | 'warning' | 'released' | 'win'
                  | 'room'    // a presence or host line recorded from the platform
                  | 'match';  // a match boundary
type LudoEvent = ... | (EventBase & { type: 'notice' });   // carries `entry`; the state is unchanged
```

The `notice` event is how a `room` entry reaches clients between other events. The Activity list renders `room` entries with a neutral dot and `match` entries as a full-width divider.

## 4. Where each message goes while a match is running

| Message | Destination | Notes |
|---------|-------------|-------|
| A player's typed message | Chat | unchanged |
| Humor line | Chat, system line, code `humor` | section 5 |
| Roll, move, capture, home, bonus, skip, turn, timeout, warning, win | Activity | unchanged; the former bot commentary (chat lines from the bot's seat) is removed |
| Left, removed, inactivity release | Activity (`released`) | already recorded by `onSeatReleased` |
| Disconnected, reconnected, host changed | Activity (`room`) | through `onRoomNotice`; no chat line |
| Match started, new match | Activity (`turn` "Match started" for the first, `match` for replays) | |
| Urgent feedback (missed-turn warning, refused action, lost connection) | stays visible outside Chat (the warned player's dice-console alert; "Reconnecting" or "Left" on the player bubble; toast; connection banner); server-known events (others' connection changes, warnings, releases) are also recorded in Activity | FR-018 |
| Before the first match (lobby) | Chat | the lobby has no Activity view |

## 5. Humor

Rules are in [data-model.md](../data-model.md) section 4; research in [research.md](../research.md) R8.

```jsonc
// server -> room, existing chat event; the client sees an ordinary system message with a new code
{ "id": 42, "kind": "system", "systemCode": "humor", "name": "myArena", "color": "system", "text": "Sam, that thumb is warmed up. Roll it.", "ts": 1760000000000 }
```

- The first line comes 45 to 90 s after a match or a replay starts, then every 45 to 90 s (uniform random each time); the timer stops when the match finishes or the room closes.
- A line is posted only while the match is running and at least one human is connected; otherwise the timer re-arms silently.
- No exact repeat within the previous five lines; at least 12 general and 12 addressed lines; addressed lines use only a public display name and facts held in the match state.
- Chat renders `humor` lines distinctly and does not count them as unread.

## 6. Client behavior (`games/ludo/`)

| Part | Behavior |
|------|----------|
| Results overlay | Host: **Play again** (primary; "Play again (N players)" when someone left) and **Back to Hub**. Non-host: "Waiting for {host} to start the next match" and **Back to Hub**. Opens on `phase === 'finished'`, closes when the phase changes |
| Next-table preview | When at least one player has `status === 'left'`, every player sees a line under the standings: "Next match: Alice, Bob and Casey. Dan left." (the host's button names the count). With nobody gone there is no line |
| Disabled state | For the host when the local check fails (a human's connection is not `connected`, or fewer than two players are active): the button is disabled and the reason is shown under it ("Waiting for {Name} to reconnect." or "At least two players are needed to play again."). The server's refusal remains the authority and is shown as a toast if the local view was stale |
| Pending guard | After a click the button shows a busy state until the phase leaves `finished` or the ack fails; further clicks are ignored |
| Focus | The overlay focuses **Play again** (host) or **Back to Hub** (others) as today |
| Activity | `room` entries and `match` dividers are rendered by `ActivityLog`; unread counting follows the existing Chat and Activity tab behavior |

## 7. Guarantees

- Only the current host can start a replay; at most one new match starts from one finished match.
- A replay never recruits or replaces a player, never recolours or re-seats anyone, and never shows the lobby; players who left are dropped visibly (preview, button count and Activity entry), never silently.
- A player who is only disconnected is never dropped by replay: replay waits until they return or the platform releases their seat.
- Replay, humor and Activity routing are decided and ordered on the server; clients only render them.
- A reconnecting client receives the authoritative snapshot (including the kept Activity list) before acting; missed humor lines are not replayed.

# Contract: Game Channel (platform delta over 001)

The platform gains one generic way for a game to receive player actions and to send its state to
the room. It carries opaque JSON and holds no game rules (Principle VIII). Everything here is
additive: no existing message, event or code changes meaning.

## 1. Protocol additions (`packages/protocol`)

### Client to server

| `type` | Role | Fields | Notes |
|--------|------|--------|-------|
| `game.action` | HOST, PLAYER | `action: { type, payload? }` | Both roles are held to the same game rules |

- `action.type`: 1 to 32 characters, `^[a-z][a-zA-Z0-9.]*$`.
- `action.payload`: optional JSON value. The whole frame stays within the 4 KB limit.
- Like every intent it carries `clientActionId`; a repeated id returns the stored `ack` and the
  action is not applied again. This is what makes a resend after reconnection safe.
- The sender is taken from the session only. A `participantId`, `seat` or similar field inside
  `action` is a game concern and is never used for authorization by the platform.

### Server to client

| `type` | Fields | Notes |
|--------|--------|-------|
| `game` | `matchId`, `seq`, `state`, `events` | One per game update, built separately for each recipient |

- `matchId`: UUID created by the platform when a match starts or restarts.
- `seq`: integer starting at 1 for each `matchId`, increasing by 1 per published update.
- `state`: the recipient's complete projection of the game (JSON). It is always a full
  replacement, never a delta, so a missed message is repaired by the next one.
- `events`: zero or more JSON descriptions of what just happened, used only to animate and
  announce. A client that missed an event still reaches the right state from `state`.
- A client ignores a message whose `matchId` equals the current one and whose `seq` is not
  greater than the last one it applied. A new `matchId` replaces everything.

### Snapshot

`snapshot` gains an optional field `game: { matchId, seq, state } | null`. It is present while
`lobby.matchStatus` is `IN_PROGRESS` or `ENDED` and the game provides a view, and `null` (or
absent) otherwise. A reconnecting or resyncing client therefore gets the board with the room.

### Room events

No new room event is added. The existing `match.started`, `match.rematch`, `match.ended` and
`match.returnedToLobby` events stay the only room-level match signals. Game updates never
change the room `version`, so version contiguity (001 realtime protocol) is unaffected.

### Rejection

New code `GAME_ACTION_REJECTED` for `ack.status = REJECTED`. The game supplies the plain-language
`detail` and `nextStep`; the platform supplies defaults when the game gives none
(`detail`: "That action is not allowed right now.", `nextStep`: "Check the game and try again.").
A rejected action never changes state.

Existing codes still apply: `VALIDATION_FAILED` (malformed frame or action), `RATE_LIMITED`
(shared 20 intents per 10 seconds per participant), `ROOM_CLOSED`.

## 2. Game SDK additions (`packages/game-sdk`)

```text
JsonValue                    string | number | boolean | null | JsonValue[] | { [key]: JsonValue }

MatchContext (added)
  participants   readonly { id: string, label: string }[]   seated members at match start, in join order
  publish(events?: readonly JsonValue[]): void               send every connected member their view now

ActionResult
  { accepted: true }
  { accepted: false, reason: string, detail?: string, nextStep?: string }

GameLifecycle (added, all optional)
  viewFor(roomId, participantId): JsonValue | null           that member's projection, or null for none
  onParticipantLeft(roomId, participantId, reason)           reason: left | removed | expired
  releaseMatch(roomId): void                                 free the finished match's state
```

Rules for the platform:

1. `publish` assigns the next `seq`, calls `viewFor` once per connected member of the room, and
   sends each result as a `game` message. A `null` view is not sent.
2. `onParticipantLeft` is called after the seat is released while a match is in progress, once
   per released seat, in the same turn of the event loop as the room event.
3. `onMatchEnd` keeps its meaning (the match is over; stop timers). It does not discard the
   final state: `viewFor` keeps answering until `releaseMatch`.
4. `releaseMatch` is called when the room returns to the lobby, when a rematch replaces the
   match, and when the room closes.
5. A game without `viewFor` behaves exactly as today (the test games are unchanged).
6. The host's room role is never passed to the game.

Rules for a game:

- It owns its rules, timers and state. It uses only `MatchContext.clock` for time.
- It never publishes data a recipient may not see; `viewFor` is the only place state becomes
  visible (compare `projection.ts` for the lobby).
- It keeps per-room state bounded and frees it in `releaseMatch`.

## 3. Server wiring

- `authorize` allows `game.action` for every member (it is not host-only).
- The intent handler routes `game.action` to the existing `submitGameAction`, then answers with
  the ack as for any intent; the version in the ack is the current room version.
- `snapshotFor` adds `game` from `viewFor`.
- `RoomService` records `matchId` and the `seq` counter on the room, resets both on start and on
  rematch, and clears them on return to the lobby.
- `startBlockedReason` and `selectGame` stay game-neutral; the one new platform rule is that a
  room's participant limit may never exceed the selected game's maximum (see `settings.update`
  below).

### `settings.update` and `game.select` (clarification of 001 behavior)

- `settings.update` with `maxParticipants` is rejected with `VALIDATION_FAILED` when a game is
  selected and the value is above that game's `maxParticipants`.
- `game.select` is rejected with `START_BLOCKED_PARTICIPANT_COUNT` when more people hold seats
  than the game's `maxParticipants`; otherwise the room's limit is lowered to that maximum if it
  was higher.

## 4. Web additions

- `RoomState` gains `game: { matchId, seq, state, events } | null`. The reducer applies
  `game` messages and `snapshot.game`, and clears `game` on `match.started`, `match.rematch` and
  `match.returnedToLobby`.
- An online game module registry (`apps/web/src/features/games/registry.ts`) maps a game id to
  lazily loaded components, in the same style as the solo registry:

```text
OnlineGameModule
  Settings   component   the lobby settings the host edits (props: settings, editable, seats, run)
  Match      component   the match area (props: lobby, game, run, onAnnounce)
```

- `RoomPage` shows `Settings` instead of the generic settings list for a game that has a
  module, and `Match` in place of the lobby while `lobby.status` is `IN_MATCH` or the match has
  ended, always next to the existing member list, chat and match controls. A game without a
  module keeps today's behavior.

## 5. Compatibility

- Old clients ignore `game` messages only if they tolerate unknown types; the shared schema is
  updated together with both apps, so the repository ships them as one unit.
- No REST endpoint changes except the optional catalog `art.image` field (see
  [catalog-art-image.openapi.yaml](catalog-art-image.openapi.yaml)).

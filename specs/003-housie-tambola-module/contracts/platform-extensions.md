# Contract: Platform Core Extensions for Housie

Updates [../../002-ludo-game-module/contracts/platform-extensions.md](../../002-ludo-game-module/contracts/platform-extensions.md). Every
change is **game-agnostic and optional**: a game that does not use a hook behaves exactly as before (Ludo and the placeholder games are
unchanged). None of these names mention Housie. Rationale: [../research.md](../research.md) R6 to R10.

## Shared (`shared/src`)

| Change | Detail |
|--------|--------|
| `GameDefinition` | New optional flags: `roster?: boolean` (seats on demand, any number up to `maxPlayers`), `quietChat?: boolean` (no automatic system chat lines while a match is in progress; the lobby keeps them). Housie: `status: 'active'`, `minPlayers: 2`, `maxPlayers: 200`, `defaultCapacity: 10`, `supportsAi: false`, `roster: true`, `quietChat: true` |
| `COLOR_HEX` / roster palette | `ROSTER_COLORS`: 12 distinct colour keys with hex values (the existing four plus eight more); roster rooms assign by join order, cycling |
| `RoomState` | `gameLobby?: unknown` (the engine's public lobby view while in the lobby) |
| `SystemCode` | Adds `game_notice` |
| `EVENTS` | Adds `ROOM_RESET: 'room:reset'` |
| `JoinedData.game` | Widened from `LudoState` to `unknown` (each game's client feed interprets it) |
| `gameActionSchema` (server) | Becomes a union that also accepts the Housie intent objects listed in [housie-protocol.md](housie-protocol.md); every member is a strict object, so unknown fields are rejected |

## Server: `GameEngine` and `GameContext`

```text
GameEngine {                                          // existing members unchanged
  createLobby?(): lobby                                           // NEW, optional
  lobbyView?(lobby): unknown                                      // NEW: public data for RoomState.gameLobby
  onLobbyAction?(lobby, who: { playerId, isHost }, action): ActionResult   // NEW
  onLobbyLeave?(lobby, playerId): void                            // NEW
  validateStart?(lobby, seated: MatchSeat[]): string | null       // NEW: a message blocks Start
  createMatch(seats, ctx, lobby?): match                          // lobby is NEW and optional
}

GameContext {                                          // existing members unchanged
  emitTo(playerId, event): void              // NEW: one game:event to that person's current socket (no-op when offline)
  hostId(): string                           // NEW: the current host's playerId (changes on host handover)
  notice(text): void                         // NEW: one system chat line (code game_notice), sanitised, at most 5 per second per room
}
```

Rules:

- `createLobby` runs when the room is created and again on `room:reset`; `lobbyView` runs on every `changed()` of a lobby room and its
  result is attached to `RoomState.gameLobby`. It must be plain JSON and contain nothing private.
- `onLobbyAction` is called from `game:action` while the room is in the lobby; if the engine has no lobby hooks the platform keeps its
  current behaviour (`INVALID_STATE`, "The match has not started."). A non-ok result becomes an `INVALID_STATE` ack with its message.
- `onLobbyLeave` is called whenever a person is removed or leaves in the lobby (so choices can be dropped).
- `validateStart` runs inside `Room.start` after the platform's own minimum-player check; a non-null string becomes
  `INVALID_STATE` with that message.
- `emitTo` is live during `createMatch`, so an engine can send each person a private snapshot at the moment the match is built.
- `notice` is the only way a game writes a system line; with `quietChat` the platform's own join/leave/etc. announcements are skipped while the match is in progress.
- `hostId()` is evaluated at action time, so caller permissions follow host handover without any engine hook.

## Server: `Room` changes

| Change | Detail |
|--------|--------|
| Constructor | For `roster` games, creates no seats up front; `capacity` is a limit. For other games nothing changes |
| `addParticipant` | Roster: creates a seat on demand while `seats.length < capacity`; colour from `ROSTER_COLORS` by `joinSeq`. Fixed games: unchanged |
| `releaseSeat` | Roster: removes the seat entirely instead of leaving it empty |
| `setCapacity` | Upper bound is the room's effective `maxPlayers` (see below); roster rooms only change the number |
| `projection()` | Roster: lists only occupied seats; adds `gameLobby` |
| Effective `maxPlayers` | `min(game.maxPlayers, env override)`; for Housie `HOUSIE_MAX_PLAYERS` (default 200). Sent in `RoomState.maxPlayers` so the client follows it |
| `announce` | Skips the chat line when the game is `quietChat` and the room is `in_progress`; `rev` and state broadcasts still happen |
| `changed()` | For rooms with `capacity > COALESCE_ABOVE`, emits `room:state` at most every `STATE_COALESCE_MS` (trailing edge); small rooms emit immediately as before |
| `start()` | Calls `validateStart`, then `createMatch(seats, ctx, lobby)`; roster rooms list *every* seated person as a seat, in slot order host first |
| `action()` | Routes to `onLobbyAction` in the lobby and `onAction` in a match |
| `resetToLobby(socketId)` | Host only, only when `in_progress`: disposes the match, clears match timers, state `lobby`, calls `createLobby` again (a fresh lobby with the game's defaults; the room's capacity is kept), `changed()` |
| `buildContext` | Adds `emitTo` (through a new `RoomEvents.gameEventTo(room, socketId, event)`), `hostId`, `notice` |

Large-room guard: `room:create` and a join for a *new* seat answer `SERVER_BUSY` when the process holds more than `MAX_SOCKETS` connected
sockets (default 1500; optional env var). A join by a guest who already holds a seat (a reconnect within the window) is never refused by this
guard, so returning players always get their snapshot. The check is made in the socket handler using a read-only `Room.hasGuest(guestId)`. Existing `MAX_ROOMS` is unchanged.

## Client

| Change | Detail |
|--------|--------|
| `games/registry.ts` | Adds `getLobbyScreen(gameId)` (a game may take over the lobby screen while the room is in the lobby) and `getGameFeed(gameId)` (`{ reset, onSnapshot(view), onEvent(event) }`) next to `getMatchScreen` |
| `RoomShell` | Renders the game's lobby screen when one exists and `room.state === 'lobby'`; otherwise unchanged. The lobby screen still uses the platform's `InviteBar`, `PlayerList` and `ChatPanel` |
| Room store | `createRoom` takes a `gameId` (it was hard-coded to Ludo); `applyJoined` and the `game:event` handler forward `game` snapshots and events to the registered feed for the room's game (Ludo keeps its current slice); adds `resetRoom()` for `room:reset`; `sendGameAction` accepts any intent object |
| `HostControls` | For `roster` games the capacity stepper becomes a number field with presets (10, 25, 50, 100, 200); Start stays |
| `LaunchModal` | Reads the game's `supportsAi`; Housie shows only Play Online |
| Home / game cards | Housie becomes `active` and launches like Ludo |

## Compatibility

- The placeholder engine and Ludo ignore every new hook; their behaviour, colours and chat lines are unchanged.
- `npm run smoke` (Platform Core regression script) must still pass; add no new assertions to it.
- New environment variables, both optional with defaults and no effect on existing games: `HOUSIE_MAX_PLAYERS` (default 200),
  `MAX_SOCKETS` (default 1500). Development-only Housie variables (research R15) are read only outside production.

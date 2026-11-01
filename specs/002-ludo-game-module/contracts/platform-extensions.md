# Contract: Platform Core Extensions for Game Modules

Updates [../001-platform-hub-rooms/contracts/game-module.md](../../001-platform-hub-rooms/contracts/game-module.md). The changes are
game-agnostic so any later game can use them; none of them mention Ludo. Rationale: [research.md](../research.md) R6.

## Server: `GameEngine` and `GameContext`

```text
GameEngine {
  id
  assignColors(seated: { playerId, seatIndex, kind }[]): Record<playerId, color>   // NEW, optional
  createMatch(seats: MatchSeat[], ctx: GameContext): match                         // ctx is NEW
  getView(match, playerId): unknown                                                // snapshot for join/resume
  onAction(match, playerId, action): ActionResult
  onSeatReleased(match, playerId): void
  onBotTurn(match, botPlayerId): void                                              // may be unused by self-timed engines
  dispose(match): void                                                             // clear everything
}

GameContext {                                                                      // NEW
  schedule(ms, fn): cancel                  // timers owned by the match; cleared by dispose and when the room closes
  emit(event): void                         // broadcasts a game:event to the room
  say(playerId, text): void                 // posts a chat message as that player (bots); length/charset sanitised
  releaseSeat(playerId, reason): void       // server-initiated release of a still-connected or bot player
  now(): number                             // monotonic milliseconds (so tests and logs are consistent)
  log(level, fields, message): void         // structured logging without personal data
}
```

Rules:

- `assignColors` runs once at start, before `createMatch`; the room applies the result to participants and seats, so `room:state`,
  the lobby, and chat tags show the match colours from then on. Earlier chat messages keep the colour they were sent with.
- `ctx.schedule` callbacks are wrapped so an exception never crashes the process (logged, match continues or ends cleanly).
- `ctx.say` is rate limited per bot (at most 1 message per second) and uses the platform's chat sanitising; the sender is the bot's own
  participant, so history, colour tags, and unread counts work unchanged.
- `ctx.releaseSeat(playerId, 'inactive')` removes the participant exactly like a leave (announcement, host handover, room closure when no
  humans remain) and, for a connected human, sends `player:removed { reason: 'inactive' }` and detaches their socket from the room.
- Action routing: the platform handler for `game:action` validates the schema, applies the rate limit, finds the sender's `playerId` from
  the socket's room membership, and calls `engine.onAction`; a non-ok `ActionResult` becomes an `INVALID_STATE` acknowledgement with the
  engine's reason as the message.
- The join/resume acknowledgement includes `game: engine.getView(match, playerId)` whenever a match is in progress.

## Server: `Room` changes

| Change | Detail |
|--------|--------|
| `start()` | Calls `engine.assignColors` (if defined) and recolours seats, then `engine.createMatch(seats, ctx)` |
| `ctx` implementation | Backed by the room's existing events and chat buffer; its timers are tracked and cleared in `close()` |
| `projection()` | A seat's colour is its occupant's current colour when occupied, otherwise the seat's colour |
| `releaseSeat` reasons | Adds `inactive` (announced as "X was removed for inactivity") next to `left`, `timeout`, `removed` |

## Shared and client

| Change | Detail |
|--------|--------|
| `shared/src/games.ts` | Ludo `seatColors` become `yellow, green, blue, red`; `COLOR_HEX` gains good yellow/blue/red/green values (already present) |
| `shared/src/protocol.ts` | `GAME_EVENT: 'game:event'`; `JoinedData.game?`; `RemovedData.reason?` |
| Client registry | `games/registry.ts` adds `getMatchScreen(gameId)`; when a game provides one and `room.state === 'in_progress'`, `RoomShell` renders it instead of the generic stage/panel layout. The platform keeps the leave, lobby, invite, chat, connection banner, and status screens |
| Room store | Holds a `game` slice: the latest `LudoState`, an event queue, and `applyEvent`; clears on leave or room end |
| `player:removed` handling | `inactive` shows "You were removed for inactivity" with a Back to Hub button and no rejoin cooldown message |

## Compatibility

- The placeholder engine keeps working: it ignores `ctx` and `assignColors`, so other games and the pre-start lobby are unchanged.
- `npm run smoke` (the Platform Core regression script) must still pass after these changes; Ludo's lobby colours change to the new seat
  colour order, which the script does not depend on.
- No new environment variables in production. `LUDO_DEV_DICE` is read only outside production.

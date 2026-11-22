# Contract: Host Entry and Room-Code Joining

This contract extends the platform real-time protocol documented in `specs/001-platform-hub-rooms/contracts/realtime-events.md`. Existing room membership, chat, game action, and snapshot guarantees remain in force.

## HTTP host entry route

### `GET /host`

- Is handled by Express before the SPA fallback and serves the existing application.
- Issues a server-signed host-entry capability cookie on the route response.
- Cookie is HttpOnly, same-site, path-scoped to `/`, secure in production, and valid for at most 12 hours or until process restart.
- The capability is not exposed in HTML, JavaScript state, or room payloads.
- During development, Vite proxies the exact `/host` request to Express; Express sets the cookie and relays Vite's own transformed root HTML, not Express `client/dist` HTML or assets. Production serves the route and built client from one origin.
- No separate public capability endpoint exists, and no client sends a host-role token in a payload.

### Page routes

- `GET /host` renders the host-facing application and issues the capability on the server response.
- `GET /` and direct invite pages render the player-facing application and do not issue a host capability.
- A direct invite path never grants room host status.

## Socket authorization

Socket.IO continues to use the same-origin default namespace. Cookies are transported by the browser on WebSocket/Polling handshakes.

Server socket data derives:

```text
entryCapability: "host" | null
```

The UI must not submit an `isHost` or `entryRole` field. The server derives it from the signed cookie.

## `room:create`

**Direction**: client to server  
**Payload**: unchanged `{ gameId, mode, botCount?, capacity?, guest }`  
**Who may call**: a socket with a valid `/host` entry capability  
**Ack**: existing `JoinedData`

Additional rules:

1. Missing, expired, invalid, or replayed-from-an-old-process capability returns:
   - code `HOST_ENTRY_REQUIRED`
   - message `Open the host page to create a room.`
2. The creator receives `hostPlayerId === you.playerId`.
3. The creator's internal participant record is `hostEligible = true`.
4. The room code is exactly six uppercase alphanumeric characters.

## `room:join`

**Direction**: client to server  
**Payload**:

```text
{
  gameId?: string,
  roomId: string,
  guest: Guest
}
```

`gameId` is omitted only by the player Hub. Direct `/room/{gameId}/{roomId}` joins continue to provide it.

**Ack**: existing `JoinedData`

Resolution:

1. Normalize spaces, dashes, and letter case.
2. Require exactly six characters from the room-code alphabet.
3. If `gameId` is absent, find the unique live room by `roomId`.
4. If `gameId` is present, require a match with that game.
5. Apply existing room eligibility, capacity, removed-cooldown, and match-state checks.
6. A fresh participant always has `hostEligible = false`, even if the browser carries a valid creation capability.
7. Resuming a known guest preserves the participant's prior host status and eligibility; it does not derive eligibility from the current cookie.

Typical errors remain `ROOM_NOT_FOUND`, `ROOM_FULL`, `MATCH_IN_PROGRESS`, `REMOVED_COOLDOWN`, `GAME_UNAVAILABLE`, `RATE_LIMITED`, and `INVALID_PAYLOAD`.

## Host-only room events

`room:setCapacity`, `room:kick`, `room:start`, `room:fillAi`, `room:reset`, and game actions with host semantics keep the existing `requireHost` check:

```text
socket participant.playerId === room.hostPlayerId
```

The capability cookie is not a replacement for this check. It only allows an authorized `room:create`; that successful creation sets host eligibility on the creator's participant record.

## Host departure

When the current host is released:

1. Permit the existing host participant to resume before its seat-release deadline and preserve `hostPlayerId`.
2. After the existing host is released, close the room with `host_left`.
3. Never select an ordinary code/link joiner as host.

Add `host_left` to `ClosedReason`; the player status screen says the host ended the room and offers a return to the player Hub.

## Invite representation

`invitePathFor(gameId, roomId)` remains `/room/{gameId}/{roomId}`. For one room:

```text
room code  = room.roomId
invite path = /room/room.gameId/room.roomId
```

The host sees and may copy each independently. Join through either form produces the same authoritative snapshot and never changes host authority.

Custom game match screens that bypass `RoomShell`, including Ludo and UNO, must render the same shared code-and-link invite component directly.

## Rate limits

- `room:create` keeps the existing per-IP limit.
- Code-only and game-qualified `room:join` share the existing per-IP and per-socket join limits.
- No standalone room lookup event is exposed.

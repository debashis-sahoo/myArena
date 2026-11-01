# Contract: Real-Time Events

Transport: Socket.IO 4 on the same origin as the page (clients connect relative to the page URL, so `wss` in production).
There is a single default namespace. All client-to-server events use **acknowledgements**.

## Conventions

- **Ack shape**: `{ ok: true, data: ... }` or `{ ok: false, error: { code, message, retryAfterMs? } }`. The `message` is
  user-friendly text the UI can show directly.
- **Validation**: every payload is schema-validated on the server; unknown fields are rejected with `INVALID_PAYLOAD`.
- **Authorization**: the server derives the caller's identity from the socket's current room membership. Clients never send
  their own `playerId`; `playerId` fields in requests identify *targets* only.
- **State sync**: after any change the server emits `room:state` (the full projected room, including `rev`) to everyone in the
  room. Clients ignore any `room:state` whose `rev` is not greater than the one they hold.
- **Privacy**: no event ever includes `guestId`, socket IDs, or timers.
- **Heartbeat**: Socket.IO ping interval 4 s, ping timeout 4 s (research R3). Clients reconnect automatically with exponential
  backoff (1 s up to 10 s, jitter) and then re-send `room:join` with the same `guestId`.

## Shared types (conceptual)

```text
Guest        { guestId: uuid, displayName: string(1..20), avatar: string }
Participant  { playerId, kind: "human"|"bot", displayName, avatar, color, isHost: bool,
               connection: "connected"|"disconnected", joinSeq: int }
Seat         { index: int, color: string, occupant: Participant | null }
RoomState    { roomId, gameId, mode: "online"|"ai", state: "lobby"|"in_progress",
               capacity: int, minPlayers: int, maxPlayers: int, hostPlayerId,
               seats: Seat[], rev: int, inviteEnabled: bool }
ChatMessage  { id: int, kind: "player"|"system", playerId?, name, color, text,
               systemCode?, ts: epochMillis }
```

## Client to server

| Event | Payload | Ack `data` | Who may call | Spec |
|-------|---------|------------|--------------|------|
| `room:create` | `{ gameId, mode: "online"\|"ai", botCount?: 1..3, guest: Guest }` | `{ room: RoomState, you: { playerId }, chat: ChatMessage[], invitePath: string\|null }` | any guest (not already in a room) | FR-011, FR-012, FR-013 |
| `room:join` | `{ gameId, roomId, guest: Guest }` | `{ room: RoomState, you: { playerId }, chat: ChatMessage[], resumed: bool }` | any guest | FR-015, FR-017, FR-018, FR-031 |
| `room:leave` | `{}` | `{}` | participant | FR-024 |
| `room:setCapacity` | `{ capacity: int }` | `{ room: RoomState }` | host, lobby only, online rooms | FR-016, FR-019, FR-020 |
| `room:kick` | `{ playerId }` | `{}` | host, lobby only, not self | FR-019 |
| `room:start` | `{}` | `{ room: RoomState }` | host, lobby only | FR-019, FR-020, FR-022 |
| `chat:send` | `{ text: string(1..500) }` | `{ message: ChatMessage }` | participant (connected) | FR-025, FR-029, FR-030 |

Notes:

- `room:create` with `mode: "ai"` requires `botCount` (1 to `maxPlayers - 1`, default 3 from the UI); `invitePath` is `null`
  and `inviteEnabled` is `false`. `mode: "online"` ignores `botCount`.
- `room:join` is also the resume call. If the `guestId` already holds a seat (connected in another tab, or disconnected
  within 60 s), the call re-attaches to that seat (`resumed: true`) and the older socket, if any, is dropped.
- Joining an `ai` room as anyone other than its creator answers `ROOM_NOT_FOUND`.

## Server to client

| Event | Payload | Sent to | When |
|-------|---------|---------|------|
| `room:state` | `RoomState` | all in room | Any change to seats, host, capacity, connection state, or room state |
| `chat:message` | `ChatMessage` | all in room | New player message or system announcement |
| `player:removed` | `{ cooldownMs }` | the removed player | After the host removes them; their socket is detached from the room |
| `room:closed` | `{ reason: "all_left"\|"all_disconnected"\|"ai_owner_left"\|"server_restart" }` | all remaining | Room closes |
| `server:restarting` | `{}` | all connected sockets | Server received `SIGTERM`; clients show "reconnecting" |

System announcements (`chat:message` with `kind: "system"`) are emitted for: joined, left, disconnected, reconnected,
removed, host changed, capacity changed, match started, seat released (FR-027).

## Error codes

| Code | Meaning | UI behaviour |
|------|---------|--------------|
| `ROOM_NOT_FOUND` | Unknown, closed, or non-joinable (AI) room | "Room not found" page with a Hub button |
| `ROOM_FULL` | No open seat | "Room is full" page |
| `MATCH_IN_PROGRESS` | Room already started | "Match in progress" page |
| `REMOVED_COOLDOWN` | Recently removed; includes `retryAfterMs` | "You were removed" message with remaining wait |
| `GAME_UNAVAILABLE` | Game missing or `coming_soon` | Hub toast |
| `NOT_HOST` | Host-only action by someone else | Toast; controls are hidden anyway |
| `NOT_IN_ROOM` | Action requires membership | Redirect to Hub |
| `INVALID_STATE` | Action not allowed in the current state | Toast |
| `CAPACITY_OUT_OF_RANGE` | Outside the game's limits | Inline message |
| `CAPACITY_BELOW_PLAYERS` | Would drop below occupied seats | Inline message explaining to remove players first |
| `NOT_ENOUGH_PLAYERS` | Start below the minimum | Inline message on the disabled Start button |
| `INVALID_PAYLOAD` | Failed validation | Generic error toast |
| `RATE_LIMITED` | Too many actions; includes `retryAfterMs` | Chat input shows a short cooldown |
| `SERVER_BUSY` | Room cap reached | "Arena is busy, try again soon" |

## Behavioural guarantees (what the quickstart verifies)

1. **Exactly one host**: every `room:state` has exactly one participant with `isHost = true` and `hostPlayerId` matches it
   (SC-012).
2. **Presence latency**: join and explicit leave appear in `room:state` within 2 s; abrupt disconnects within 10 s (SC-003).
3. **Ordering**: events for one room are emitted in the order state changed; `rev` strictly increases.
4. **Replay on resume**: the `room:join` ack contains the current `RoomState` and the last 50 chat messages (FR-031).
5. **Removal**: the removed player receives `player:removed` and is rejected with `REMOVED_COOLDOWN` for 60 s (FR-019).

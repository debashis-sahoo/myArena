# Real-Time Protocol: Base Platform and Experience

Transport: WebSocket at `/ws?room=<roomId>` on the same origin as the app. Messages are JSON
text frames validated by the shared schemas in `packages/protocol`. Client-to-server frames
are at most 4 KB; server-to-client frames are not capped at 4 KB because a full snapshot of a
100-member room is about 13 KB. Anything that fails validation is rejected without changing state.

## Authentication

- The browser sends the room's member cookie on the upgrade request (see
  [rest-api.openapi.yaml](rest-api.openapi.yaml)). The server also checks `Origin` against its
  allow-list.
- The participant and role come only from that session. Message bodies never carry a user,
  host, or role identifier for authorization, and any such field is rejected as unknown.
- Failed upgrades return HTTP 401 (no valid session) or 410 (`RECOVERY_EXPIRED` or room
  closed) with a problem body, so the client can tell the user what happened.

## Envelope

```json
{ "v": 1, "type": "<message type>", "...": "type-specific fields" }
```

## Client to server (intents)

Every intent below includes `clientActionId` (UUID). The server returns the original `ack`
for a repeated `clientActionId` and does not apply the change again.

| `type` | Role | Fields | Notes |
|--------|------|--------|-------|
| `ready.set` | HOST, PLAYER | `ready: boolean` | Own readiness only |
| `chat.send` | HOST, PLAYER | `text` (1 to 500) | Sender taken from session |
| `game.select` | HOST | `gameId` | Must be in the registry |
| `settings.update` | HOST | `changes: object` | Validated by platform and game schema |
| `match.start` | HOST | none | Requires start eligibility |
| `match.rematch` | HOST | none | Requires `matchStatus` ENDED |
| `match.returnToLobby` | HOST | none | Requires `matchStatus` ENDED |
| `invite.regenerate` | HOST | none | Revokes the previous code |
| `host.transfer` | HOST | `targetParticipantId` | Target must hold a seat |
| `member.remove` | HOST | `targetParticipantId` | Not self; releases the seat and recovery data; not a ban |
| `room.close` | HOST | none | Deletes room data |
| `resync` | HOST, PLAYER | `lastVersion?: integer` | Requests a fresh snapshot |
| `ping` | HOST, PLAYER | none | Optional client keepalive |

Leaving uses `POST /api/rooms/{roomId}/leave` so success can be determined after a network
failure.

## Server to client

| `type` | Fields | Notes |
|--------|--------|-------|
| `snapshot` | `version`, `lobby`, `self` | Sent on connect and on `resync`; `lobby` is the authorized projection from [data-model.md](../data-model.md) |
| `event` | `version`, `kind`, `data` | One per accepted change, in version order |
| `ack` | `clientActionId`, `status`, `version`, `code?`, `detail?`, `nextStep?` | `status` is `ACCEPTED` or `REJECTED` |
| `pong` | none | Reply to `ping`; the server also sends protocol-level pings every 20 seconds |
| `closing` | `reason` | Sent before the server closes the socket |

Event `kind` values: `participant.joined`, `participant.left`, `participant.connection`,
`participant.ready`, `participant.removed`, `chat.message`, `game.selected`, `settings.updated`, `match.started`,
`match.ended`, `match.rematch`, `match.returnedToLobby`, `invite.regenerated` (HOST only),
`host.changed`, `room.closed`. Event payloads contain only data the receiving role may see.
The `invite.regenerated` event reaches players with an empty `data` object so every member
sees contiguous versions; only the HOST receives the new invitation.

## Ordering, loss, and recovery

1. `version` is strictly increasing by 1 per accepted change. If a client receives a version
   that is not `last + 1`, it sends `resync`.
2. On every (re)connect the server sends a `snapshot` first. The client then resends any
   intent it did not receive an `ack` for. The server returns the stored result for intents it
   already handled and applies new ones once.
3. A reconnect within 10 minutes of disconnection restores the same participant. Later,
   the upgrade is refused with HTTP 410 `RECOVERY_EXPIRED` and nothing is restored. A
   client must not call Leave to clear its credential after this result.
4. A newer connection for the same participant supersedes the older one.

## Rejection codes (`ack.code`)

| Code | Meaning | Typical next step |
|------|---------|-------------------|
| `NOT_HOST` | Host-only action by a non-host, or a stale host | Ask the current host |
| `FORBIDDEN_TARGET` | Attempt to change another member's state | None; action not permitted |
| `VALIDATION_FAILED` | Malformed or out-of-range input | Correct the input |
| `GAME_UNAVAILABLE` | Unknown or unavailable game | Pick another game |
| `START_BLOCKED_NOT_READY` | A PLAYER is not ready | Wait for players to be ready |
| `START_BLOCKED_DISCONNECTED` | A seat holder is disconnected | Wait up to 10 minutes or ask them to rejoin |
| `START_BLOCKED_PARTICIPANT_COUNT` | Count outside the game's range | Adjust participants or game |
| `NO_GAME_SELECTED` | Start without a game | Select a game |
| `MATCH_NOT_ENDED` | Rematch or return before the match ended | Wait for the match to end |
| `TARGET_NOT_ELIGIBLE` | Handoff target has no seat | Pick another member |
| `TARGET_NOT_FOUND` | Remove target holds no seat | Refresh the member list |
| `CANNOT_REMOVE_SELF` | Host tried to remove themselves | Leave or hand off instead |
| `RATE_LIMITED` | Too many intents or messages | Wait and retry |
| `ROOM_CLOSED` | Room no longer exists | Create or join another room |

Rejected intents never partially change shared state. Rejection details never include tokens,
invitation codes, or other members' private data.

## Close codes

| Code | Meaning | Client behavior |
|------|---------|-----------------|
| 1001 | Server restarting | Reconnect with backoff; if the room is gone, show "room unavailable" |
| 4001 | Unauthenticated | Return to entry with an explanation |
| 4009 | Superseded by a newer connection | Show a notice; do not auto-reconnect |
| 4010 | Room closed | Show closure message and return to entry |
| 4011 | Left the room | Return to entry |
| 4012 | Removed by the host | Show a notice, call Leave to clear the credential, and return to entry |
| 4029 | Rate limited | Back off before reconnecting |

## Heartbeat and reconnect

- Server pings every 20 seconds. Two missed intervals mark the participant `DISCONNECTED`
  and start the 10-minute window.
- The client reconnects on `visibilitychange` (visible), `pageshow`, and `online`, and on close
  with exponential backoff and jitter (cap 15 seconds). It shows "Reconnecting" using a
  live region and does not report a departure.

## Limits

4 KB frames; chat 500 characters; 5 chat messages per 10 seconds and 20 intents per 10
seconds per participant; one active socket per participant.

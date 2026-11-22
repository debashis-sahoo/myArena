# Phase 1 Data Model: Secure Host Access and Room Entry

Room state remains in server memory. The design adds an entry capability and an internal host-eligibility flag, but does not add a database or a verified user account.

## 1. Host entry capability

| Field | Visibility | Rule |
|-------|------------|------|
| `version` | signed cookie only | Current capability format, initially `1` |
| `role` | server-only value | Always `host` for this feature |
| `issuedAt` | server-only value | Millisecond timestamp when `/host` was served |
| `expiresAt` | server-only value | At most 12 hours after issue |
| `signature` | signed cookie only | Verifies the value with the current process-local secret |

Delivery:

- The server handles `GET /host`, serves the SPA, and returns a new capability cookie on the same response.
- Vite proxies `/host` to the server in local development; production serves the client and host route from the same origin.
- The cookie is HttpOnly, `Path=/`, `SameSite=Lax`, and `Secure` in production.
- JavaScript does not read it.
- Server restarts invalidate outstanding capabilities because the signing secret changes.
- The normal player UI contains no route or button that requests this capability.

## 2. Arena entry mode (client presentation)

```text
entryMode = "host" | "player"
```

| Route | Entry mode | Primary action |
|-------|------------|----------------|
| `/host` | host | Choose a game and create an online or AI room |
| `/` | player | Enter a room code |
| `/room/{gameId}/{roomCode}` | player-facing shell unless this visitor already owns the room's host seat | Join as player or use controls only when `room.hostPlayerId === youId` |
| Any unknown route | player | Return to the player Hub experience |

The presentation mode is not an authorization claim. Only the valid server-side entry capability can authorize creation, and only current room state can authorize in-room host actions.

## 3. Room code

| Property | Rule |
|----------|------|
| Stored value | Exactly six uppercase characters |
| Alphabet | `23456789ABCDEFGHJKMNPQRSTUVWXYZ` |
| Display | Contiguous uppercase value, for example `K7M2Q9` |
| Input normalization | Remove spaces and dashes, convert lowercase to uppercase |
| Uniqueness | Unique among live in-memory rooms |
| Collision handling | Retry generation; return a busy error if the allocation loop is exhausted |
| Lifetime | Same as the room; a closed room's code immediately becomes unavailable and must not resolve to another room until normal generation selects it again |

`formatRoomCode` returns the six-character canonical value. `normalizeRoomCode` returns the canonical lookup value. A malformed code is anything other than six characters after normalization, contains characters outside the room alphabet, or is empty.

## 4. Participant host eligibility

Extend the private server participant with:

```text
hostEligible: boolean
```

| Participant path | `hostEligible` |
|------------------|----------------|
| Bot | `false` |
| Player joining by code or invite without a valid `/host` capability | `false` |
| Host creating a room with a valid capability | `true` |
| Host-capable visitor joining an existing room for the first time | `false`; the `/host` cookie does not transfer room authority through join |
| Resumed participant | Existing value is preserved across socket replacement |

`hostEligible` is not included in `RoomState` sent to clients. Public `isHost` remains derived from `hostPlayerId`. A capability authorizes creation only; joining a room never consults it except to preserve an already-existing participant during resume.

## 5. Room host lifecycle

### Creation

```text
valid /host capability
    -> room:create accepted
    -> creator seated with hostEligible = true
    -> hostPlayerId = creator.playerId
    -> six-character code allocated
```

An invalid or absent capability returns `HOST_ENTRY_REQUIRED`.

### Normal player join

```text
code or invite
    -> normalize code
    -> resolve one live online room
    -> validate availability
    -> seat guest with hostEligible = false
    -> current hostPlayerId unchanged
```

### Host release

```text
host leaves / is removed / reconnect expires
    -> if the host participant resumes before release, preserve hostPlayerId
    -> otherwise close room with host_left and detach remaining sockets
```

Ordinary player joins, invitation opens, and reconnects never set `hostPlayerId`.

## 6. Code-only join contract

`JoinRoomPayload`:

| Field | Rule |
|-------|------|
| `roomId` | Raw six-character code or an accepted normalized form |
| `gameId` | Optional; required by legacy/direct game links, absent for Hub code entry |
| `guest` | Existing validated guest identity |

Resolution:

1. Normalize `roomId`.
2. If `gameId` exists, resolve that room within the requested game.
3. Otherwise resolve a live room by code alone.
4. Reject AI, missing, closed, expired, suspended, full, match-in-progress, or removal-cooldown states through existing error codes; expired and suspended references use the same safe unavailable behavior as missing rooms.
5. Return standard `JoinedData`, including authoritative `room.gameId`.

## 7. Invite and room reference

`InviteBar` derives:

- `code`: `room.roomId`
- `path`: `/room/{room.gameId}/{room.roomId}`
- `url`: `${window.location.origin}${path}`

The room code and URL are views of the same room. Copying or opening either never changes the participant's host eligibility.

## 8. High-energy view model

No gameplay state is added for atmosphere. `ArenaAtmosphere` derives a presentation record:

```text
variant: "host" | "player" | "room"
gameId: current room game or null
accent: game accent or role accent
reducedMotion: browser preference
```

The component renders only decorative gradients, particles, and labels. Room turns, dice, token movement, winners, countdowns, and action availability continue to come from authoritative room and game state.

## 9. Validation and invariants

| Invariant | Enforcement |
|-----------|-------------|
| `room:create` requires a valid `/host` capability | Socket handler before `RoomStore.create` |
| Player Hub has no create action | Route mode and component contract |
| Shared invite never creates host authority | New participants start with `hostEligible = false`; `hostPlayerId` is unchanged |
| Exactly one public host while a room is open | `hostPlayerId` points to one participant, or the room closes |
| Only a six-character live code resolves | Shared constants, normalization, schema, and store lookup |
| Host-only room actions remain server-checked | Existing `requireHost` remains authoritative |
| UI state cannot determine dice, moves, winners, or room capacity | Existing room/game contracts are unchanged |
| Decorative effects do not block keyboard, pointer, or touch input | Atmosphere is `pointer-events: none`, `aria-hidden`, and motion-free when requested |

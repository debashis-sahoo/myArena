# Data Model: Base Platform and Experience

All entities are held in server memory (see [research.md](research.md) R2) and exist only
while their room is active. Nothing here is persisted beyond room closure. Wire shapes are
defined in [contracts/](contracts/).

## Room

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Server-generated; appears in URLs and WebSocket connect |
| `status` | `LOBBY` \| `IN_MATCH` \| `CLOSED` | See state transitions |
| `version` | integer | Increments once per accepted change; used for sync |
| `selectedGameId` | string \| null | Must exist in the game registry |
| `settings` | object | `maxParticipants` (1 to 100, default 100) plus game settings validated by the game's settings schema |
| `matchStatus` | `NONE` \| `IN_PROGRESS` \| `ENDED` | Match lifecycle only; game rules are not modeled |
| `createdAt` | timestamp | |
| `invitation` | Invitation | One active invitation at a time |
| `participants` | Participant[] | Seat holders, at most `maxParticipants` |
| `chat` | ChatMessage[] | Last 200 messages |

**Rules**: at most 100 participants (FR-019); exactly one HOST while the room is open;
`maxParticipants` cannot be set below the current seat count.

## Invitation

| Field | Type | Notes |
|-------|------|-------|
| `code` | string | 10 characters from the 32-character alphabet `A-HJ-NP-Z2-9` (no I, O, 0, 1); CSPRNG |
| `status` | `ACTIVE` \| `REVOKED` | `REVOKED` after regeneration or closure |
| `createdAt` | timestamp | |

**Rules**: the invite link is `/join/<code>`. Regeneration revokes the previous code. Invalid,
revoked, and closed-room codes are indistinguishable to callers (`INVITATION_UNAVAILABLE`).

## Participant

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Public, server-generated; not a credential |
| `displayName` | string | 1 to 24 characters, see validation |
| `displayLabel` | string | Name, disambiguated (for example `Sam (2)`) when duplicated |
| `role` | `HOST` \| `PLAYER` | See Room Role |
| `ready` | boolean | Set only by the participant; the HOST counts as ready |
| `connection` | `CONNECTED` \| `DISCONNECTED` | Departure is not a connection state; the seat is removed |
| `joinedAt` | timestamp | Used for handoff ordering |
| `disconnectedAt` | timestamp \| null | Set when `DISCONNECTED`; recovery expires at +10 minutes |
| `actionLog` | map `clientActionId` to result | Last 100 or 10 minutes, whichever is smaller; survives reconnect so resent intents are not applied twice; never serialized |
| `tokenHash` | bytes | Server-only; never serialized |

**Validation (display name)**: trim; NFC normalize; 1 to 24 characters; letters, numbers,
spaces, and `' - _ .`; no control, zero-width, or bidirectional override characters; no
leading or trailing space. Duplicates are allowed and disambiguated for display only. A name
is never used to identify or authenticate.

## Room Role

`HOST` or `PLAYER` only. There is no global or platform role.

| Action | HOST | PLAYER |
|--------|------|--------|
| Set own readiness, send chat, leave | Yes | Yes |
| Select game, update settings | Yes | No |
| Start match, request rematch | Yes | No |
| Regenerate invitation | Yes | No |
| Hand off host role, close room | Yes | No |
| Remove another member (not self) | Yes | No |
| Change another member's state | No | No |
| Game actions | Per game rules, same as PLAYER | Per game rules |

Authorization uses the authenticated session's participant and its current role. Any user or
host identifier in a message body is ignored for authorization.

## Recovery Record

| Field | Type | Notes |
|-------|------|-------|
| `participantId` | UUID | |
| `tokenHash` | bytes | Held in Participant; no separate copy |
| `expiresAt` | timestamp | `disconnectedAt` + 10 minutes |

**Rules**: created on disconnect, cleared on reconnect. Deleted at the earliest of expiry,
explicit leave, removal by the host, or room closure (FR-024). It is never included in any
view, error, or log. Expiry releases the seat; later use of that room's cookie returns
`RECOVERY_EXPIRED`.

## Chat Message

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `senderParticipantId` | UUID | Set by the server from the session |
| `senderLabel` | string | Label at send time |
| `text` | string | 1 to 500 characters; rendered as plain text |
| `sentAt` | timestamp | Server time |

**Rules**: visible only to current members; bounded to the last 200 messages; deleted at room
closure.

## Lobby State (projection)

The authorized view sent to a member: room `id`, `version`, `status`, `selectedGameId`,
`settings`, `matchStatus`, an invitation (code and link) for the HOST only, the participants
list (`id`, `displayLabel`, `role`, `ready`, `connection`), chat, and `self` (own participant
`id` and `role`). It excludes token hashes, recovery records, other members' action
histories, and any other private data.

## Game Descriptor (from `game-sdk`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable identifier |
| `name` | string | Display name |
| `minParticipants`, `maxParticipants` | integer | Start eligibility |
| `settingsSchema` | schema | Validates `settings` changes |

The platform reads descriptors and calls `onMatchStart` and `onMatchEnd`. A game tells the
platform its match is over through the `MatchContext.endMatch()` callback it receives in
`onMatchStart`; the platform then sets `matchStatus` to `ENDED`. It contains no rules. The
test stub game ends after its `durationSeconds` setting (1 to 3600, default 30).

## Acceptance Record (not application data)

A markdown record under `specs/001-base-platform-experience/acceptance/` with: device,
operating system, browser and version, tester, date, role, scenario, and outcome (FR-022). It
is created during acceptance and nothing is claimed in advance.

## State Transitions

**Room**

```text
LOBBY --(host starts; start conditions met)--> IN_MATCH
IN_MATCH (IN_PROGRESS) --(game reports match end via the SDK)--> IN_MATCH (matchStatus ENDED)
IN_MATCH (ENDED) --(host requests rematch)--> IN_MATCH (matchStatus IN_PROGRESS)
IN_MATCH (ENDED) --(host returns to lobby)--> LOBBY
any --(host closes | no seat holders | no handoff possible)--> CLOSED
```

On `CLOSED`: delete chat, recovery records, participants, and the invitation, and close all
sockets (code 4010).

**Participant**

```text
(none) --join/create--> CONNECTED
CONNECTED --socket loss or missed heartbeats--> DISCONNECTED
DISCONNECTED --reconnect within 10 minutes--> CONNECTED (same seat, role, readiness)
DISCONNECTED --10 minutes elapse--> (seat released; RECOVERY_EXPIRED on return)
CONNECTED or DISCONNECTED --explicit leave--> (seat released immediately)
CONNECTED or DISCONNECTED --host removes member--> (seat released immediately; close 4012)
```

**Host handoff**

```text
HOST --explicit transfer to a seat-holding PLAYER--> that PLAYER is HOST; former HOST is PLAYER
HOST leaves or recovery expires --> auto-handoff: eligible seat holders ordered by
    connected first, then earliest joinedAt; none eligible --> room CLOSED
```

Transfers are applied atomically with a version increment, so racing actions see exactly one
HOST. A stale host action is rejected with `NOT_HOST` and changes nothing.

**Start eligibility** (host only): a game is selected; participant count is within the game's
range; every PLAYER seat is connected and ready. Otherwise the intent is rejected with a
specific reason code and no state change.

## Capacity

Rooms hold at most 100 participants. Launch target: 20 concurrent rooms and 200 total
connected participants. A join beyond either limit is rejected with `ROOM_FULL` or
`SERVICE_AT_CAPACITY` respectively.

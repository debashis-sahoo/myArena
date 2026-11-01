# Contract: Ludo Real-Time Protocol

Builds on [../001-platform-hub-rooms/contracts/realtime-events.md](../../001-platform-hub-rooms/contracts/realtime-events.md). Same conventions:
acknowledgements `{ ok, data | error }`, schema validation with unknown fields rejected, identity derived from the socket (never from
the payload), no secrets in any event. This document adds the game channel that the platform reserved (`game:action`, `game:state`) and
one new event (`game:event`). Data shapes: [data-model.md](../data-model.md).

## Client to server

| Event | Payload | Ack `data` | Who may call | Spec |
|-------|---------|------------|--------------|------|
| `game:action` | `{ type: 'roll' }` or `{ type: 'move', pawn: 0..3 }` | `{}` on success | The seated player whose turn it is, in the matching phase | FR-014, FR-019, FR-025 |

Rules:

- `roll` is accepted only in `waiting_roll`; `move` only in `waiting_move` and only for a pawn in `eligible`.
- Repeated or late actions (for example a second `roll` while the die is tumbling, or a click after the countdown expired) are rejected
  with `INVALID_STATE` and change nothing.
- The server ignores any dice value a client might send; the schema has no such field (unknown fields are rejected).
- Per-connection rate limit: burst 10, 5 per second (`RATE_LIMITED`).

## Server to client

| Event | Payload | Sent to | When |
|-------|---------|---------|------|
| `game:event` | `LudoEvent` (see below) | All in the room | After every step of the match |
| `game:state` | `LudoState` | The requesting socket | Reserved for on-demand resync; the join/resume ack carries `game` directly |
| `player:removed` | `{ cooldownMs, reason?: 'host' \| 'inactive' }` | The removed player | A player removed by the host (`host`, default) or released after 3 missed turns (`inactive`) |

The platform's `room:state` and `chat:message` are unchanged. The join and create acknowledgements (`JoinedData`) gain an optional
`game: LudoState` field, present when a match is in progress.

## LudoEvent

Every event has `{ seq, type, state, entry? }`: `seq` increases by 1 for each event of a match, `state` is the full `LudoState` after the
event, and `entry` is the new activity log entry (already included at the end of `state.activity`).

| `type` | Extra fields | Meaning | Client animation |
|--------|--------------|---------|------------------|
| `match_started` | none | Colours assigned, pawns in bases, first turn begins | Fade in the board, turn highlight |
| `turn` | `reason: 'start' \| 'next' \| 'bonus'` | A turn (or bonus roll) begins; `state.remainingMs` is 15000 | Golden border and "Your Turn to Roll!" for the roller |
| `rolled` | `value`, `by`, `tumbleMs` | A die result is decided | Die tumble then settle on `value`; eligible pawns pulse after `tumbleMs` |
| `choose` | none | The tumble is over and a pawn choice is awaited; `state.remainingMs` is 15000 | Pawns pulse, countdown starts |
| `no_move` | `reason: 'blocked' \| 'three_sixes'` | No legal move (or the third 6) | "No move" message, then the turn passes |
| `moved` | `by`, `pawn`, `from`, `to`, `path`, `captured`, `reachedHome`, `bonus` | A pawn moved | One hop per `path` item, dust puffs, squash/stretch, capture bounce, home celebration |
| `timeout` | `by`, `action: 'roll' \| 'move'` | The countdown expired and the server played the action | "Auto-played" note |
| `warning` | `player` | A player has missed 2 turns in a row | Warning banner on that player's screen |
| `released` | `player`, `reason: 'left' \| 'timeout' \| 'inactive' \| 'removed'` | A seat was released; pawns cleared | Pawns fade out, panel shows "Left" |
| `finished` | `winner`, `standings` | The match is over | Results overlay, celebration |

Ordering and recovery:

- Clients animate events strictly in `seq` order; if they hold more than three unplayed events, or they just joined or reconnected, they
  discard the queue and render `state` of the newest event (or the ack's `game`) immediately.
- Duplicate or older `seq` values are ignored.
- `remainingMs` is a duration measured when the event was sent; clients run their own countdown from it.

## Error codes

Existing platform codes apply (`NOT_IN_ROOM`, `INVALID_PAYLOAD`, `RATE_LIMITED`, `INVALID_STATE`). Ludo adds the user-facing reasons
returned in `error.message` for `INVALID_STATE`: "It is not your turn", "Roll first", "That pawn cannot move", "The match is over".

## Behavioural guarantees (what verification checks)

1. **Authority**: every `rolled.value` comes from the server; a client cannot influence it (SC-009, SC-005).
2. **Order**: events for one match are emitted in order and each carries a full snapshot, so any client can resynchronise from any event.
3. **Pacing**: the server never emits the next phase before `tumbleMs` or `hops * HOP_MS + LAND_PAUSE_MS (+ CAPTURE_MS)` have passed (SC-006).
4. **Countdown**: auto-play happens within 1 s of the countdown reaching zero (SC-010).
5. **Hop count**: `path.length` equals the roll for ring and lane moves, so the client always shows N hops for a roll of N (SC-004).

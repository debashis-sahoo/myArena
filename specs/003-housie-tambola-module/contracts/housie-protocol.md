# Contract: Housie Real-Time Protocol

Builds on [../001-platform-hub-rooms/contracts/realtime-events.md](../../001-platform-hub-rooms/contracts/realtime-events.md) and the
Ludo conventions ([../002-ludo-game-module/contracts/ludo-protocol.md](../../002-ludo-game-module/contracts/ludo-protocol.md)):
acknowledgements `{ ok, data | error }`, schema validation with unknown fields rejected, identity derived from the socket (never from the
payload), and no event carries another player's private data. Platform additions that make this possible are in
[platform-extensions.md](platform-extensions.md). Data shapes: [../data-model.md](../data-model.md).

## Client to server

All intents use `game:action` (per-connection limit: burst 10, 5 per second, `RATE_LIMITED`). The schema is a strict union, so a client
cannot send a ball number, a ticket, or a result; there is no such field.

### In the lobby (state `lobby`)

| `type` | Fields | Who | Effect |
|--------|--------|-----|--------|
| `setCeiling` | `value: 1..4` | Host | Sets the ticket ceiling; clamps all choices to it |
| `setHostPlays` | `value: boolean` | Host | Host plays (gets a choice) or only calls |
| `setPatterns` | `ids: string[]` (0 to 40 catalogue ids, no duplicates; an empty list is allowed so the host can clear the choice, and Start is then refused) | Host | Replaces the chosen combinations |
| `setCaller` | `mode: 'manual' \| 'auto'`, `intervalMs?: 5000 \| 8000 \| 10000` | Host | Initial caller mode |
| `setTickets` | `count: 1..4` | Anyone seated (the host only when `hostPlays`) | Sets own ticket count; refused above the ceiling |

Player capacity uses the platform's existing `room:setCapacity`; Start uses `room:start`.

### During the match (state `in_progress`, phase `running`)

| `type` | Fields | Who | Effect |
|--------|--------|-----|--------|
| `draw` | none | Host | Draws the next ball now (manual, or an extra draw while auto restarts its timer) |
| `auto` | `intervalMs: 5000 \| 8000 \| 10000` | Host | Switches to auto at that interval (or changes it); starts or restarts the timer |
| `manual` | none | Host | Back to manual calling |
| `pause` / `resume` | none | Host | Pauses or resumes auto calling |
| `marks` | `changes: { t: 0..3, c: 0..26, on: boolean }[]` (1 to 30) | A playing player | Sets crosses on own tickets; ignored cells (empty, foreign ticket) are dropped |
| `claim` | `combo: string`, `ticket: 0..3` | A playing person (host included when `hostPlays`) | Server validates and decides (see below) |

Rejections use `INVALID_STATE` with a short message: "Only the host can do that", "Match is over", "All balls have been called", "Wait a
moment" (claim pace), "Claim the earlier Full House first". A claim that is evaluated and fails is *not* an error: the ack is `ok` and the
claimant receives the private `bogus` event, so the screen never reveals which patterns are close.

## Server to client

| Event | Payload | Sent to | When |
|-------|---------|---------|------|
| `room:state` | `RoomState` (+ `gameLobby` while in the lobby) | All | Existing; coalesced above 12 seats |
| `game:event` | `HousieEvent` | See below | After each step of the match |
| `chat:message` | `ChatMessage` | All | Typed messages and `game_notice` win lines only |
| `player:removed`, `room:closed` | Existing | As before | Existing behaviour |

`JoinedData.game` (create, join and resume acks) is the receiver's own `HousieView` while a match is running.

## HousieEvent

Public events carry `{ seq, type, ... }` where `seq` increases by 1 per public event of a match. Private events carry `{ priv: true,
type, ... }` and no `seq` (they are never replayed). Clients ignore public events with `seq <= view.seq`.

| `type` | Public | Fields | Meaning | Client reaction |
|--------|--------|--------|---------|-----------------|
| `snapshot` | No (private) | `view: HousieView` | The receiver's full state, sent once to each person when the match starts | Replace state, fade the screen in |
| `ball` | Yes | `n`, `index` (1 to 90), `nextInMs?` | A ball was drawn | Roll-in reveal, add to mini-grid and master board, update count, restart ring |
| `caller` | Yes | `mode`, `intervalMs`, `paused`, `nextInMs?` | Caller settings changed | Update host controls and the call indicator |
| `claimed` | Yes | `combo`, `by: { playerId, name, color }`, `calledCount` | A claim was accepted | Tile becomes Claimed (celebration for everyone), unlock the next Full House |
| `bogus` | No (private) | `combo` | Your claim was evaluated and failed | Local "Bogus Claim" notice on that tile for about 2 s |
| `justClaimed` | No (private) | `combo` | Your claim lost the race or the combination was already taken | Short "Already claimed" notice |
| `claimsPaused` | No (private) | `untilMs` (remaining milliseconds) | Your third bogus claim in a row started a 1-minute lock; also sent when you try to claim while locked or on reconnect | Disable CLAIM buttons, show "Claims paused" with a countdown, re-enable when it ends |
| `finished` | Yes | `results: { combo, winner?: { playerId, name, color } }[]`, `calledCount` | The match ended | Results screen |
| `playerLeft` | Yes | `playerId` | A ticket holder's seat was released | Nothing visible except the player count; used to keep local tallies correct |

A private event is delivered only to the target's current socket; if they are offline they get the state through the next ack.

## HousieView (the receiver's snapshot)

```text
HousieView {
  seq                                   // last public event applied
  phase: 'running' | 'finished'
  settings: { patterns: string[], ceiling: number }
  called: number[]                      // in call order
  caller: { mode, intervalMs, paused, nextInMs? }
  combos: { id, status, claimedBy?, locked? }[]
  you: { playing: boolean, tickets: Ticket[], marks: number[], claimsLockedMs?: number }   // tickets and marks empty when not playing (non-playing host)
  hostId: string
  playing: number                       // count of ticket holders
  results?: ...                         // when finished
}
```

Never included: the deck (unrevealed balls), other players' tickets or marks, other players' claim attempts.

## Ordering and recovery

1. Public events are broadcast in order and carry `seq`; every `ball`/`claimed`/`finished` event is self-describing, and a
   reconnecting client takes a full `HousieView` from the ack, so no replay is needed.
2. The client applies only events with `seq > view.seq`. If a gap is detected (`seq` jumps by more than 1), it requests nothing new:
   it simply re-joins (`room:join` resumes the seat) which returns a fresh view.
3. Ball reveal animation never delays state: the mini-grid, board and count update immediately; only the large ball plays its 1.1 s
   reveal, and a newer ball interrupts an older reveal.

## Behavioural guarantees (what verification checks)

1. **Authority**: every called number comes from the server's deck; no ticket, ball, or result originates from a client (SC-002, SC-005).
2. **No repeats**: 90 draws produce each of 1 to 90 exactly once, and the 91st draw is refused (SC-007 and the spec edge case).
3. **Claim correctness**: a claim is accepted only if every required cell is called and crossed on the named ticket; otherwise it is
   a private bogus (SC-009).
4. **Race**: of two simultaneous valid claims for one combination, exactly one `claimed` event is broadcast; the other claimant gets
   `justClaimed` (FR-026).
5. **Pace**: no more than one evaluated claim per person per 2 seconds (FR-027).
6. **Privacy**: no event or ack ever contains another player's tickets or marks; bogus and justClaimed reach only the claimant.
7. **Chat purity**: the only server-written chat lines are `game_notice` win lines; with `quietChat`, the platform writes none while the match is running (SC-010).
8. **Timing**: draws occur within 0.5 s of the chosen interval; a ball reaches every screen within 1 s (SC-005, SC-006).

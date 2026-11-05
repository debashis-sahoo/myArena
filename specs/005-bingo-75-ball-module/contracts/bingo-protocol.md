# Contract: Bingo Real-Time Protocol

Builds on [../../001-platform-hub-rooms/contracts/realtime-events.md](../../001-platform-hub-rooms/contracts/realtime-events.md) and follows the
Housie conventions ([../../003-housie-tambola-module/contracts/housie-protocol.md](../../003-housie-tambola-module/contracts/housie-protocol.md)):
acknowledgements `{ ok, data | error }`, strict schema validation with unknown fields rejected, identity derived from the socket (never from the
payload), and no event carries another player's private data. Platform wiring is in [platform-integration.md](platform-integration.md); data shapes in
[../data-model.md](../data-model.md).

## Client to server

All intents use `game:action` (per-connection limit: burst 10, 5 per second, `RATE_LIMITED`). The schema is a strict union, so a client cannot send a ball
number, a card, a pattern or a result; there is no such field.

### In the lobby (room state `lobby`)

| `type` | Fields | Who | Effect |
|--------|--------|-----|--------|
| `setCeiling` | `value: 1..4` in the shared schema; the Bingo engine accepts 1 to 3 | Host | Sets the card ceiling; clamps all choices to it |
| `setHostPlays` | `value: boolean` | Host | Host plays (gets a choice) or only calls |
| `setPatterns` | `ids: string[]` (0 to 40 ids in the shared schema; the engine accepts only the nine Bingo ids, no duplicates; an empty list is allowed so the host can clear the choice, and Start is then refused) | Host | Replaces the chosen patterns |
| `setCaller` | `mode: 'manual' \| 'auto'`, `intervalMs?: 5000 \| 8000 \| 10000` | Host | Initial caller mode |
| `setCards` | `count: 1..3` | Anyone seated (the host only when `hostPlays`) | Sets own card count; refused above the ceiling |

Player capacity uses the platform's `room:setCapacity`; Start uses `room:start`; a new round uses `room:reset`.

### During the match (room state `in_progress`, phase `running`)

| `type` | Fields | Who | Effect |
|--------|--------|-----|--------|
| `draw` | none | Host | Draws the next ball now (manual, or an extra draw while auto restarts its timer) |
| `auto` | `intervalMs: 5000 \| 8000 \| 10000` | Host | Switches to auto at that interval (or changes it); starts or restarts the timer |
| `manual` | none | Host | Back to manual calling |
| `pause` / `resume` | none | Host | Pauses or resumes auto calling |
| `daubs` | `changes: { card: 0..2, cell: 0..24, on: boolean }[]` (1 to 30) | A playing person | Sets daubs on own cards (the FREE cell, 12, is accepted); changes naming a card the sender does not own are dropped |
| `bingo` | `card: 0..2` | A playing person (host included when `hostPlays`) | Server validates and decides (see "Claim decision") |

Rejections use `INVALID_STATE` with a short message: "Only the host can do that.", "The match is over.", "All balls have been called.", "Wait a moment."
(claim pace), "Claims paused.", "You do not have that card.". A claim that is evaluated and fails is **not** an error: the ack is `ok` and the claimant
receives a private `bogus` or `tooLate` event, so the screen never reveals which patterns are close.

`setCeiling`, `setHostPlays`, `setPatterns`, `setCaller`, `draw`, `auto`, `manual`, `pause` and `resume` are the same objects Housie uses; the room's game
decides which engine reads them. `setCards`, `daubs` and `bingo` are new schema members.

## Server to client

| Event | Payload | Sent to | When |
|-------|---------|---------|------|
| `room:state` | `RoomState` (+ `gameLobby` while in the lobby) | All | Existing; coalesced above 12 seats |
| `game:event` | `BingoEvent` | See below | After each step of the match |
| `chat:message` | `ChatMessage` | All | Typed messages only; with `quietChat` the platform writes no system line during the match and Bingo posts none (FR-031) |
| `player:removed`, `room:closed` | Existing | As before | Existing behavior |

`JoinedData.game` (create, join and resume acks) is the receiver's own `BingoView` while a match is running.

## BingoEvent

Public events carry `{ seq, type, ... }` with `seq` increasing by 1 per public event of a match. Private events carry `{ priv: true, type, ... }` and no
`seq` (never replayed). Clients apply a public event only when `seq === view.seq + 1`, ignore `seq <= view.seq`, and re-join on a gap.

| `type` | Public | Fields | Meaning | Client reaction |
|--------|--------|--------|---------|-----------------|
| `snapshot` | No (private) | `view: BingoView` | The receiver's full state, sent once to each person when the match starts | Replace state, fade the screen in |
| `ball` | Yes | `n`, `index` (1 to 75), `nextInMs?` | A ball was drawn | Roll-in reveal of "G-54" style ball, add to history grid and master board, update count, restart ring |
| `caller` | Yes | `mode`, `intervalMs`, `paused`, `nextInMs?` | Caller settings changed | Update host controls and the call indicator |
| `claimed` | Yes | `patterns: string[]` (1 or more), `by: { playerId, name, color }`, `calledCount` | A claim was accepted | Each listed tile becomes Claimed (one celebration for everyone) |
| `bogus` | No (private) | none | Your claim completed nothing | Local "Bogus Bingo" alert for about 2 s |
| `tooLate` | No (private) | none | Your card completes only patterns someone else already won | Short "Too late - already claimed" notice |
| `claimsPaused` | No (private) | `untilMs` (remaining milliseconds) | Your third bogus claim in a row started a 1-minute lock; also sent when you try to claim while locked | Disable BINGO!, show "Claims paused" with a countdown, re-enable when it ends |
| `finished` | Yes | `results: { pattern, winner?: { playerId, name, color } }[]`, `calledCount` | The match ended | Results screen |
| `playerLeft` | Yes | `playerId` | A card holder's seat was released | Nothing visible except the player count |

A private event is delivered only to the target's current socket; if they are offline they get state through the next ack, and a lock still in force is
restored from `you.claimsLockedMs`.

## BingoView (the receiver's snapshot)

```text
BingoView {
  seq                                   // last public event applied
  phase: 'running' | 'finished'
  settings: { patterns: string[], ceiling: number }
  called: number[]                      // in call order
  caller: { mode, intervalMs, paused, nextInMs? }
  patterns: { id, status: 'open' | 'claimed', claimedBy?, claimedAtCall? }[]
  you: {
    playing: boolean
    cards: BingoCard[]                  // 25 numbers each, index 12 = 0 (FREE); empty when not playing
    daubs: number[]                     // one 25-bit mask per card
    freeTapped: boolean[]               // one per card
    claimsLockedMs?: number
  }
  hostId: string
  playing: number                       // count of card holders
  results?: ...                         // when finished
}
```

Never included: the deck (unrevealed balls), other players' cards, daubs or tooltip state, other players' claim attempts.

## Claim decision

See [../data-model.md](../data-model.md) "Claim (transient)" for the exact order. In short: checks, then lock and pace, then the card is evaluated against
every pattern in play; every open pattern it completes is awarded in the one `claimed` event; otherwise `tooLate` (only already-claimed patterns
complete) or `bogus` (nothing completes). A cell counts only if it is daubed and (FREE or called before the claim was received).

## Ordering and recovery

1. Public events are broadcast in order and carry `seq`; every `ball`, `claimed` and `finished` event is self-describing, and a reconnecting client takes
   a full `BingoView` from the ack, so no replay is needed.
2. If the client sees a gap in `seq`, it re-joins (`room:join` resumes the seat), which returns a fresh view.
3. The ball reveal animation never delays state: the history grid, board and count update at once; only the large ball plays its 1.1 s reveal, and a
   newer ball interrupts an older reveal.

## Behavioral guarantees (what verification checks)

1. **Authority**: every called number comes from the server's deck; no card, ball or result originates from a client (SC-002, SC-005).
2. **No repeats**: 75 draws produce each of 1 to 75 exactly once and the 76th is refused.
3. **Letters**: every ball shows the letter of its range (1-15 B, 16-30 I, 31-45 N, 46-60 G, 61-75 O) (SC-005, SC-007).
4. **Daubs**: the server never sets a daub; a cell is daubed only because its owner sent it (SC-004).
5. **Claim correctness**: a pattern is awarded only if some variant has every cell daubed and (FREE or called before receipt) on the named card (SC-009).
6. **Race**: of two simultaneous valid claims for one pattern, exactly one `claimed` event includes it; the other claimant gets `tooLate` (FR-028).
7. **Pace and lock**: at most one evaluated claim per person per 2 s; three bogus claims in a row start a 1-minute lock; a valid claim resets the count
   (FR-029).
8. **Privacy**: no event or ack contains another player's cards, daubs or tooltip state; `bogus`, `tooLate` and `claimsPaused` reach only the claimant.
9. **Chat purity**: the server writes no chat line during the match (SC-010).
10. **Timing**: draws occur within 0.5 s of the chosen interval; a ball reaches every screen within 1 s (SC-005, SC-006).

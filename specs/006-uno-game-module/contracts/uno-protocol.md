# Contract: UNO Real-Time Protocol

Builds on [../../001-platform-hub-rooms/contracts/realtime-events.md](../../001-platform-hub-rooms/contracts/realtime-events.md) and follows the Ludo, Housie and Bingo
conventions: acknowledgements `{ ok, data | error }`, strict schema validation with unknown fields rejected, identity derived from the socket (never from the payload), and no event
carries another player's private data. Platform wiring is in [platform-integration.md](platform-integration.md); data shapes in [../data-model.md](../data-model.md).

## Client to server

All match intents use `game:action` (per-connection limit: burst 10, 5 per second, `RATE_LIMITED`). The schema is a strict union, so a client cannot send a card face it does not hold, a
result, a winner or a turn change; there is no such field.

| `type` | Fields | Who | Effect |
|--------|--------|-----|--------|
| `playCard` | `card: 0..107`, `color?: 'red' \| 'yellow' \| 'green' \| 'blue'` | The player whose turn it is | Plays a card from their own hand if legal (data-model "Playability"). `color` is required for a Wild and a Wild Draw 4 and must be omitted otherwise |
| `drawCard` | none | The player whose turn it is | Draws one card, or the whole pending total when a penalty is pending; ends the turn unless a drawn card is playable |
| `keepCard` | none | The player who just drew a playable card | Keeps it and ends the turn |
| `callUno` | none | Any seated player | Calls UNO! while holding exactly 2 cards, or inside a catch window against them |
| `catchPlayer` | `player: string` (1 to 40 characters) | Any seated player except the target | Catches `player` inside an open catch window |
| `playAgain` | none | The host, after the match finished | Re-deals a fresh match with the same participants (needs 2 or more active seats) |

`room:start`, `room:fillAi`, `room:setCapacity`, `room:kick` and `room:leave` are platform events, not game actions. The existing `draw` action of Housie and Bingo is a different object
and is untouched; UNO's names are distinct (`drawCard`, not `draw`).

### Acknowledgement and rejections

An accepted action acknowledges `{ ok: true }`. A refused action acknowledges `{ ok: false, error: { code: 'INVALID_STATE', message } }` and changes nothing for anyone; the client
uses it to play the bounce, shake and show the one-line reason. A malformed payload is `INVALID_PAYLOAD` (the client never sends one by design). Messages used by the engine:

| Message | When |
|---------|------|
| "It is not your turn." | `playCard`, `drawCard` or `keepCard` from anyone but the active player |
| "Please wait a moment." | Phase `settling`, or a repeated action while the previous one is still animating |
| "You do not have that card." | The id is not in the sender's hand |
| "That card does not match." | Not playable (colour, number and kind rules) |
| "Choose a colour for the Wild card." | `color` missing or present for a card that does not need it |
| "Play a matching draw card or draw the cards." | Another card while a penalty is pending |
| "You already drew a card this turn." | A second `drawCard` in the same turn |
| "Play the card you drew, or keep it." | Another card while phase is `drawn` |
| "Not yet. UNO! is for when you have two cards." | `callUno` in any other state |
| "Too late." | `catchPlayer` with no open window, after the victim called, or for a different player |
| "You cannot catch yourself." | `catchPlayer` naming the sender |
| "Only the host can do that." | `playAgain` by a non-host |
| "The match is not over." / "The match is over." | `playAgain` too early; any other action after the end |
| "At least two players are needed." | `playAgain` with fewer than 2 active seats |

## Server to client

| Event | Payload | Sent to | When |
|-------|---------|---------|------|
| `room:state` | `RoomState` | All | Existing; includes the lobby seats and, after start, `state: 'in_progress'` |
| `game:event` | `UnoEvent` | **One copy per human, built for that person** | After each step of the match |
| `chat:message` | `ChatMessage` | All | Typed messages only; with `quietChat` the platform writes no system line during the match and UNO posts none (FR-046) |
| `player:removed`, `room:closed` | Existing | As before | Existing behavior |

`JoinedData.game` (create, join and resume acks) is the receiver's own `UnoView` while a match is running; in a "Play with AI" room the create ack already carries it because the match
starts at once.

## UnoEvent

Every event is `{ seq, type, ...fields, table, you }` where `table` is the public `UnoTable` and `you` is the viewer's own `UnoYou` (see data-model section 4). `seq` increases by 1 per event
of a match (a new deal restarts at 1 with a higher `matchNo`). Clients apply an event only when `seq === shown.seq + 1`, ignore `seq <= shown.seq`, and on a gap show the newest event's state and re-join (`resyncRoom`).

| `type` | Extra fields | Private part | Meaning | Client reaction |
|--------|--------------|--------------|---------|-----------------|
| `deal` | `dealer: string` | `you.hand` | A match was dealt (first deal or Play again) | Deal animation (hand fans in, backs fly to seats, first card turns), banner "Match N" |
| `turn` | `player: string` | none | Phase `turn` begins for `player` (after settling) | "Your turn" banner and countdown for the viewer; ring and countdown on the seat; bot "thinking" cue |
| `play` | `by`, `card`, `color` (active colour after the play), `effect: 'none' \| 'skip' \| 'reverse' \| 'draw2' \| 'wild' \| 'wild4'`, `skipped?: string`, `stacked?: boolean` | none (the card is public once played) | A card was played | Throw (own) or seat-to-pile flight (others); aura change; arrows flip with flare on `reverse`; "Skipped!" over `skipped`; "+N" badge from `table.pending` |
| `draw` | `by`, `count`, `why: 'turn' \| 'pending' \| 'timeout' \| 'catch' \| 'start'`, `reshuffled: boolean`, `cards?: number[]` | `cards` only in the recipient `by`'s copy | Cards left the Draw Pile for `by` | Flight from the pile to the hand (faces for the owner, backs for others) |
| `keep` | `by` | none | The drawer kept the drawn card | Turn passes; short "kept" cue |
| `uno` | `by` | none | `by` called UNO! | "UNO!" flash on the seat |
| `catchOpen` | `victim`, `windowMs` | none | `victim` has 1 card and has not called | Flashing "Catch [name]!" on the victim's seat for everyone else; the victim's UNO! button pulses |
| `caught` | `victim`, `by` | none | `by` caught `victim` | "Caught!" flash; a `draw` event with `why: 'catch'` follows |
| `catchClosed` | `victim`, `reason: 'called' \| 'caught' \| 'expired' \| 'hand_changed' \| 'left' \| 'finished'` | none | The window ended | Buttons disappear |
| `warning` | `player` | none | `player` missed 2 turns in a row | Warning cue on the seat |
| `timeout` | `by`, `action: 'draw' \| 'keep'` | none | The countdown ended: the server drew for `by` (`'draw'`) or kept the card `by` had just drawn (`'keep'`) | Short notice; after `'draw'` a `draw` event with `why: 'timeout'` or `'pending'` follows |
| `released` | `player`, `reason: 'left' \| 'inactive'` | none | A seat left the match | Seat shows "Left"; cards shuffled back |
| `finished` | `winner`, `forfeit: boolean` | none | The match ended | Celebration, results overlay (standings are in `table.standings`) |

`table.phase`, `table.turn`, `table.remainingMs`, `table.pending`, `table.catchWindow` and `table.thinking` always describe the state after the event, so a client that skips animations still shows
the right controls.

## Privacy and authority guarantees

- No payload contains another seat's hand, the Draw Pile order or any card face that has not been played (a drawer's own `cards` are in that drawer's copy only). `table.players[].handCount` is the only
  trace of a hidden hand.
- The server decides legality, effects, penalties, UNO! and catch outcomes, timers, bots and the winner; a client's `color`, `card` and `player` are requests, validated against the match.
- Actions are decided in arrival order at the server; two near-simultaneous actions have exactly one outcome, and the loser receives a rejection.
- Bots never send actions over the socket; the engine calls the same functions the action handler calls, so a bot's play goes through the same validation as a person's (FR-042).
- A viewer who is not seated (for example a removed player) receives no events and no `you` block.
- Development-only controls (`UNO_DEV_*`) are read from the server environment only and are ignored in production; no message selects a scenario.

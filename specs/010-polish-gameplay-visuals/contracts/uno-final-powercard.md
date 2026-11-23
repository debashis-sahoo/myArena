# Contract: UNO Final Powercard Replacement

## Scope

This contract refines only UNO winner determination. It preserves existing client intents, room
authority, privacy, matching, Wild colour selection, Skip/Reverse/Draw penalties, timers, catch
behavior, bots, and reconnect snapshots.

## Client-to-server actions

No action is added. `playCard`, `drawCard`, `keepCard`, `callUno`, `catchPlayer`, and `playAgain`
retain their strict payloads. The client never identifies a winning card or declares a win.

## Card classes

- Numbered: `kind = 'number'`.
- Powercard: `kind` is `skip`, `reverse`, `draw2`, `wild`, or `wild4`.

## Authoritative transition

When `playCard` is legal and removes the player's sole card:

1. Remove the card from the private hand and place it on discard.
2. Apply the normal card effect:
   - Skip: skip one active seat.
   - Reverse: reverse and apply existing two-player behavior.
   - Draw Two / Wild Draw Four: set or stack the existing pending penalty.
   - Wild: set the selected active colour.
3. If the card is numbered, finish with the existing `finished` event.
4. If the card is a powercard:
   - do not publish `finished`;
   - draw exactly one replacement through the normal pile/reshuffle path;
   - publish a `draw` event with `why: 'replacement'`;
   - leave the outgoing player active with one card;
   - continue the normal effect timing and turn handoff.

The replacement is private to its recipient and may be any ordinary UNO card.

## Event sequence

Observable sequence:

1. `play`
   - `by`: outgoing player
   - `card`: played powercard
   - `color`: resulting active colour
   - `effect`: the real powercard effect
   - existing `skipped` and `stacked` fields when applicable
2. `draw`
   - `by`: outgoing player
   - `count`: 1
   - `why`: `replacement`
   - `reshuffled`: true only when the normal rebuild occurred
   - `cards`: one private card ID for the recipient only
3. Later `turn`, targeting the seat produced by the played effect.

No `finished` event appears in this sequence.

## Draw event extension

`UnoDrawReason` permits a new value:

```text
'replacement'
```

It means one card was automatically awarded because a legally played final card was a powercard. It
does not enter the `drawn`/keep-card state and does not represent a normal voluntary turn draw.

## Invariants

- Every card ID appears exactly once across hands, piles, or a temporary transition.
- A sole final powercard never sets `winner` or `standings`.
- The replacement transition yields exactly one card for a valid deck.
- The powercard's effect is not suppressed or changed to `none`.
- Only the recipient sees replacement `cards`.
- Bots and humans pass through the same `playCard` transition.
- Reconnect snapshots expose the latest authoritative phase, hand count, pending effect, and turn.
- A numbered sole final card retains immediate finish behavior.

## Failure and race expectations

- Invalid turn, ownership, colour, matching, pending, or drawn-card requests are rejected without
  mutation.
- A client interrupted by the replacement animation resynchronizes from authoritative events or
  snapshot; it does not reconstruct hidden cards.
- Near-simultaneous actions retain exactly one accepted server outcome.
- Existing catch-window cleanup may publish `hand_changed` when receiving a replacement.

## Deck availability

The 108-card match model guarantees that, when the sole final powercard has just been placed on the
discard pile, a valid game state has at least one drawable card either in the draw pile or below the
new top card for the standard reshuffle path. Therefore the replacement is exactly one card; zero
replacement cards are not a valid success outcome.

If internal state violates that invariant, the engine MUST abort the transition without declaring a
winner, log the state fault, and leave the match recoverable through its authoritative snapshot or
resync behavior. It MUST NOT silently invent a card or treat a zero-card hand as continued play.

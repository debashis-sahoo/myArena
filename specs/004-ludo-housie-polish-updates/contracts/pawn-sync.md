# Contract: Pawn Display Consistency (Ludo client)

Scope: what every Ludo screen guarantees about pawn positions, and how a screen corrects itself. The server contract (events carry a full
snapshot and a contiguous `seq`) is unchanged.

## Guarantees

1. **Settled equals recorded**: when a screen has no animation running and no queued events, each pawn is drawn at the square of the
   latest committed snapshot, and no animation object remains on any pawn (`getAnimations()` is empty for the pawn layer).
2. **Timing**: within 1 s after a move's animation should have finished, and in any case within 2 s of the server recording the move,
   the committed snapshot is the server's latest.
3. **Abort is final**: once a sequence is aborted, it creates no more animations and leaves no fill behind.
4. **No remount**: a pawn element persists across eligibility changes (same element type and key); animations target the live element.
   An eligible pawn stays operable by tap, Enter and Space (keyboard access is kept).
5. **Cell size changes** (resize, rotation, zoom) re-draw settled pawns from layout; no fill from an earlier size remains.

## Self-correction triggers

| Trigger | Action |
|---------|--------|
| Tab becomes visible, `pageshow`, `online` | Abort the running sequence, show the newest known snapshot at once (no backlog replay) |
| More than 3 events queued | Skip to the newest snapshot (existing rule, now abortable) |
| Event `seq` greater than last seen plus 1 (an event was missed) | Drop the queue and animations and show that event's own snapshot at once (every event carries the full state); no round trip is needed |
| A snapshot newer than the move being animated replaces the board (reconnect or resync) | Abort that move; the snapshot is what is shown |
| Reconnect | Fresh join snapshot replaces the slice (existing rule) |
| A queued event has waited more than 1.5 s behind the running animation (slow device or throttled tab) | Abort the animation and jump to the newest snapshot (replaces the earlier "duration plus 1 s" watchdog; the commit timer already ends every animation at its expected duration) |
| Cell size changes while settled | Cancel any pawn animation; layout draws the pawns |

## Verification surface

Each pawn element exposes `data-sq` (square key of the committed snapshot). Harness comparison: for every screen and every pawn,
`data-sq` equals the key derived from the server snapshot, and the element's bounding box centre matches the layout point of that square
within 1 px.

## Non-goals

No change to dice results, turn order, timeouts, hop timing, or the server protocol.

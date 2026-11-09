# Contract: UNO Turn Indicator, Staged Card Play and Chat Minimize

Presentation contract for UNO. The UNO wire protocol ([specs/006-uno-game-module/contracts/uno-protocol.md](../../006-uno-game-module/contracts/uno-protocol.md)) is **unchanged**; the
server still decides legality, turns and outcomes. Terms: `table` and `you` are the public and private blocks of the shown view.

## 1. Turn indicator

### The label

`describeTurn(table, you, wheelOpen, actorConnection)` returns the text and kind in the table in [research.md](../research.md) R10 (data-model section 6). It reads only the **shown** view, so the strip, the
seat chip, the hand frame and the live region always match the table on screen, including after a reconnect snapshot. Wording rules: at most 40 characters on phones; the actor's name is
truncated with an ellipsis before the verb ("Alexandrina..." then "'s turn"); the local player's own turn always begins "Your turn".

### The turn strip

```text
 width >= 760 px                                   width < 760 px
 +--------------------------------------------+    +-----------------------------+
 | Leave UNO ABCD   [ (av) Sam's turn  0:24 ] |    | Leave  UNO ABCD  inv snd chat |
 |                       invite  audio  chat  |    | [ (av) Sam's turn        0:24 ] |   30 px row (24 px when the screen is
 +--------------------------------------------+    +-----------------------------+     600 px high or less)
```

| Part | Behavior |
|------|----------|
| Placement | In the header's free space when the screen is at least `STRIP_MIN_W` wide (provisional 760 px, set from measurement in V3; no table height used); otherwise a full-width row directly under the header |
| Content | The actor's avatar in their seat colour ring, the label text, and a countdown (digits `m:ss` plus a draining bar) while a human must act; none for a bot, a settling table or an automatic penalty. While a catch window is open a secondary note follows the text ("Say UNO!" for the player who forgot, "Catch {Name}!" for the others); it never replaces the turn text |
| Local turn | Gold fill, text "Your turn: ...", gentle pulse (not with reduced motion) |
| Others' turn | Dark fill with a coloured edge, text "{Name}'s turn" |
| Live region | A polite live region announces the label when it changes; the 900 ms banners remain as celebration only |

### Seat and hand cues (not colour alone)

- The active opponent seat gains a text chip "Turn" (or "Draws N" for an automatic penalty) above the avatar, in addition to the existing ring glow and countdown arc. The seat's
  `aria-label` already ends "playing now".
- On your turn the hand area gets a gold frame and playable cards stay raised and bright (existing); on other turns the frame is absent. With reduced motion the frame is static.
- A bot shows "{Bot} is thinking..." in the strip and its three dots on the seat (existing).
- A human actor who lost connection shows "Reconnecting" on the seat (existing) and "{Name} is reconnecting..." in the strip while the server's countdown keeps running.

### Layout effect

`planUnoTable` gains `turnStrip: 'header' | 'row'` and `stripH` (0 for `header`; 30, or 24 when the screen is 600 px high or less, for `row`). A row reduces the table height by `stripH`.
V3 and V9 re-measure the tightest sizes (320 x 568, 360 x 640, 390 x 844, 568 x 320, 640 x 360, 667 x 375) against the 006 limits (hand slice at least 40 px at 320 wide, piles at least 35% of the centre height); if a limit
fails the top seat band shrinks by `stripH` before any other region does.

## 2. Staged card play

### Sequence (my card, stable connection)

```text
 t = 0          activation (tap, click, Enter or Space, or drag released over the table)
 t <= 100 ms    ghost lifts toward the pile (hold pose at 40% of the way, glow ring); hand slot shows pending; request sent
 ... round trip ...
 server event   `play` for this card by me arrives
 +260 ms        throw continues from the hold pose to the pile; table commits (hand, pile, turn) as today
```

### Rules

| Case | Behavior |
|------|----------|
| Wild card | First activation opens the colour wheel (no request). Choosing a colour starts the hold and sends the request; cancelling does nothing |
| Server refuses | Ghost flies back in 220 ms, then the existing bounce, shake and reason; hand, pile and turn are unchanged |
| No answer in 4 s | Ghost returns, "Connection is slow, try again" appears, the room resynchronizes; the card is never lost |
| Repeated activation | The single-flight guard keeps one request; additional activations during an attempt are ignored |
| Card not in `you.playable` | Existing behavior: sent for the server's reason, then bounce |
| A newer snapshot or skip arrives while held | Ghost is removed and the shown state wins |
| Opponent's play | Existing 450 ms throw from their seat |
| Reduced motion | No flight: a pending ring on the card, then the existing 150 ms fade on confirmation |
| Pointer and touch | Unchanged gestures from 006: touch press lifts and previews, release over the same card plays, release elsewhere cancels; mouse click plays; drag over the table plays |

### Non-goals and safety

- The held card is never shown on the Discard Pile before the server confirms; the pile's top card, the aura, the turn and every hand count change only on the server event.
- No UNO message, field or timing on the server changes; settle times still follow `UNO_THROW_MS` (450 ms).

## 3. Chat minimize

```text
 Docked (>= 700 x 540)                                Drawer (phones)
 expanded:  [ table ........ ][ chat column  [-] ]   header icon [💬 3] opens a sheet under the header
 minimized: [ table ........... ][rail]               sheet header: "Chat   [ Minimize ]"
                                  💬 3  "Open chat"   closing = minimized (preference recorded); the icon keeps the unread badge
```

| Part | Behavior |
|------|----------|
| Minimize control | In the chat header (docked) and the sheet header (drawer); a button with `aria-label` "Minimize chat" |
| Restore control | The rail (docked) or the header icon (drawer); `aria-label` "Open chat" with the unread count when above 0 |
| Fit | `planUnoTable` adds chat mode `rail` (44 px wide column plus the existing gap); the table, seats, piles and hand re-fit into the freed width within 0.5 s |
| Unread | While minimized the panel reports itself closed (`setDrawerOpen(false)`), so people's new messages raise the count; viewing the conversation clears it |
| Draft and history | The draft lives in the platform draft store; history lives in the room store; neither is lost by minimizing, rotating, replaying or reloading |
| Preference | `useChatPref('uno')`; absent means expanded when docked and closed on phones; a user's choice persists on the device |
| AI room | No chat, no rail, no icon (unchanged) |
| Keyboard | Escape closes the drawer sheet (existing); the rail and minimize controls are reachable by Tab and operate with Enter or Space |

## 4. Accessibility and motion

- Turn information is available as text, a live-region announcement, an `aria-current` seat and the strip; nothing relies on colour, sound or motion alone.
- Hold, finish and return flights are skipped under reduced motion (pending ring instead); the strip pulse and hand-frame glow are static.
- All new controls have visible focus states and at least 44 px targets on touch screens.

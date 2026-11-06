# Contract: UNO Launch, Lobby and Match Screens

Defines what the player sees and how it is sized. The sizing rules satisfy constitution Principle II (largest fit, no page scroll, no large unused areas, safe areas, rotation, reduced
motion); evidence at the sizes below is recorded in `verification.md`. Wire data is in [uno-protocol.md](uno-protocol.md); platform changes in [platform-integration.md](platform-integration.md).

## 1. Launch modal (platform component, extended)

| Step | Content | Behavior |
|------|---------|----------|
| `choose` | Two large actions: "Play with AI" (robot icon, "Start right away, solo") and "Play Online" (globe icon, "Private room with an invite link") | No default; closing (X, outside tap, Escape) creates nothing (FR-002) |
| `ai` | "How many opponents?" with buttons 1 to 4, 3 preselected, Back, "Start vs N bots" | One tap creates the room; the player lands at a running table (FR-003) |
| `capacity` | "How many players?" with buttons 2 to 5, 4 preselected, Back, "Create room" | Shown only for games with `launch.askCapacity`; creates the room and opens its lobby (FR-004) |

Buttons are at least 44 px tall, focus returns to the tile on close, the busy state shows a spinner and disables the other controls.

## 2. Online lobby (platform Lobby, one addition)

The platform lobby is used as is: invite bar (room code, link, Copy), player list with host crown, bot marker and connection dots, host controls (capacity stepper 2 to 5 below the seated count is
refused, Start disabled with a reason below 2 seated) and chat. The addition is in host controls: **"Fill N empty slots with AI"** (secondary style, robot icon) shown while at least one seat is
empty. The first press changes the button into a two-button confirmation ("Fill N slots with AI and start now?" with Confirm and Cancel); Confirm seats bots and starts for everyone at once.
Guests see "Waiting for the host to start the match..." and no host controls (FR-007 to FR-010).

## 3. Match screen

### Regions

```text
Portrait phone, 4 opponents (online, chat in a header drawer)         Landscape, 4 opponents (online, chat docked)
+-------------------------------+                                    +-----------------------------------------------+---------+
| Leave   UNO ABCD-EFGH  inv snd chat |  header                      | Leave   UNO ABCD-EFGH   invite  sound         |  CHAT   |
|  [Seat TL]        [Seat TR]    |  top band                          |      [Seat TL]            [Seat TR]            |  column |
| [S]   +-----------------+  [S] |                                    | [S]   +-----------------------------+   [S]  |         |
| [i]   |  Draw Pile      |  [i] |  centre area:                      | [i]   |  Draw Pile   Discard Pile   |   [i]  |         |
| [d]   |  Discard Pile   |  [d] |  piles stacked, arrow track        | [d]   |  (arrow track, aura, +N)    |   [d]  |         |
| [e]   |  (aura, +N)     |  [e] |  and aura                          | [e]   +-----------------------------+   [e]  |         |
|       +-----------------+      |                                    |   [ Keep ]                      [ UNO! ]       |         |
|   [ Keep ]     [ UNO! ]        |  UNO row (portrait)                |   (  fanned hand in an arc  )                  |         |
|   (  fanned hand in an arc  )  |  hand band                         +-----------------------------------------------+---------+
+-------------------------------+
```

In a "Play with AI" room the chat column and the chat icon do not exist; the table region takes the full width (FR-048).

### Seat placement (FR-025)

Opponents are listed in seat order clockwise from the viewer. The same table applies to every orientation:

| Opponents | Placement |
|-----------|-----------|
| 1 | top centre |
| 2 | top left, top right |
| 3 | middle-left, top centre, middle-right |
| 4 | middle-left, top left, top right, middle-right |

Side seats are vertically centred on the centre area. Seating stays fixed when the direction reverses; only the arrows change.

### Opponent seat anatomy

An avatar in a ring of the seat's tag colour (the ring glows and a countdown arc runs around it on that player's turn; a bot shows three animated "thinking" dots instead of the arc), the name
(11 px or more, ellipsis), a crown for the host, a "BOT" chip for bots, a connection dot (green connected, amber "Reconnecting", grey "Left"), and a fan of up to 5 card backs with the exact count as
text in a pill (for example "×12"). Short-lived overlays: "UNO!", "Caught!", "Skipped!", "+4". When a catch window is open against that player, a **"Catch [Name]!"** button (at least 44 px tall,
pulsing gold glow) appears anchored to the seat for every other human; pressing it sends `catchPlayer`.

### Sizing rules

Inputs: `W x H` of the screen after safe-area insets; `n` opponents; whether chat is docked (online and `dockedChat`, i.e. at least 700 by 540) giving chat column `cw = clamp(240, 0.22 W, 340)`
and table width `W' = W - cw - 12`, otherwise `W' = W`.

| Element | Rule |
|---------|------|
| Header `hh` | 32 px when `H <= 420`, 52 px when `W >= 1024`, else 44 px |
| Top band `ht` | `clamp(56, 0.085 H, 92)` px; top seats share the width, each at most 190 px wide |
| Side seat width `ws` | `clamp(56, 0.075 W', 110)` px (no side seats for 1 or 2 opponents) |
| Hand card height `hc` | `clamp(64, 0.15 H, 200)` px; width `0.69 hc`; lift `0.14 hc` |
| UNO row | 44 px above the hand when portrait (`W' < 1.3 H`); on landscape the UNO! and Keep buttons sit at the ends of the hand band and take about 120 px each side instead |
| Hand band `hb` | `hc + lift + room`, plus 44 in portrait, where `room = ceil(0.085 hc)` is kept under the fan so the lowest tilted cards stay inside the band |
| Centre area | `(W' - 2 ws - 8) x (H - hh - ht - hb)` |
| Arrow track band `b` | `clamp(18, 0.09 * min(centre width, centre height), 34)` px |
| Pile card height `hp` | Side by side: `min(centreH - 2b, (centreW - 2b) / 1.46)`; stacked: `min((centreH - 2b) / 2.08, (centreW - 2b) / 0.69)`; use the arrangement with the larger `hp`. Width is `0.69 hp` |

Safe areas are added as padding to the header, the hand band and the side columns. Nothing in the match screen scrolls the page; only the chat sheet and an overfull hand scroll inside themselves.

### Budgets at the sizes in the spec (4 opponents, online unless noted)

| Screen | Mode | Centre area | Piles | Piles and track share of height | Hand card | 7-card slice |
|--------|------|-------------|-------|----------------------------------|-----------|--------------|
| 320 x 568 | portrait, drawer | 200 x 319 | stacked, 94 x 136 | 55% | 59 x 85 | 42 px |
| 390 x 844 | portrait, drawer | 270 x 528 | stacked, 159 x 231 | 62% | 88 x 127 | 44 px |
| 667 x 375 | landscape phone, drawer | 547 x 208 | side by side, 117 x 170 | 54% | 44 x 64 | 33 px (overlap capped) |
| 844 x 390 | landscape phone, drawer | 710 x 223 | side by side, 126 x 183 | 56% | 44 x 64 | 32 px |
| 768 x 1024 | portrait tablet, chat docked | 396 x 659 | stacked, 196 x 284 | 64% | 106 x 154 | 59 px |
| 1024 x 768 | portrait branch (`W' = 772 < 1.3 H`), chat docked | 648 x 466 | side by side, 274 x 397 | 60% | 79 x 115 | 59 px |
| 1366 x 768 | landscape, chat docked | 888 x 510 | side by side, 305 x 442 | 66% | 79 x 115 | 58 px |
| 1920 x 1080 | landscape, chat docked | 1340 x 737 | side by side, 462 x 669 | 68% | 112 x 162 | 82 px |

All rows meet SC-010 (7-card slice at least 40 px at 320 wide; no overlap or scroll) and SC-011 (piles and arrows at least 35% of the height). With no chat (a "Play with AI" room) the table region is
wider and the same rules give equal or larger piles. Every row is the output of the layout function in `useFit.ts` for 4 opponents and a 7-card hand; "slice" is the narrowest visible part of the first six cards
as hit-tested in the browser (`verification.md`, V9). The 768 x 1024, 1024 x 768 and 1366 x 768 rows were also re-measured with chat docked: the branch follows
`W' < 1.3 H`, not the screen's orientation, so 1024 x 768 with a 240 px chat column (`W' = 772`) uses the portrait layout with the UNO! row above the hand.

### Hand

A fan along an arc: `step = min(0.75 wc, (handWidth - wc) / (n - 1))` between card starts, rotation from `-18` to `+18` degrees across the fan (scaled down for few cards), a small vertical arc.
Hovering or pressing lifts the card by `0.14 hc` and scales it to 1.12 with the neighbours parting slightly. When `step < 28 px` the hand becomes horizontally scrollable inside its band, with the fan
kept. Cards the player may play are fully bright and slightly raised; others are dimmed to 55% brightness (still tappable so the bounce and reason play). After a draw of a playable card only that card is
bright and a **Keep** button appears in the UNO row. The hand is sorted by colour then value (Wild cards last).

### Centre area

- **Draw Pile**: a stack of card backs (up to 4 offset layers) with the remaining count; tapping it sends `drawCard` and glows when drawing is possible; when a penalty is pending it carries "Draw N".
- **Discard Pile**: the top card face up over 2 or 3 offset earlier cards, inside the **aura**: a glowing halo and ring in the active colour (`AURA_MS` ease), with the colour's name and glyph
  (red triangle, yellow circle, green square, blue diamond) printed on the ring so colour is never the only cue (FR-023, FR-029).
- **Arrow track**: a rounded track around both piles with three chevron arcs travelling clockwise or counter-clockwise (one full turn in about 6 s); the colour is bright gold-white so it reads
  against every aura. A Reverse swaps direction within `FLARE_MS` with a flash of the track (FR-034).
- **Pending badge**: "+N" in a glowing circle on the Discard Pile while a penalty is pending, with the kind ("Draw 2" or "Wild Draw 4") below it.
- **Banner strip**: transient messages ("Your turn", "UNO!", "Caught!", "Skipped!", "Match 2") over the centre, 900 ms each, one at a time; a polite live region repeats them.

### Controls

| Control | Where | States |
|---------|-------|--------|
| **UNO!** | Above the hand, right of centre in portrait; right end of the hand band in landscape; at least 56 x 44 px | Idle (dim gold) with other counts; **glowing and pulsing** with exactly 2 cards (ready) or while a catch window is open against me (urgent, faster pulse); pressed state when already called (FR-037) |
| **Draw Pile** | Centre | As above; also keyboard focusable |
| **Keep** | UNO row, left of centre | Visible only in phase `drawn` |
| **Catch [Name]!** | On the offending opponent's seat | Visible only for others while the window is open |
| **Leave** | Header | Opens a short confirmation ("Leave the match? You cannot rejoin") then calls `leaveRoom`; in an AI room it says the match will end |
| **Colour wheel** | Centre, modal | Four large wedges (red, yellow, green, blue) with glyphs and names, glowing edges, a centre cancel; chooses a colour or dismisses (card returns) |

### Chat (FR-046 to FR-048)

Online only. Docked (at least 700 by 540): a right column of `cw` width holding the platform chat panel, typed messages only. Otherwise a chat icon in the header opens a sheet that drops down
over the table (never over the hand while closed) with an unread count on the icon while closed; Escape or the icon closes it. In a "Play with AI" room nothing is mounted.

### Results overlay (FR-049, FR-050)

A panel over the table: winner name in a celebration (confetti unless reduced motion), the standings list (place, avatar, name, cards left or "Left"), and buttons: **Play again** (host in online
rooms, the human in solo rooms; disabled with a reason when fewer than 2 participants remain), **Back to Hub** (everyone). Non-hosts see "Waiting for the host to play again." The panel scrolls inside
itself and fits the viewport.

## 4. Visual language

Royal arcade: deep violet-navy backdrop (`#120a2a` to `#2a0f4d` gradient with a soft vignette), gold accent (`#ffcf3d`) for turns, buttons and ring highlights, and vivid card colours
(red `#ff3b4e`, yellow `#ffc928`, green `#26c76a`, blue `#2f80ff`) with white numerals and dark outlines for contrast. Card back: royal purple with a gold border and a slanted oval mark. Buttons
have glossy gradients, pressed (translate and darker shade), hover (lift and glow) and focus (2 px gold outline) states. Players' tag colours are orange, purple, teal, pink and lime (R13).

## 5. Motion

| Effect | Duration | Details |
|--------|----------|---------|
| Throw to the Discard Pile | 450 ms | Parabolic arc (peak `min(120 px, 0.35 x distance)`), slight rotation, 1.08 scale at the peak, soft landing shadow |
| Draw flight | 400 ms plus 110 ms per extra card | Pile to hand slot (face visible for the owner, back for others); hand re-fans over 200 ms |
| Opponent play and draw | same | Card back flies seat to pile and flips on landing; draws fly pile to seat |
| Invalid play | 320 ms bounce and 240 ms shake | Card snaps back with an overshoot; the table shakes by 3 px; a one-line reason appears under the hand |
| Aura change | 350 ms | Colour and glow ease; a soft ring pulse on Wild |
| Reverse | 600 ms | Track flashes, chevrons snap to the new direction and keep turning |
| Seat banners | 900 ms | "UNO!" (gold burst), "Caught!" (red shake), "Skipped!" (blue slash); banners, "Your turn" and "You draw N" notices and seat flashes render in a top layer (`TopLayer.tsx`, above the card-flight ghosts) so a flying card never covers them |
| Deal | about 1 400 ms | Cards fan into the hand, backs fly to seats, first card turns |

Effects play in server order from the event queue; a hidden tab or a queue longer than 6 skips to the newest state.

### Reduced motion

| Normal | With `prefers-reduced-motion` |
|--------|-------------------------------|
| Arc throw and flights | 150 ms fade and short slide, no arc |
| Table shake | None; the reason text and a 300 ms outline flash on the card |
| Turning arrows | Static ring with a direction badge ("Clockwise" or "Counter-clockwise" with a glyph) |
| Reverse flare | 300 ms outline flash and the badge changes |
| Confetti, pulses | Off; the winner is shown in plain text with a highlight |
| Banners | Kept (they are information) |

## 6. Accessibility

| Item | Requirement |
|------|-------------|
| Cards | `<button>` named by face ("Red 7", "Wild Draw Four"); `aria-disabled` for unplayable cards (still tappable); roving tab stop, Left and Right move, Enter or Space plays |
| Wheel | Modal radio group, focus trap, keys 1 to 4 choose red, yellow, green, blue, Escape cancels |
| Buttons | UNO!, Catch, Keep, Draw Pile, Leave, Play again are buttons with visible focus and accessible names ("Catch Blaze") |
| Announcements | Polite live region for turn changes, plays, draws, "UNO!", "Caught!" |
| Targets and text | At least 44 px for Catch, UNO!, Keep and the Draw Pile; text at least 11 px, which includes the corner numerals and the colour pips on card faces (the pip is the non-colour cue for a card's colour) |
| Colour | Card colour is paired with a glyph and a name wherever the active colour is shown |

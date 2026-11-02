# Contract: Housie Screens, Layout and Motion

Defines what each Housie screen contains, how regions are sized, and the motion and accessibility rules. Visual references:
[../mockups/player-view.png](../mockups/player-view.png) and [../mockups/host-view.png](../mockups/host-view.png) (illustrative; the
proportions and content are the contract, the exact art is not). Requirements: spec FR-009 to FR-037, SC-012.

## Screens

| Screen | When | Owner |
|--------|------|-------|
| Hub, room entry, invite, status screens | Always | Platform (unchanged) |
| **Housie lobby screen** | Room state `lobby` | Housie (via `getLobbyScreen`), using platform `InviteBar`, `PlayerList`, `ChatPanel` |
| **Housie match screen** | Room state `in_progress`, phase `running` | Housie (via `getMatchScreen`) |
| **Results overlay** | Phase `finished` | Housie |

## Lobby screen (one calm setup screen, FR-001 to FR-009, SC-001)

Landscape: two columns. Portrait: one column with the same order, chat as the peek drawer.

| Region | Host sees | Others see |
|--------|-----------|------------|
| Setup column (left, about 60 percent) | Compact rows: **Players** (number field with 10, 25, 50, 100, 200 presets), **Max tickets each** (1 to 4 segmented), **I also play** (toggle), **Calling** (Manual, 5s, 8s, 10s segmented), **Combinations** (chooser) | The same values, read-only, in a single summary strip, plus the combinations as read-only picture tiles |
| Combination chooser | 40 pattern picture tiles grouped (Early, Lines, Shapes, Numbers, House), tap to toggle, a group header toggle for each group, a counter "6 of 40" and a *Reset to defaults* link; pictures use `PatternPicture` | Read-only |
| My tickets | A segmented 1..ceiling control (only when the host plays) | A segmented 1..ceiling control |
| People column (right) | Invite bar, roster list with each person's ticket count chip (scrolls inside the column), Start button (disabled with the reason: no combination, nobody else seated) | Invite bar, roster, "Waiting for the host" |
| Chat | Platform chat dock (typed messages plus the platform's usual join and leave lines before the match starts) | Same |

The setup column never scrolls the page; the chooser region scrolls internally if the 40 tiles cannot fit at a 44 px tap size.
Changing the ceiling below someone's choice clamps it and shows a one-line notice to that person.

## Match screen: player (FR-032, FR-033, FR-034a)

```text
Landscape (width >= height and width >= 768)             Portrait / narrow
+------------------------------+-----------------+       +--------------------------------+
| header: room code, players, Quit/Lobby             |       | header (compact)               |
+------------------------------+-----------------+       +--------------------------------+
| TICKETS            (about 56 % of left height)     |       | CURRENT BALL (compact row)     |
|  stacked / 2x2 / tabs, big cells                   |       +--------------------------------+
|                              | CURRENT BALL (1/3)|       | TICKETS (stack / tabs)         |
+------------------------------+  ball + mini-grid +       +--------------------------------+
| WINNING COMBINATIONS         |-----------------|       | COMBINATIONS (tiles)           |
|  tiles (CLAIM / Claimed by)  | CHAT (2/3)        |       +--------------------------------+
|  "Claims use: Ticket #n"     | minimizable       |       | chat peek drawer (minimized bar|
+------------------------------+-----------------+       | with unread indicator)         |
```

Regions:

- **Header**: room code, player count ("37 / 200"), unobtrusive Quit (with confirmation) and Lobby (opens the platform lobby dialog),
  sound toggle. One line, compact.
- **Tickets**: see "Ticket fit" below. Each cell is a `<button aria-pressed>`; marked cells show the ink cross; empty cells are inert
  and visually hatched. The selected ticket has a gold outline and its tab is gold (`Claims use: Ticket #n` in the combinations header).
- **Combinations**: tiles per density tier (below). Each open tile: name and a gold CLAIM button; claimed tile: name and
  "Claimed by [name]" in the winner's color; locked (Full House 2nd/3rd) tile: disabled button "after 1st". Click or tap on the tile
  body (not the button), Enter or Space on the focused tile, opens the pattern illustration popover (FR-022a). A bogus claim shows
  "Bogus Claim" on that tile for about 2 seconds in red, local only.
- **Current ball** (one third of the right column): ball (diameter from region height) with the called count "Called n of 90", and the
  mini-grid of previously called numbers, newest first, as many chips as fit in the remaining area; a "View all" chip opens the 1 to 90 board
  as an on-demand overlay (every called number is reachable). On a new ball the ball rolls in; the previous number joins the front of the mini-grid.
- **Chat** (two thirds): platform `ChatPanel` inside `ChatDock`; header has a Minimize control; minimized is a slim bar with a chat
  icon, "Chat", and an unread pill (count of unread typed messages and wins). Minimized state is stored on the device.

## Match screen: host (FR-032, User Story 8)

Same grid; left top is the **Master board** (1 to 90 in a 10 x 9 grid; called numbers lit, the current ball gold), left bottom the
combinations (status tiles; CLAIM buttons only when the host plays), right top the **Caller console** (current ball, DRAW NEXT BALL, AUTO
segmented Off/5s/8s/10s, Pause/Resume, recent chips), right bottom the same chat dock. A playing host gets a segmented `Board | My Tickets`
control in the left top header; choosing My Tickets swaps the master board for the ticket area (with `Claims use` and CLAIM on tiles).
Caller controls remain visible on the right in both states. The host's screen also shows a thin ring on DRAW NEXT BALL that counts down
to the next automatic draw.

## Sizing rules (never scroll the page)

- The match screen root is `100dvh` with safe-area padding; regions are CSS grid cells with `min-height: 0` and `min-width: 0`.
- **Ticket fit**: for `n` tickets in a region `W x H`, a stacked layout gives cell width `w = (W - pad) / 9` and height `h = (H - gaps) / (3n)`;
  the cell is the smaller of the two (cells are roughly 1.9 : 1). Order of choice: stack all if cell width >= 32 px; else for `n >= 3`
  a 2 x 2 grid if cell width >= 32 px; else tabs (one ticket per view, `n` small tabs above it). Text size is 55 percent of cell height.
  Horizontal overhead per ticket is about 58 px (borders, padding, the 16 px side label, column gaps); in **compact** mode (tabs, or a
  single ticket) the side label is dropped and borders, padding and gaps shrink to about 18 px so 9 cells of 32 px fit a 320 px screen.
  Cells never exceed 110 px.
- **Tile density** by number of chosen combinations `k`: `k <= 9` large (name + button), `k <= 18` medium (name on one line, short
  button), `k <= 40` compact (abbreviated name, button as an icon-sized CLAIM; the full name is in a tooltip and the popover).
  Columns = largest count such that tile width >= 124 / 92 / 62 px respectively, with rows balanced (6 tiles become 3 + 3, not 5 + 1) and
  more columns added only when the height requires it. Tap target height is at least 40 px (44 in large). Short tiles at least 110 px wide
  use a **flat** layout (name left, CLAIM right); narrower tiles stack the name above the button. The tiles panel keeps at least 116 px of
  height in landscape and 168 px in portrait.
- **Ball**: diameter = min(region height x 0.7, region width x 0.4), at least 56 px; mini-grid chip size 22 to 30 px.
- **Master board**: cell size from the measured left top region; the board never exceeds the region.
- **Portrait**: the ball row is at most 14 percent of the height, tickets take the remaining space after tiles (tiles at most 30 percent).
- Resizing or rotating re-fits within 0.5 s; state is unchanged by rotation.

## Look and motion (FR-035, FR-036)

| Element | Style | Motion |
|---------|-------|--------|
| Background | Deep midnight gradient, soft radial glow | A very slow ambient shimmer (disabled with reduced motion) |
| Panels | Dark navy with a thin gold edge | None |
| Tickets | Warm paper with gold edge; numbers bold dark brown; ink crosses red or blue felt-tip | Ink stamp: draw 120 ms with a tiny scale pop and a soft sound |
| Ball | Glossy white sphere with specular highlight and ground shadow, bold number in a white disc | Roll-in 1.1 s with rotation and settle, then a soft glow pulse |
| Tiles | Navy with gold CLAIM button; claimed tiles dimmed gold with the winner's color name | Claim celebration: gold sweep plus confetti sparks on the tile for 1.2 s (everyone) |
| Ink toggling off | Cross fades out (80 ms) | |
| Reduced motion | The ball fades in 150 ms; crosses appear instantly; the celebration is a 1 s gold outline | All other animations off |

Effects occur only on ball reveals, ink stamps, claim wins and the results screen; nothing else animates except the ambient glow and the
active-ball glow (spec User Story 7, scenario 4).

## Accessibility and input

- All interactive elements are native buttons or inputs with visible hover, pressed and keyboard-focus states; touch, pointer and
  keyboard all work. Ticket cells: Tab to enter the ticket, arrow keys move between cells, Enter or Space toggles the cross.
- A visually hidden live region announces each new ball ("Ball 42") and each accepted claim ("Maya won Top Line").
- Text contrast follows the Ludo audit (at least 4.5:1 for normal text, 3:1 for large numbers); player colors always appear with a
  name, never as the only cue.
- The popover is a dialog: focus moves in, Escape closes, focus returns to the tile.

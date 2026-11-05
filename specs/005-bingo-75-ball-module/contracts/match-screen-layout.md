# Contract: Bingo Screens, Layout and Motion

Defines what each Bingo screen contains, how regions are sized, and the motion and accessibility rules. No mockups were supplied (spec Assumptions); the
proportions and content below are the contract. Requirements: spec FR-033 to FR-039, FR-013 to FR-015, SC-011 to SC-014. Housie's layout contract
([../../003-housie-tambola-module/contracts/match-screen-layout.md](../../003-housie-tambola-module/contracts/match-screen-layout.md)) is the model.

## Screens

| Screen | When | Owner |
|--------|------|-------|
| Hub, room entry, invite, status screens | Always | Platform (unchanged) |
| **Bingo lobby screen** | Room state `lobby` | Bingo (via `getLobbyScreen`), using platform `InviteBar`, `PlayerList`, `ChatPanel` |
| **Bingo match screen** | Room state `in_progress`, phase `running` | Bingo (via `getMatchScreen`) |
| **Results overlay** | Phase `finished` | Bingo |

## Look

High-contrast royal arcade: deep midnight and royal-blue backgrounds, gold accents, white text on dark panels. Each letter column has its own vivid color
(B blue, I red, N white or silver, G green, O gold-orange; exact values are tokens in the stylesheet) used on the card header cells, the ball and the
master board. The dauber is a translucent neon highlighter in the letter's color. The scope class is `.bz` so nothing touches other games.

## Lobby screen (FR-001 to FR-006, FR-009, SC-001)

Landscape: two columns. Portrait: one column in the same order, chat as the drawer.

| Region | Host sees | Others see |
|--------|-----------|------------|
| Setup column (left, about 60 percent) | Compact rows: **Players** (number field with 10, 25, 50, 100, 200 presets), **Max cards each** (1 to 3 segmented), **I also play** (toggle), **Calling** (Manual, 5s, 8s, 10s segmented), **Patterns** (chooser) | The same values read-only in one summary strip, plus the chosen patterns as read-only picture tiles |
| Pattern chooser | Nine picture tiles in two groups (Standard 5, Custom/Thematic 4); tap to toggle; a group header toggle for each group; a counter "3 of 9" and a *Reset to defaults* link; pictures use `PatternPicture` | Read-only |
| My cards | A segmented 1..ceiling control (host only when `hostPlays`) | A segmented 1..ceiling control |
| People column (right) | Invite bar, roster with each person's card-count chip (scrolls inside), Start (disabled with the reason: no pattern, nobody else seated) | Invite bar, roster, "Waiting for the host" |
| Chat | Platform chat (typed messages plus the usual join and leave lines before the match) | Same |

The lobby never scrolls the page. A reduced ceiling clamps choices and shows a one-line notice to the affected person.

## Match screen: player (FR-033, FR-034, FR-036)

```text
Landscape (min-width 720 px and aspect >= 5:4)             Portrait / narrow
+------------------------------+-----------------+         +--------------------------------+
| header: BINGO, room code, players, Quit / Lobby  |         | header (compact)               |
+------------------------------+-----------------+         +--------------------------------+
| CARDS                (about 60 % of left height) |         | CURRENT BALL  G-54 + history   |
|  B I N G O headers, 5 x 5 cells, FREE hint       |         +--------------------------------+
|                              | CURRENT BALL (1/3)|         | CARDS (stack / row / tabs)     |
+------------------------------+  3D ball + history+         +--------------------------------+
| PATTERNS  [Available/Claimed] [ BINGO! ]         |         | PATTERNS tiles + BINGO! bar    |
|  mini picture + name + badge |-----------------|         +--------------------------------+
|                              | CHAT (2/3)        |         (chat opens from a header button)
+------------------------------+-----------------+
```

Regions:

- **Header**: "BINGO", room code, player count ("37 / 200"), Quit (with confirmation) and Lobby (opens the room lobby dialog, `LobbyDialog`), sound toggle. One line.
  On narrow and short screens it also holds the chat button (a 40 px icon with the unread pill), so the chat takes no permanent row.
- **Cards**: see "Card fit". Each number cell is a `<button aria-pressed>`; a daubed cell shows the dauber over a still-readable number. The center cell reads
  "FREE" and is drawn marked (the same dauber) from the start; it stays a focusable cell for arrow-key movement but is marked `aria-disabled`, shows the default cursor, has no
  hover or pressed state and ignores taps, Enter and Space. The selected card has a gold outline; with several cards the strip names it (the selected tab reads "Card 2 of 3", the others "Card 1" and "Card 3" so three tabs fit 320 px).
- **No FREE tooltip**: nothing is shown over the FREE cell. (An earlier design put a pulsing "Tap to claim your FREE space!" callout there; it looked like a button but passed
  taps through to the neighbouring numbers, so on 2026-11-05 the FREE cell became marked by default.)
- **Pattern dashboard**: one tile per host-chosen pattern (nothing else): a mini 5 by 5 picture, the name, and a badge "Available" (green) or "Claimed"
  with the winner's name (the winner's color). The prominent glowing **BINGO!** button sits at the end of the dashboard header (wide) or as a full-width bar
  (narrow); with several cards it reads "BINGO! - Card 2". While the player's claims are paused the button is disabled and shows "Claims paused 0:42". A bogus claim
  shows "Bogus Bingo" on the button area for about 2 s (local only); a too-late claim shows "Too late - already claimed" briefly.
- **Current ball** (one third of the right column): the 3D sphere showing the letter above the number ("G-54"), "Called n of 75", and the history grid of
  previously called balls (newest first, small colored chips like "B-7") as many as fit, plus a "View all" chip opening the full 5 by 15 board as an
  on-demand overlay.
- **Chat** (two thirds): the platform `ChatPanel` with only typed messages; no controls beyond the platform's own composer. On narrow screens it lives in a
  drawer: the header's chat button (an icon with an unread pill while closed) drops a chat sheet down under the header; Escape or the button closes it.

## Match screen: host (FR-033, User Story 8)

Same grid. Left top is the **master board** (five B-I-N-G-O columns of 15 numbers; called numbers lit in their letter color, the current ball gold). Left
bottom is the pattern dashboard (status tiles; a BINGO! button only when the host plays). Right top is the **caller console** (current ball, DRAW NEXT
BALL, AUTO Off/5s/8s/10s, Pause/Resume, recent chips, a thin ring on DRAW counting down to the next automatic draw). Right bottom is the chat. A playing
host gets a `Board | My Cards` segmented control in the left top header; My Cards swaps the master board for the card area. Caller controls stay visible in both
states. A non-playing host never sees cards or BINGO!.

## Results overlay (FR-030)

Over the dimmed match screen: a list of patterns with the winner's name and color or "No winner", and "Called n of 75". Everyone sees **Leave**; the host also
sees **New round** (returns everyone to the lobby with default settings).

## Sizing rules (never scroll the page)

- The match root is `100dvh` with safe-area padding; regions are CSS grid cells with `min-height: 0` and `min-width: 0`; `useRegionSize` measures each
  region with one `ResizeObserver`; every layout re-fits within 0.5 s of a resize or rotation.
- **Card fit** (`planCards(width, height, count)`): a card is 5 columns by 6 rows (header plus 5), with a small gap and padding. For `n` cards the planner
  computes the cell size for **stack** (`n` rows), **row** (`n` columns, tried for `n = 2` when the region is wide) and **tabs** (one card in the region
  below a 30 px tab strip). Cells are square while width is the limit and become **rectangular** when height is the limit (`cellW` up to 1.5 x `cellH`),
  so cells stay at least 40 px across (FR-035) with a height of at least about 28 px; the layout with the largest valid cell wins. Tabs are the fallback and
  also win when their cell is at least 1.5 times taller than the best stack or row cell (for example 3 cards on a tablet in portrait).
  Cell text scales with the smaller side and is never below 14 px where the cell allows. There is no fixed upper cell size: cards grow until the region or the 1.5 : 1 limit stops them (Constitution II).
- **Short landscape** (a phone on its side: `max-height: 520px`, aspect ratio at least 5:4, width at least 560 px): two columns, the cards (or the host's board)
  full height on the left, the compact ball or caller console over the pattern dashboard on the right, and the chat as the narrow-screen drawer.
  A host who plays gets a shorter caller console while viewing My Cards so the cards keep their height.
- **Dashboard fit** (`planPatterns(width, height, count)`): columns come from the measured width (a tile is at least 140 px wide on wide and short screens, 144 px on
  narrow ones so "Available" and names never clip); rows balance the count (5 tiles on a wide area become 3 + 2, not 5 + 1); tile height is at most 78 px and at
  least the 40 px tap size. If a very small region still cannot fit, only the tile grid scrolls.
- **Ball console**: ball diameter from the region height (largest that leaves room for the count and one row of history chips, with no fixed maximum); history chips
  are 34 px high and grow to a tenth of the console height on tall consoles; the chips fill the
  remaining area.
- **Master board**: five columns by 15 rows by default; when row height would drop below 18 px and width allows, the same board is drawn rotated (five
  rows by 15 columns) so numbers stay at least 11 px (the fallback FR-022 allows).
- Text is never smaller than 11 px; tap targets are at least 40 px; compactness never reduces card cells below 40 px (FR-036).
- 320 to 2560 px wide, portrait and landscape, with safe-area insets: no page scroll, no overlap, no clipped controls.

## Motion

| Effect | Trigger | Normal | Reduced motion |
|--------|---------|--------|----------------|
| Ball reveal | `ball` event | 1.1 s roll-in with rotation, settle, glow pulse; a newer ball interrupts it | 150 ms fade |
| Dauber stamp | Daub on | 140 ms scale 1.7 to 1 with a small rotation and ring | Instant translucent dauber |
| Claim celebration | `claimed` event | About 1.2 s gold burst on every awarded tile and the BINGO! area, plus the win chime | 1 s gold outline on the tiles |
| Quiet state | No draw, no claim | Subtle ambient background, ball glow, BINGO! button glow | The same, without animation |

Sounds reuse `sfx.ballRoll`, `sfx.stamp`, `sfx.winChime` and `sfx.error` and respect the mute toggle.

## Accessibility

- Every number cell, tile, button and tab is a native control with a visible focus ring, hover and pressed states; Enter and Space toggle a number cell exactly as a
  tap (FR-038). The FREE cell is announced as "FREE", pressed and disabled.
- Card cells have accessible names ("B 7", "FREE") and `aria-pressed` for daubed state; arrow keys move between cells within a card.
- The ball has an accessible name ("Ball G 54"); badges and the claim result use text, not color alone; the chat region and drawer are labeled landmarks.
- Contrast between text and backgrounds meets WCAG AA for normal text.

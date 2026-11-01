# Contract: Match Screen, Layout, and Animation

The Ludo match screen replaces the generic room layout while a match is in progress. It reuses the platform's lobby, invite, chat, modal,
connection banner, and status components; it owns the board, dice console, player bubbles, activity log, and the layout rules below.
Requirements: FR-001 to FR-010, FR-040 to FR-043. Decisions: [research.md](../research.md) R7 to R9, R14.

## Regions and responsibilities

| Region | Content | Owner |
|--------|---------|-------|
| Header | Hub brand, room name and code, invite link + copy, player avatars, "Lobby", "Quit" | Ludo screen (reuses platform copy and lobby components) |
| Chat dock (landscape, under the dice and bubbles) / peek drawer (portrait) | Tabs: Chat (platform `ChatPanel`), Activity (`ActivityLog`); the dock has a Minimize / Open bar | Shared container; chat from platform |
| Board | 15 x 15 grid, bases, ring, lanes, safe stars, arrows, HOME, pawns overlay | Ludo |
| Dice console | "DICE ROLL" title, whose turn, countdown, rounded-edge 3D die, ROLL DICE, message line | Ludo |
| Player bubbles | One circular bubble per seated player: avatar in a colour ring, name, host crown, "n/4" home badge, connection text, active glow | Ludo (connection from platform `room:state`) |
| Overlays | Lobby dialog, Quit confirmation, results screen, "Away" warning | Ludo using platform `Modal` |

## Layout modes

| Mode | When | Arrangement |
|------|------|-------------|
| `landscape` | `(orientation: landscape)` and width >= 560 px | Header over two columns: `[board | dice, player bubbles, chat dock]` |
| `portrait` | otherwise | Header, board, dice section, player bubbles, peek drawer (fixed to the bottom) |
| compact | height <= 520 px in landscape | Dice console becomes a single row, bubbles shrink, the chat dock starts minimized |
| portrait-compact | portrait and viewport height < 700 px | Dice console becomes a single row (die, countdown, ROLL DICE, one-line turn text); bubbles shrink to one row; header is one line; drawer handle stays about 56 px |

Rules:

1. **No page scroll** in either mode; the match screen is exactly the viewport height (`100dvh`) with safe-area padding.
2. **Board size** `side` (CSS pixels, an integer) is the largest square that fits its region:
   - landscape: `min(regionWidth, regionHeight)`; the region is whatever the grid gives after the right column;
   - portrait: `min(containerWidth, 0.85 * viewportHeight, viewportHeight - chromeHeight)`, where `chromeHeight` is the measured height of
     the header, dice section, player bubbles, drawer handle, and safe-area insets in the current (normal or portrait-compact) tier, so the
     stack never exceeds `100dvh`.
   The board is `width = height = side` with `aspect-ratio: 1 / 1`, so it is always square. A `ResizeObserver` recomputes `side` on resize,
   rotation, and when the chat dock is minimized or opened (re-fit within 0.5 s).
3. **Scaling**: all board-internal sizes (pawn size, hop height, label font, puff size) derive from one CSS variable `--cell = side / 15`.
4. **Chat dock** (landscape): sits under the dice console and player bubbles in the right column (width `clamp(336px, 28vw, 430px)`) and
   takes the remaining height; a bar with Minimize / Open and an unread badge toggles it; the state persists per device.
5. **Peek drawer** (portrait): collapsed handle about 56 px with an unread badge for chat; expanded about 58% of the viewport height; keeps
   half-typed text and scroll position when collapsed.
6. **Die size**: edge `clamp(96px, 11vmin, 168px)` on desktop-sized screens, `clamp(80px, 11vw, 112px)` in portrait, 72 to 112 px on phones
   (64 px in the compact tiers). The die is a rounded-edge cube (each face is three stacked, progressively smaller rounded slabs) and each
   tumble travels across the tray in a random direction with decaying bounces.
7. **Pawn tap target**: at least 40 px square (invisible padding around the visible pawn); eligible pawns take hit priority.
8. **Safe areas** are respected on all sides; the drawer sits above the bottom inset.

## Visual specification (summary)

- Quadrant colours (high saturation): Yellow `#ffcc1a`, Green `#1fcf6a`, Blue `#2f8cff`, Red `#ff3b4f`, with lighter tints for lanes; track
  squares white with thin dividers; star squares carry a star; start squares carry the colour and an arrow along the direction of travel;
  each lane has an arrow toward HOME; the centre says "HOME".
- Corner labels use the slot ("P1", "P2", ...) and the colour, with a "(Host)" tag on the current host's corner (it moves on host handover);
  only the seated players' corners are lit, unused corners are dimmed.
- Pawns: glossy sphere on a tapered body with a coloured gradient, specular highlight, rim light, and a soft ground shadow. Eligible pawns
  pulse (scale and glow). The die: white ivory cube, rounded edges, dark pips, soft inner shading, drop shadow on a dark felt tray.
- Active turn: the active player's bubble ring glows in their colour; on the roller's own screen a golden border flashes around the roll target
  and a bouncy "Your Turn to Roll!" tooltip appears; for others the console is translucent and non-interactive.

## Animation timings (see also data-model.md)

| Effect | Duration | Notes |
|--------|----------|-------|
| Die tumble | 1400 ms | 3 decaying bounces, spin on three axes, blur 0 to 3 px and back, shake on landings, shadow scaling |
| Hop | 340 ms per square | Parabolic arc about 0.9 cell high; squash on take-off and landing; dust puff 450 ms |
| Capture | 900 ms | Opponent pawn arcs back to its base spot with a burst |
| Home arrival | 600 ms | Celebration sparkle on the HOME centre |
| Turn handoff | 500 ms | Bubble glow moves, console updates |
| Reduced motion | 120 ms steps | Linear step per square, landing highlight, fade for capture, no shake or blur |

## Accessibility

- Die, ROLL DICE, and eligible pawns are `button`s with accessible names; ineligible pawns are not focusable. Spacebar rolls only when it
  is the player's turn and no input, textarea, or modal has focus.
- A polite live region announces: whose turn it is, roll results, "no move", captures, pawns home, warnings, and the winner.
- Focus rings, hover, and pressed states reuse the platform's control styles; colour is never the only signal (every pawn has a number
  badge on demand and every corner has its P-label).

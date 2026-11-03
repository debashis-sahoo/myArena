# Feature Specification: Ludo Pawn Sync, Glossy Dice, Housie Phone Readability and Share Text

**Feature Branch**: `004-ludo-housie-polish-updates`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Updates in Ludo: while playing Ludo as host and player with an online friend, one of my pawns behaved differently on my friend's screen: it got stuck on a box and did not move like it did on my screen (1 of 4 pawns). Identify and fix the pawn alignment issues between screens. In Ludo, the dice corners could be more circular and the overall dice color could be glossy white. Updates in Housie: attached is a screenshot while playing Housie on a phone; the winning combination titles cannot be seen at all. Make the display optimized and visible for all surfaces, reduce the font size as needed, and do not compromise on the ticket size. Core platform: when sharing the link it says 'myArena Hub - Play Ludo with friends in private room'; instead make it say 'Play interactive games with your Friends and Family'."

## Clarifications

### Session 2026-11-02

- Q: How should a phone show tile titles when many combinations are chosen? → A: Show the full title wrapped onto two lines and shrunk down to 10 px; only if it still does not fit, switch to a short recognizable name (for example "Early 5", "4 Corners"). The full name always shows in the popover.
- Q: What was happening just before the pawn got stuck on the friend's screen? → A: Not remembered; no known trigger, so the investigation must cover every situation that could cause it (rapid moves, captures, stacked pawns, hidden tab, reconnect, slow device).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every Player Sees the Same Pawns in the Same Places (Priority: P1)

Players in an online Ludo match, host and guests alike, always see every pawn on the same square. If the server says a pawn moved
from square A to square B, every screen shows that pawn on B when the move finishes, whether the player was watching, had the tab in
the background for a moment, briefly lost connection, or was on a slow device. A pawn must never be left sitting on an old square on
one screen while the other screens show it elsewhere. If a screen ever falls out of step, it corrects itself without the player
doing anything.

**Why this priority**: A pawn that appears stuck on a friend's screen breaks trust in the game and makes the match unplayable for that
person; it affects the core of the first game on the Hub.

**Independent Test**: Play a full online match with two or more screens (including one that is minimized or throttled for part of the
match and one that reconnects mid-match), and compare the pawn positions on every screen after every move.

**Acceptance Scenarios**:

1. **Given** an online match with two or more screens, **When** any pawn finishes a move (including captures, bonus rolls, entering the
   home lane, and reaching HOME), **Then** that pawn is on the same square on every screen within 1 second of the move finishing.
2. **Given** several moves happen in quick succession (for example a six followed by a bonus roll, or a bot moving immediately after a
   capture), **When** a screen is still animating an earlier move, **Then** it still ends with every pawn on the correct square, and no
   pawn stays on an earlier square.
3. **Given** a player's tab was hidden, the device slept briefly, or the connection dropped and returned, **When** the player comes
   back to the match, **Then** all pawns are on their correct squares at once, with no pawn stuck or missing.
4. **Given** two or more pawns of any colors share a square (stacked), **When** one of them moves away, **Then** the remaining pawns
   stay on that square and the moved pawn is shown on its new square on every screen.
5. **Given** a pawn is the only legal choice or the player taps it, **When** the move is accepted, **Then** the same pawn moves on
   every screen, and never a different pawn or a pawn that cannot move.
6. **Given** any screen shows a position that differs from the server's, **When** the difference lasts more than 2 seconds, **Then**
   the screen corrects itself automatically to the server's position without a page refresh.

---

### User Story 2 - Housie Combination Titles Are Readable on Every Screen (Priority: P1)

On a phone, the Winning Combinations area shows the full title of every combination (for example "Early Five", "Top Line", "Four
Corners", "Full House 1st") next to its CLAIM button, so players can tell what they are claiming without tapping. Text sizes are
reduced as needed to make the titles fit, and long titles may wrap to a second line or be shortened in a way that stays recognizable.
Tickets are never made smaller to make room: the ticket cells keep at least the sizes they have today on every screen.

**Why this priority**: In the reported screenshot the titles show only as "E...", "T...", "M...", so players cannot tell which
combination each button claims; claims are the only part of Housie with real stakes.

**Independent Test**: Open a Housie match on phones of several sizes (portrait and landscape), a tablet, and a desktop, with 6, 12,
and up to 40 combinations chosen, as player and as host, and check that every combination can be identified at a glance while the
tickets are no smaller than before.

**Acceptance Scenarios**:

1. **Given** a phone in portrait showing the combinations area with the default six combinations, **When** I look at the tiles,
   **Then** I can read the full title of each combination without tapping.
2. **Given** a combination whose title is long, **When** the tile is narrow, **Then** the title wraps to two lines or uses a short
   recognizable form, and is never cut to one or two letters followed by dots.
3. **Given** more combinations are chosen (12, then up to 40), **When** the area gets crowded, **Then** the text size and tile layout
   adapt so every combination is still identifiable on screen, and tapping a tile still shows its full title and picture.
4. **Given** the combinations area is made more compact, **When** I compare my tickets with how they looked before this change,
   **Then** the ticket cells are the same size or larger on every screen size, and never below 32 px.
5. **Given** the host's screen (board, caller console, and combinations) on a phone, **When** the match is running, **Then** the
   combination titles are readable there too, without the board or caller controls losing their controls.
6. **Given** a tile is claimed by a player, **When** it shows "Claimed by [name]", **Then** the combination title is still visible with it.

---

### User Story 3 - A Rounder, Glossy White Ludo Die (Priority: P2)

The Ludo die looks like a glossy white die: a bright white body with a soft shine, with clearly rounder corners and edges than today,
while the pips stay dark and easy to read. The die still tumbles, settles, and shows the same result on every screen.

**Why this priority**: It is a visual improvement requested by the owner; it does not change how the game plays.

**Independent Test**: Roll the die several times on desktop and phone and compare it with the previous look: corners rounder, body
glossy white, pips readable on every face.

**Acceptance Scenarios**:

1. **Given** the die at rest, **When** I look at it, **Then** the body is glossy white (a soft highlight, no flat grey or coloured body)
   and the pips are dark and easy to read on all six faces.
2. **Given** the die at rest, **When** I compare its corners with the previous look, **Then** the corners and edges are clearly more
   rounded, so it looks like a soft, circular-cornered die.
3. **Given** the die is tumbling, **When** it spins and lands, **Then** the rounded, glossy look is kept through the whole roll, the
   result is the same as before on every screen, and the roll animation timing is unchanged.
4. **Given** reduced motion is on or the screen is small, **When** the die is shown, **Then** it is still glossy white and readable.

---

### User Story 4 - A Friendlier Description When the Link Is Shared (Priority: P3)

When someone shares a myArena link (the Hub or a room invite) in a chat or on social media, the preview shows the title "myArena Hub"
and the description "Play interactive games with your Friends and Family" instead of the old text about playing Ludo in a private room.

**Why this priority**: It affects first impressions and growth, and is not game-specific; it is a small text change.

**Independent Test**: Share the Hub link and a room invite link into a messaging app or a link-preview checker and confirm the new
description appears.

**Acceptance Scenarios**:

1. **Given** the Hub link is shared, **When** a preview is shown, **Then** the title is "myArena Hub" and the description reads "Play
   interactive games with your Friends and Family".
2. **Given** a room invite link is shared, **When** a preview is shown, **Then** it shows the same title and description (no Ludo-only wording).
3. **Given** the page is opened in a browser, **When** its title and description are inspected, **Then** they match the shared wording.

---

### Edge Cases

- A pawn move arrives while the receiving screen is still animating the previous move, or after the tab has been in the background for
  many seconds: the final positions must be correct, even if intermediate hops are skipped.
- A pawn is captured and sent back to base while another pawn is moving onto the same square: both screens must show the same result.
- Two pawns of the same color stand on the same square and one moves: the other stays; the screens agree on which one moved.
- A guest joins or reconnects in the middle of a match: they see all pawns in their current positions straight away.
- A player on a very slow device or with a flaky connection falls behind: the screen catches up to the server's positions automatically.
- Combination titles in other languages or longer future titles: the layout wraps or shortens them without hiding the CLAIM button.
- A phone in landscape with a short height: titles and buttons remain readable and tappable (at least 40 px tap height) and tickets keep
  their size.
- The shared description appears in places other than link previews (for example browser tab descriptions): all use the same wording.
- A bot's quick consecutive moves are shown in the same order on every screen.

## Requirements *(mandatory)*

### Functional Requirements

**Ludo pawn consistency**

- **FR-001**: Every screen in an online Ludo match MUST show each pawn on the square the server has recorded for it once that move has
  finished animating, within 1 second of the move finishing.
- **FR-002**: No pawn MAY remain displayed on a square other than its recorded square for longer than 2 seconds on any screen,
  regardless of animation timing, hidden tabs, slow devices, or reconnects.
- **FR-003**: When a screen detects that it is behind or out of step (a missed or late update, a returning tab, a reconnect), it MUST
  correct all pawns to the recorded positions automatically, without a page refresh and without replaying a long backlog of moves.
- **FR-004**: A move MUST be displayed as the same pawn moving to the same destination on every screen, including captures, bonus
  rolls, home-lane entries and HOME arrivals, and including pawns that share a square with others.
- **FR-005**: Stacked pawns (several on one square) MUST be drawn so that each pawn's square is unambiguous and consistent across
  screens, and a pawn that leaves a stack MUST not leave a ghost or leave another pawn displaced.
- **FR-006**: The cause of the reported stuck pawn MUST be identified and recorded in the verification notes, together with the
  situations (move sequence, screen state) that reproduce it, so the fix can be proven against it. Because no trigger was remembered,
  the investigation MUST try, at minimum: rapid consecutive moves, captures, bonus rolls, stacked pawns, a hidden or throttled tab,
  a reconnect, and a slow device, each with two or more screens, and prove the fix against every one that shows a difference.
- **FR-007**: The fix MUST NOT change the rules, dice results, turn order, timing of rolls, or the animation speed of normal moves.

**Ludo dice look**

- **FR-008**: The die body MUST be glossy white (bright white with a soft highlight and gentle shading) on all faces and in every
  state (idle, hovered, tumbling, settled, disabled), with dark, high-contrast pips.
- **FR-009**: The die's corners and edges MUST be clearly more rounded than the current look, so that corners read as soft and
  circular.
- **FR-010**: The die's size, tumble animation, timing, controls (tap, spacebar, button), and displayed result MUST remain unchanged,
  and the die MUST remain readable under reduced motion and on small screens.

**Housie combination titles on all screens**

- **FR-011**: Every combination tile in Housie (player and host views) MUST show a readable title that identifies the combination
  without tapping, on every supported screen from 320 to 2560 px wide, in both orientations.
- **FR-012**: A title MUST NOT be reduced to a few characters followed by an ellipsis (an ellipsis may exist only as an unreached safety net). When space is short the title MUST first wrap onto
  two lines and shrink (down to the 10 px floor in FR-013); only if it still does not fit MUST it switch to a short recognizable name.
- **FR-013**: Combination titles MAY use text down to 10 px when needed (this relaxes the 11 px floor for these titles only);
  everything else keeps its current minimum size.
- **FR-014**: The combinations area MUST keep every tile's CLAIM button (or status) visible and tappable (a hit area at least 40 px
  tall, which may be larger than the button's drawn size) and MUST keep the "Claims use: Ticket #n" indicator, while showing the title.
- **FR-015**: Ticket cells MUST NOT be smaller than they are today at any screen size, and MUST remain at least 32 px; space for
  titles MUST come from the combinations area, not from the tickets.
- **FR-016**: A claimed tile MUST show both the combination title and "Claimed by [name]".
- **FR-017**: For up to 12 chosen combinations the full title MUST be visible on every phone whenever it fits in two lines at 10 px
  (otherwise the recognizable short form is shown, per FR-012); for up to 40, every tile MUST remain
  identifiable (at least a recognizable short form) with the full title shown in the popover on tap.
- **FR-018**: The page MUST still not scroll, and the combinations area, tickets, ball console and chat MUST keep fitting the screen.

**Shared link wording (Core Platform)**

- **FR-019**: The description shown when a myArena link is shared, and in the page's description for search and social previews, MUST
  read "Play interactive games with your Friends and Family" and MUST NOT mention Ludo or private rooms.
- **FR-020**: The title shown in link previews MUST remain "myArena Hub".
- **FR-021**: Room invite links MUST show the same title and description as the Hub link.

### Key Entities *(include if feature involves data)*

- **Pawn position**: where the game has recorded one pawn (base, ring square, home lane square, or HOME), and what each screen shows
  for it; the two must always agree after a move finishes.
- **Combination tile**: a Housie winning combination shown with its title, status (open, locked, claimed) and CLAIM button.
- **Share description**: the short text that describes myArena when a link to it is previewed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 20 consecutive scripted or played online Ludo matches with two or more screens (including one backgrounded and one
  reconnecting mid-match), 100 percent of pawns are on the recorded square on every screen after every move, with no stuck pawn.
- **SC-002**: After any move, every screen shows the recorded position within 1 second, and any divergence is corrected within 2 seconds
  without a refresh, in 100 percent of observed cases.
- **SC-003**: The reproduction of the reported stuck-pawn case (identified per FR-006) no longer shows a difference between screens in
  10 of 10 repeats.
- **SC-004**: On phones from 320 to 430 px wide in portrait, and 568 to 932 px wide in landscape, 100 percent of combination tiles show a
  title that identifies them with the default six combinations, with no title cut to one or two letters.
- **SC-005**: With 12 and with 40 chosen combinations, every tile on every tested screen remains identifiable and tappable, and the
  page never scrolls.
- **SC-006**: Ticket cell sizes are equal to or larger than the sizes measured before this change at every tested screen size, and never
  below 32 px.
- **SC-007**: In a side-by-side review with the previous die, 100 percent of reviewers describe the new die as glossy white with rounder
  corners, and the pips are readable on all six faces on desktop and phone.
- **SC-008**: Sharing the Hub link and a room invite link into at least two link-preview tools or messaging apps shows "myArena Hub" and
  "Play interactive games with your Friends and Family" in 100 percent of the previews that display a description.

## Assumptions

- The reported stuck pawn is a display disagreement between screens, not a rule or server decision problem: the recorded game state
  is treated as the truth and screens must follow it. The exact cause is to be found during planning and recorded (FR-006).
- "Corrects itself" means a screen may jump to the recorded positions (skipping intermediate hops) when it is behind; normal moves
  keep their current hop animation.
- The Ludo die keeps its current size, pips and animation; only the body color, gloss and corner roundness change.
- The "Housie titles" issue applies to every screen size; phones in portrait are the worst case and the main acceptance device.
- Short forms for crowded tiles are chosen from the catalogue names (for example "Early 5", "Top Line", "4 Corners"); the full title
  always appears in the popover.
- Only the share/preview description and the page description change for the platform; other in-app wording (such as game card
  taglines on the Hub) is unchanged unless it is the same shared description.
- No new game rules, scoring, or settings are added; this is a quality and polish update to existing games and the Hub.
- All of this is verified by playing in a browser with two or more screens; no automated test suites are added (constitution
  Principle III), and everything stays on the existing Render deployment.
- Out of scope: new Ludo animations, redesigning the Housie screen, changing ticket layouts, and per-game share images.

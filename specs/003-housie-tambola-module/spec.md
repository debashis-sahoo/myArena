# Feature Specification: Housie (Tambola) Visual-First Game Module

**Feature Branch**: `003-housie-tambola-module`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Prioritize awesome visuals and effects. Optimize the screen to avoid noise and keep it simple. Housie (Tambola) Visual-First Game Module, built on the Platform Core room and chat engine and hosted on Render with server-authoritative state. Royal arcade look, maximum viewport scaling, manual player interactions, no automated test dependencies. Scope: (1) Room configuration: the host sets the maximum tickets per participant (up to 4) and the maximum players in the room; each player picks how many tickets to play (default 1) within that limit; the server generates valid, unique 3x9 Tambola tickets (column ranges 1-9, 10-19, ... 80-90; 5 numbers per row). (2) Two-column screen: left column has the player's ticket(s) on top, played by manual dabbing only (numbers are never auto-marked; tapping toggles a tactile ink cross) and a compact grid of the host's chosen winning combinations below with live Available / Claimed-by status and a prominent CLAIM WIN button; right column has a Current Ball console on top (one third: a large glossy 3D white ball plus a compact mini-grid of previously called numbers) and player-only game chat below (two thirds: no automated logs or bot announcements). (3) Host dashboard: choose from 40 common winning patterns before the match (Early Five, Top/Middle/Bottom Line, Four Corners, Star, Pyramid, Full House 1/2/3 and more), a real-time master 1-90 board, manual 'Draw Next Ball' or automatic calling every 5, 8 or 10 seconds, and instant server validation of claims (valid claims show 'Claimed' room-wide; invalid ones show a local 'Bogus Claim' notice). (4) Manual verification: host sets 4 tickets max and a player toggles 1 to 4; a called ball never auto-marks; tapping applies the ink cross; previous numbers fill the mini-grid; chat shows only typed player messages and can be minimized with an unread indicator; a valid CLAIM WIN flips the pattern to Claimed on every screen. Sample images of a player view and a host view were supplied as style references."

## Clarifications

### Session 2026-11-02

- Q: Should Full House 2nd and 3rd stay locked until the previous Full House is claimed? → A: Yes. They are claimable in order only, and one ticket can win at most one Full House.
- Q: If every ticket holder leaves mid-match, should the match end right away? → A: Yes. It ends at once with the results screen (won combinations stay won, the rest "No winner"), and the host can start a new round.
- Q: Should repeated bogus claims block a player for a while? → A: Yes. After 3 bogus claims in a row, that player cannot claim for 1 minute (the 2-second pace between claims still applies otherwise).
- Q: After a match, what should a new round keep? → A: Nothing but the room's player limit. All lobby settings return to their defaults and every ticket count to 1.
- Q: Should the lobby chat also hide automatic join and leave lines? → A: No. The lobby keeps the platform's usual join and leave lines; they stop when the match starts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Sets Up the Room (Priority: P1)

The host opens a Housie room and, before anyone plays, makes a few simple choices on one calm setup screen: how many players the room
holds (2 to 200), the most tickets any one player may take (1 to 4, default 1), whether the host plays too, which winning combinations are in play (chosen from the 40 on offer), and how
balls are called (manual button, or automatically every 5, 8 or 10 seconds). Sensible defaults are pre-selected so a host can start with
one tap. The host shares the invite link, watches players arrive with their chosen ticket counts, and starts the match when ready.

**Why this priority**: Nothing else can happen until a room is configured, and the host's choices define the whole match.

**Independent Test**: Create a Housie room, set 4 players, a ticket ceiling of 4, three winning combinations and automatic calling at
8 seconds; confirm the lobby shows those settings, that a second window can join, and that the host can start once at least one other
player is seated.

**Acceptance Scenarios**:

1. **Given** I create a Housie room, **When** the setup screen opens, **Then** I can set the maximum number of players, the ticket
   ceiling (1 to 4, default 1), whether I also play, the winning combinations (at least one), and the caller mode, and each already has a default
   value.
2. **Given** I am setting up, **When** I open the combination chooser, **Then** I see all 40 patterns grouped by type with a short
   picture of each, and I can switch any of them on or off, or switch a whole group on or off at once.
3. **Given** I have not selected any combination, **When** I try to start, **Then** I am told to pick at least one and the match does not
   start.
4. **Given** players are seated, **When** I lower the maximum players below the number already seated, **Then** the change is refused with
   a clear message and nobody is removed.
5. **Given** I lower the ticket ceiling, **When** some players had already chosen more tickets than the new limit, **Then** their choices
   are reduced to the new limit and they see the change.
6. **Given** at least one player besides me is seated and one or more combinations are chosen, **When** I press Start, **Then** the
   match begins, all settings become fixed, and every player's tickets are issued.

---

### User Story 2 - Players Choose Tickets and See Them Clearly (Priority: P1)

After joining, each player sees the host's settings and picks how many tickets they want to play, from 1 up to the host's ceiling
(default 1). They can change the number freely until the host starts. When the match begins they receive that many unique tickets,
shown large and legible on the left side of the screen. One or two tickets are stacked; with three or four, they appear as tabs (or
a vertical stack, whichever keeps every number comfortably tappable) so the player never has to squint or scroll the page.

**Why this priority**: Tickets are the player's whole game; they must be valid, fair, and easy to read.

**Independent Test**: With a ceiling of 4, join as a player, switch the ticket count between 1 and 4, start the match, and inspect the
tickets: each has three rows of nine cells, five numbers per row, and numbers in the correct column ranges.

**Acceptance Scenarios**:

1. **Given** the host's ceiling is 4, **When** I choose a ticket count, **Then** I can pick any of 1, 2, 3 or 4, and my choice is visible to
   the host in the lobby.
2. **Given** I choose more tickets than the ceiling allows (for example after the host lowers it), **When** the lobby updates, **Then** my
   count is reduced to the ceiling and I am told.
3. **Given** the match starts, **When** my tickets appear, **Then** each is a 3 by 9 grid with exactly 5 numbers in every row, 15 numbers in
   total, every column holding between 1 and 3 numbers taken from that column's range (1-9, 10-19, 20-29, ... 70-79, 80-90) in
   ascending order top to bottom, and no number repeated on the ticket.
4. **Given** several players hold tickets, **When** I compare tickets, **Then** no two tickets in the room are identical, and my own
   tickets are different from each other.
5. **Given** I hold two or more tickets, **When** I look at the ticket area, **Then** I can see and reach every ticket without leaving
   the screen, with every number cell large enough to tap reliably.

---

### User Story 3 - Dab Numbers by Hand (Priority: P1)

Numbers are never marked for the player. When a ball is called, the player looks for it and taps the cell on their ticket to stamp a
tactile ink cross (a hand-inked X with a small stamp animation). Tapping a marked cell again lifts the ink. The ink marks are the
player's own work: the game never adds or removes them, and a claim is valid only for numbers the player has both crossed and that were
actually called.

**Why this priority**: Manual dabbing is the defining interaction the owner asked for; automatic marking would remove the game.

**Independent Test**: Start a match, have the host draw a ball that appears on your ticket, and confirm the cell stays unmarked until you
tap it; tap to ink it, tap again to remove it.

**Acceptance Scenarios**:

1. **Given** a ball is called that is on my ticket, **When** it appears on the caller console, **Then** the matching cell on my ticket is
   not marked or changed in any way.
2. **Given** an unmarked number cell, **When** I click or tap it, **Then** an ink cross appears with a short stamping effect.
3. **Given** a marked cell, **When** I click or tap it again, **Then** the ink cross is removed.
4. **Given** a number that has not been called, **When** I tap its cell, **Then** the ink cross still appears (it is my own mark) and
   nothing is said or flagged, but it cannot help a claim until that number is called.
5. **Given** I reload the page or reconnect, **When** I return to the match, **Then** my ink marks are still there.
6. **Given** I hold a keyboard or use assistive technology, **When** I focus a ticket cell and press Enter or Space, **Then** it toggles
   exactly as a tap would.

---

### User Story 4 - The Host Calls Balls and Everyone Sees Them Beautifully (Priority: P1)

The host calls balls one at a time, either by pressing "Draw Next Ball" or by letting the room draw automatically every 5, 8 or 10
seconds (changeable, pausable, and resumable at any time). Each draw is a short, satisfying reveal: a large glossy white 3D ball rolls
into view with its bold number and settles in the Current Ball console, with a soft glow. The same ball appears for every player at
the same moment. Beside it, a compact mini-grid fills with the previously called numbers (newest first). The host additionally has a
master 1 to 90 board that lights up every drawn number in real time. No number is ever drawn twice, and calling ends after the
ninetieth ball.

**Why this priority**: Without calls there is no game; the reveal and the call history are the visual centre of the experience.

**Independent Test**: As host, draw several balls manually, then switch to automatic at 5 seconds; on a player's screen confirm each ball
appears within a second, the previous numbers fill the mini-grid, and the host's master board lights up the same numbers.

**Acceptance Scenarios**:

1. **Given** the match is running in manual mode, **When** I press "Draw Next Ball", **Then** one new number from 1 to 90 that has not been
   called before is revealed on every screen, with a rolling-in animation, within 1 second.
2. **Given** automatic mode at 5, 8 or 10 seconds is on, **When** the interval elapses, **Then** the next ball is drawn and revealed
   without any action from me, and I can pause, resume, change the interval, or return to manual at any time.
3. **Given** a ball is revealed, **When** a player looks at the upper right of their screen, **Then** they see only that single large ball
   with a glossy 3D look and a bold number, plus a compact mini-grid of previously called numbers (newest first, with a count such as
   "Called 12 of 90").
4. **Given** I am the host, **When** a number is drawn, **Then** it lights up on my master 1 to 90 board at the same moment.
5. **Given** all 90 balls have been called, **When** I try to draw again, **Then** no further ball is drawn and the match moves to its end
   state.
6. **Given** reduced motion is on for a viewer, **When** a ball is revealed, **Then** the ball simply appears with a brief fade and the
   number stays clear.

---

### User Story 5 - Claim a Win and See It Everywhere (Priority: P1)

The lower left of the player's screen shows only the combinations the host switched on, as a compact grid of tiles. Each tile shows
the pattern's name and, while it is still open, a gold CLAIM button (once won, it shows "Claimed by [player]" instead). The player's currently
selected ticket is highlighted and labelled (for example "Claims use: Ticket #1"; with one ticket it is selected automatically). When a player
believes they have completed a pattern on the selected ticket, they press CLAIM on that pattern's tile. The
server checks the claim at once against the chosen ticket, the numbers actually called so far, and the cells the player has crossed. A valid claim flips that tile to "Claimed by [player]" on
every screen with a short golden celebration; an invalid claim shows a private "Bogus Claim" notice only to the claimant.

**Why this priority**: Claims are how the game is won and the only part with real stakes; they must be fair, instant, and clear.

**Independent Test**: With a valid completed pattern on your selected ticket, press CLAIM on that pattern's tile and verify the tile turns to
"Claimed by [you]" on the host's and other players' screens; then submit a pattern that is not complete and confirm only you see "Bogus
Claim".

**Acceptance Scenarios**:

1. **Given** the host chose a set of combinations, **When** I look at the combinations grid, **Then** it lists only those combinations,
   each with a CLAIM button (or "Claimed by [player]" once won), and nothing else.
2. **Given** I hold more than one ticket, **When** I select a ticket, **Then** it is highlighted, the tiles say which ticket claims use, and pressing
   CLAIM on a tile claims that pattern with that ticket; I see no hint about which patterns are complete.
3. **Given** I press CLAIM on a combination whose required numbers are all on the selected ticket, have all been called before my claim, and are all
   crossed by me, **Then** the server accepts it, the tile shows "Claimed by [my name]" on every screen, and a gold celebration plays.
4. **Given** I press CLAIM on a combination that is not complete (a required number has not been called, is not crossed, or is not on that ticket), **Then**
   only I see a "Bogus Claim" notice, the tile keeps its CLAIM button, and nothing changes for anyone else.
5. **Given** two players claim the same combination at nearly the same moment, **When** both are valid, **Then** exactly one player wins
   it (the claim the server received first) and the other sees that it was just claimed.
6. **Given** a combination is already claimed, **When** anyone looks at its tile, **Then** it shows "Claimed by [player]" with no CLAIM button, and cannot be claimed
   again.
7. **Given** I did not cross a called number that the pattern needs, **When** I claim that pattern, **Then** it is a Bogus Claim: every
   pattern cell must be both called and crossed on the chosen ticket (crosses elsewhere on the ticket do not matter).
   Crossed numbers that have not been called yet likewise make the claim bogus.
8. **Given** a claim is rejected as bogus, **When** I try again immediately and repeatedly, **Then** claims are limited to a short pace
   (for example one every 2 seconds) so the screen is not flooded.
   After 3 bogus claims in a row, only that player's claims are blocked for 1 minute: their CLAIM buttons are disabled with a "Claims paused"
   notice and countdown, a valid claim before that resets the count, and the lock lifts by itself.
9. **Given** I tap or click a combination tile (outside its CLAIM button), or focus it and press Enter or Space, **When** the tile opens, **Then** I
   see a small illustration of that combination: a sample 3 by 9 ticket with the cells the pattern needs highlighted, its name and a one-line
   description; it closes on a tap elsewhere, the close control or Escape, never claims anything, and never reveals whether my own ticket is close.

---

### User Story 6 - Player-Only Chat That Can Be Tucked Away (Priority: P2)

Under the Current Ball console, the lower two thirds of the right column is a clean chat for human players. Only messages typed by
people appear, plus one short line each time a claim is won (for example "Asha won Top Line"): no game logs, no ball announcements, no bogus
claim notices, no join or leave lines, no bot chatter. Players who want an
uncluttered view can minimize the chat to a slim bar; the bar shows an indicator and a count when unread messages arrive, and
restores in one tap with the conversation intact. Calls and other room events are shown only in their own places (the ball console,
the combination tiles, brief on-screen notices), never in the chat stream. Before the match starts, the lobby chat keeps the platform's usual
join and leave lines; they stop when the match begins.

**Why this priority**: Chat is a platform feature that must work here, and the owner wants it strictly human and unobtrusive, but the
game itself can be played without it.

**Independent Test**: Exchange messages between two windows and confirm only typed messages appear; draw balls and make a claim and
confirm none of that appears in chat; minimize the chat, send a message from the other window, confirm the indicator and count, then
restore.

**Acceptance Scenarios**:

1. **Given** the match is running, **When** balls are drawn, claims are made, or players join or leave, **Then** none of these events
   appear as lines in the chat stream.
2. **Given** I type a message and send it, **When** it is delivered, **Then** every player sees it with my name and color tag, in order.
3. **Given** I minimize the chat, **When** new typed messages from other people arrive, **Then** the minimized bar shows an unread indicator with a count that
   grows with each message (accepted-win lines do not add to it) and disappears when I restore the chat.
4. **Given** the chat is minimized, **When** I restore it, **Then** I see the full conversation and any half-typed text is still there.
5. **Given** I minimized the chat on this device, **When** I reload or return later, **Then** the chat is still minimized.

---

### User Story 7 - A Calm, Beautiful, Uncluttered Screen on Every Device (Priority: P2)

The screen has two columns that fill the available space: tickets and combinations on the left; ball console and chat on the right
(one third and two thirds of the column height). The look is royal arcade: deep midnight backgrounds, gold accents, warm paper-like
tickets, a glossy ball, and restrained glow. Effects are saved for the moments that matter (a ball arriving, an ink stamp, a claim
being won) and everything else stays quiet: no extra panels, no log streams, no decoration that competes with the numbers. On narrow
or portrait screens the layout restacks (ball console on top, tickets, combinations, then a chat drawer) so everything stays usable
without page scrolling.

**Why this priority**: The owner's priority is visual quality with minimal noise, but the game logic must work first.

**Independent Test**: Open a match on a large desktop, a laptop, and a phone in both orientations; confirm the layout, that tickets and
combinations stay legible and tappable, that nothing scrolls the page, and that effects play only on ball reveals, dabs, and claims.

**Acceptance Scenarios**:

1. **Given** a landscape screen of at least tablet size, **When** I view a match as a player, **Then** I see two columns: tickets on top of
   the combinations grid on the left; Current Ball over chat on the right, with the ball console about one third of the right column's
   height and chat about two thirds.
2. **Given** a portrait or narrow screen, **When** I view a match, **Then** the layout restacks into a single column (ball console,
   tickets, combinations) with chat in a collapsible drawer, and the page itself never scrolls.
3. **Given** any screen from 320 to 2560 px wide, **When** I view my tickets, **Then** every number is readable and every cell is at
   least 32 px across so it can be tapped reliably.
4. **Given** the match is quiet (no draw, no claim), **When** I look at the screen, **Then** nothing is animating except a very subtle
   ambient background and the active-ball glow.
5. **Given** a viewer has asked for reduced motion, **When** effects would play, **Then** they are replaced by brief, simple transitions
   and all information remains available.
6. **Given** all text and numbers, **When** compared with their backgrounds, **Then** they are high contrast and easy to read.
7. **Given** any supported screen, **When** I view the match, **Then** every panel is sized to its content and the screen, with tight but
   comfortable spacing, compact controls and short labels, so the tickets, ball console and combination tiles are as large as the screen allows
   and no area is left empty or filled with decoration.

---

### User Story 8 - The Host's Dashboard During the Match (Priority: P2)

During play the host's left column swaps the tickets for a master 1 to 90 board and a compact view of the chosen combinations with
their CLAIM / Claimed status, while the right column shows the caller console (Draw Next Ball, auto-calling controls, current ball
and the recent numbers) over the same chat. The host may also play (chosen at setup): a playing host holds tickets like any player and the
left column then offers a Master Board | My Tickets switch, with the same per-tile CLAIM buttons; a non-playing host is a pure caller and holds
no tickets. Either way the host calls, watches claims resolve, and chats. When
all chosen combinations are claimed or all 90 balls have been called, the match ends and everyone sees a results screen listing which
player won which combinations.

**Why this priority**: The host needs situational awareness to run a good game, but the core loop works without extra polish.

**Independent Test**: As host, run a short match with two combinations; confirm the master board, the caller controls and the claim status
all update live, and that when both combinations are claimed the match ends with a results screen for everyone.

**Acceptance Scenarios**:

1. **Given** I am the host during a match, **When** I look at the left column, **Then** I see the master 1 to 90 board and the chosen
   combinations with live status; if I chose to play, I can switch that area to my own tickets and back, and I can claim from them.
2. **Given** I am the host, **When** a claim is accepted, **Then** the combination's status updates on my board immediately and the
   celebration plays for me too.
3. **Given** every chosen combination has been claimed, or all 90 balls have been called, **When** that happens, **Then** calling stops and
   everyone sees a results screen listing each combination and the player who won it (and which have no winner).
4. **Given** the match has ended, **When** I choose to, **Then** I can return everyone to the lobby for another round (the lobby settings return to
   their defaults: ceiling 1, default combinations, manual calling, host plays on, and every ticket count 1; the room's player limit stays) or leave
   to the Hub.
5. **Given** I lose connection, **When** I return within the reconnect window, **Then** I see the same board, the same call history and the
   current auto-calling state, and calling continues.

---

### Edge Cases

- A player leaves or is removed mid-match: their tickets stop playing, they can no longer claim, combinations they already won stay
  claimed, and the match continues for the rest.
- Every ticket holder leaves or loses their seat while the match runs (only a non-playing host remains): the match ends at once and everyone
  still present sees the results screen (won combinations stay won, the rest show "No winner"); the host can start a new round.
- A player disconnects and returns within the reconnect window: they see the same tickets, ink marks, call history and combination
  statuses, and can claim again.
- The host's seat is released: the platform's host handover applies, the new host takes over calling and the master board, and
  automatic calling continues at the same setting (or pauses if the new host prefers).
- The host leaves while the room is still in the lobby: the platform's host handover applies, the lobby settings stay as they are, and the "host
  plays" setting now applies to the new host (if it is off, the new host's ticket choice is ignored and they only call).
- The host sets a ticket ceiling lower than a player's current choice, or lowers the player limit below the seated count: handled as in
  User Story 1 (reduce choices; refuse the limit change).
- Players cannot join once the match has started, and nobody can change ticket counts or the combinations after the start.
- A claim names a ticket the player does not own, a combination that is not in play, or a pattern that is already claimed: it is
  refused with a private notice and changes nothing.
- A claim arrives for a number called a moment after the claim was submitted: only numbers called before the server received the claim
  count.
- Automatic calling is on and the host disconnects briefly: draws continue during the reconnect window so the match does not stall.
- A player holds the same number across two of their own tickets: allowed (each ticket is checked separately).
- All combinations are claimed on the same draw by different players: each combination is awarded to the first valid claim for it; the
  rest receive a "just claimed" notice.
- Rapid repeated claims or taps are limited so the interface cannot be flooded.
- Chat messages cannot contain markup that changes the screen; they are shown as plain text only.

## Requirements *(mandatory)*

### Functional Requirements

**Room Configuration and Tickets**

- **FR-001**: The host MUST be able to set the maximum number of people in the room (from 2 up to a configurable ceiling that is 200 for now,
  counting the host), and the room MUST refuse a limit lower than the number of people already seated. The ceiling MUST be a single
  operator-adjustable setting so it can be changed in a later iteration without redesign.
- **FR-002**: The host MUST be able to set a ticket ceiling of 1, 2, 3 or 4 tickets per player (default 1), and any player choices above a
  newly lowered ceiling MUST be reduced to it with the player informed.
- **FR-003**: Each player MUST be able to choose how many tickets to play, from 1 up to the host's ceiling (default 1), and change the choice
  until the host starts the match; the host MUST see every player's current choice in the lobby.
- **FR-004**: At match start the server MUST generate every ticket as a 3 by 9 grid with exactly 5 numbers in every row (15 per ticket),
  each column holding 1 to 3 numbers from that column's range (column 1 is 1-9, column 2 is 10-19, ... column 8 is 70-79, column 9 is 80-90),
  numbers ascending down each column, and no repeated number on a ticket.
- **FR-005**: No two tickets in a room MUST be identical, and a player's own tickets MUST differ from one another.
- **FR-006**: At setup the host MUST be able to choose whether to play too. A playing host chooses a ticket count (1 up to the ceiling, default 1),
  receives tickets and may claim like any player; a non-playing host holds no tickets and only calls and moderates.
- **FR-007**: The match MUST be startable only when at least one other person besides the host is seated and at least one combination is chosen.
- **FR-008**: After the match starts, player limits, ticket counts, chosen combinations and caller settings other than the calling mode and
  interval MUST be fixed.

**Winning Combinations**

- **FR-009**: The host MUST be able to choose, before the match, which of the 40 winning patterns in the Pattern Catalogue are in play,
  individually or by group, with a short picture of each pattern shown in the chooser.
- **FR-010**: Only the chosen combinations MUST appear anywhere in the players' views; unchosen patterns MUST NOT be shown or claimable.
- **FR-011**: Each chosen combination MUST be won at most once per match. "Full House 1st", "2nd" and "3rd" are three separate combinations that
  MUST be claimable in order only: the 2nd tile shows a disabled button until the 1st is claimed, and the 3rd until the 2nd is claimed. A single
  ticket MUST NOT win more than one Full House (different tickets, of the same or different players, win them).
- **FR-012**: Each combination tile MUST show a gold CLAIM button while the combination is open and "Claimed by [player name]" once won (a non-playing
  host sees status only, with no button), identical on every screen within
  1 second of any change.

**Manual Dabbing**

- **FR-013**: Called numbers MUST NEVER be marked on a ticket by the game; the player alone marks cells.
- **FR-014**: Clicking, tapping, or pressing Enter or Space on a ticket cell holding a number MUST toggle a tactile ink cross with a brief stamp
  effect; empty cells MUST NOT be markable.
- **FR-015**: Ink marks MUST be remembered for the player across reloads and reconnects and are private to that player (never shown to others);
  the server MUST hold each player's marks so claims can be checked against them (FR-023).
- **FR-016**: Any number MUST be markable whether or not it has been called, with no warning or feedback about correctness.

**Caller and Ball Console**

- **FR-017**: The host MUST be able to draw the next ball with a "Draw Next Ball" button, and MUST be able to switch to automatic calling at
  5, 8 or 10 seconds, pause and resume it, change the interval, or return to manual at any time during the match.
- **FR-018**: The server MUST choose every ball at random from the numbers 1 to 90 not yet called, never repeating a number, and MUST stop
  after the ninetieth.
- **FR-019**: A newly called ball MUST appear on every screen within 1 second as a large, glossy, white 3D-style ball showing its number in bold,
  with a short rolling-in reveal.
- **FR-020**: The player's upper-right console MUST show only the current ball and a compact mini-grid of the previously called numbers
  (newest first, with a "Called n of 90" count); all called numbers MUST be reachable from the mini-grid.
- **FR-021**: The host's view MUST include a master 1 to 90 board that highlights every called number in real time.

**Claims**

- **FR-022**: Each open combination tile in the player's lower-left area MUST carry a prominent CLAIM button that claims that combination using the
  player's currently selected ticket (the selected ticket MUST be clearly highlighted and named; with one ticket it is selected automatically); no
  separate claim dialog is needed.
- **FR-022a**: Tapping, clicking, or pressing Enter or Space on any combination tile (outside its CLAIM button) MUST open a quick illustration of that
  combination on a sample ticket (the same picture used in the host's chooser, FR-009), which MUST close on an outside tap, a close control or Escape,
  work for the host and players alike, and MUST NOT claim anything or hint at the viewer's own progress.
- **FR-023**: The server MUST validate every claim immediately: it is valid only if, for the chosen ticket (identified by its ticket number when
  the player holds more than one), every cell the combination requires holds a number that was called before the claim was received AND is
  crossed by the claimant, the ticket belongs to the claimant, the combination is in play, and it is still available. Crosses on other cells
  do not matter; a required cell that is called but not crossed, or crossed but not called, makes the claim bogus.
- **FR-024**: A valid claim MUST mark the combination "Claimed by [player]" for the whole room and play a brief celebration on every screen.
- **FR-025**: An invalid claim MUST produce a private "Bogus Claim" notice to the claimant only, change nothing for others, and the claim interface
  MUST NOT hint which combinations are complete.
- **FR-026**: When two valid claims for one combination race, the server MUST award it to the claim it received first and tell the other
  claimant that it was just claimed.
- **FR-027**: Claims MUST be paced (at most one per player every 2 seconds). After 3 bogus claims in a row by the same player (a valid claim resets
  the count), the server MUST refuse that player's claims for 1 minute; during the lock the player's CLAIM buttons are disabled with a short
  "Claims paused" notice and a countdown, only that player sees it, and the lock ends on its own (the count restarts at zero).
- **FR-028**: When every chosen combination is claimed, the ninetieth ball has been called, or no ticket holder remains in the match (everyone
  with tickets has left or lost their seat), the match MUST end and every screen MUST show a
  results screen listing each combination and who won it (or that it had no winner).

**Game Chat**

- **FR-029**: During the match, the room chat MUST be available to players and the host, and MUST show only messages typed by people, with
  name, color tag and time, plus one short system line each time a claim is accepted (for example "Asha won Top Line"); ball calls, bogus
  claims, joins, leaves, host actions and all other automated lines MUST NOT appear in it.
- **FR-030**: The chat MUST be minimizable to a slim bar that shows an unread indicator with a count of unread typed messages from other people while
  minimized, restores with the conversation
  and any half-typed text intact, and remembers its minimized or open state on the device.
- **FR-031**: Chat text MUST be displayed as plain text, length-limited, and rate-limited by the platform.

**Layout, Visuals and Quality**

- **FR-032**: In landscape the player screen MUST be two columns: tickets above the combinations grid on the left; Current Ball (about one third of the
  height) above chat (about two thirds) on the right. The host screen MUST mirror this with the master board and combinations on the left and the
  caller console (draw controls, current ball, recent numbers) above chat on the right. For a playing host, the left side MUST offer a
  Master Board | My Tickets switch.
- **FR-033**: On portrait or narrow screens the layout MUST restack into one column (ball console, tickets or master board, combinations) with chat
  in a collapsible drawer, and the page itself MUST NOT scroll at any size from 320 to 2560 px wide.
- **FR-034**: Ticket cells MUST be at least 32 px across on every supported screen; with two or more tickets the area MUST stack or tab them so every
  ticket stays reachable.
- **FR-034a**: The match screen MUST use space efficiently: the layout MUST scale to fill the available viewport; panel headers, buttons, tiles, the
  mini-grid and chips MUST be compact (short labels, text never smaller than 11 px, tight padding and gaps); decorative or empty areas MUST be avoided; and
  extra detail (pattern illustrations, ticket tabs, the minimized chat bar) MUST appear on demand rather than occupy permanent space. Compactness MUST
  never reduce ticket cells below the FR-034 minimum or touch targets below a comfortable tap size.
- **FR-035**: The visual style MUST be a royal arcade look (deep midnight background, gold accents, paper-like tickets, glossy ball) with high-contrast
  text, and effects (ball reveal, ink stamp, claim celebration) MUST be reserved for those moments; no logs, tickers or extra panels beyond those
  listed in this specification MUST appear on the match screen.
- **FR-036**: With a reduced-motion preference, effects MUST be replaced by brief simple transitions with all information intact; every interactive
  element MUST have visible hover, pressed and keyboard-focus states and work by touch, pointer and keyboard.
- **FR-037**: Animations MUST stay smooth on mid-range phones and laptops, and every screen MUST see calls and claims in the same order.

**Platform Integration and Authority**

- **FR-038**: The module MUST use the Platform Core's rooms, invites, host role, presence and chat, with the room's player limit chosen by the host (up
  to the configurable ceiling in FR-001) instead of the platform's current default for Housie.
- **FR-039**: The server MUST be the only authority for ticket generation, ball selection, call order, claim validation and combination status;
  clients MUST only send intents (draw, pause, resume, change interval, claim, ticket count, ink toggles for their own tickets).
- **FR-040**: A player who disconnects and returns within the reconnect window MUST see the current tickets, their ink marks, the call history,
  the current ball and all combination statuses; a player whose seat is released MUST stop playing and MUST NOT be able to rejoin that match.
- **FR-041**: Hosts and players MUST be able to leave from the match screen with confirmation; if the host's seat is released the platform's host
  handover applies and calling continues.

### Key Entities *(include if feature involves data)*

- **Match**: One game of Housie in a room: chosen settings (player limit, ticket ceiling, combinations, caller mode and interval), the call
  history, the current ball, the status of each combination, and its phase (lobby, running, finished).
- **Player Entry**: A seated player: name, color, host marker, chosen ticket count, issued tickets, ink marks, and connection state.
- **Ticket**: A 3 by 9 grid owned by one player: 15 numbers placed by the column rules, with empty cells; unique within the room.
- **Ball Call**: One drawn number (1 to 90) with its position in the call order.
- **Winning Combination**: A named pattern from the catalogue: its group, the cells of a ticket that must be called, whether it is in play, and
  its status (Open, or Claimed by a player with the ticket and the time).
- **Claim**: A player's request naming a ticket and a combination, with the server's decision (accepted or bogus) and the time received.
- **Ink Mark**: A player's private toggle on one cell of one of their tickets; used by the server, together with the called numbers, to decide claims.
- **Chat Message**: A line typed by a person: sender, color, text, time; automated events are never chat messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A host can set up a room (player limit, ticket ceiling, combinations, calling mode) and start the match in under 60 seconds, and in
  under 10 seconds when accepting the defaults.
- **SC-002**: Across 40 generated tickets, 100% satisfy every ticket rule (3 rows by 9 columns, 5 numbers per row, 15 in total, 1 to 3 numbers per
  column inside the correct range, ascending columns, no repeats) and no two are identical.
- **SC-003**: With the ceiling at 4, a player can choose any count from 1 to 4 and the host sees each change in under 1 second.
- **SC-004**: In 100% of observed ball calls, no ticket cell is marked by the game; a cell shows ink only after its owner taps it.
- **SC-005**: A newly drawn ball appears on every connected screen within 1 second of being drawn, and all screens show the same sequence of balls.
- **SC-006**: In automatic mode each draw happens within 0.5 seconds of the chosen 5, 8 or 10 second interval.
- **SC-007**: The mini-grid shows every previously called number after each draw, newest first, with a correct "Called n of 90" count, in 100% of
  observed draws.
- **SC-008**: A claim is decided and its result shown (Claimed on all screens, or a private Bogus Claim notice) within 1 second in 95% of claims.
- **SC-009**: In 100% of observed claims, validity matches the called numbers, the chosen ticket and the claimant's crosses (every pattern cell called
  and crossed); a combination is never awarded
  twice, and a bogus claim is never visible to other players.
- **SC-010**: In 100% of observed matches the chat stream contains only typed player messages and accepted-win lines, with none of the other automated lines listed in FR-029.
- **SC-011**: When the chat is minimized, the indicator appears within 1 second of an unread message and shows the correct count; restoring clears it.
- **SC-012**: On every tested screen from 320 to 2560 px wide, in both orientations, the page does not scroll, all ticket numbers are legible, ticket
  cells are at least 32 px across, and the playing area (tickets, ball, combination tiles) uses at least 90% of the viewport apart from the header and
  gaps.
- **SC-013**: With reduced motion enabled, 100% of information and controls remain available and understandable.
- **SC-014**: Animations stay visually smooth (no visible stutter) on a mid-range phone (for example an Android phone from 2021 or later with 4 GB of RAM) and a laptop during a full match, and a first-time player can
  find a called number, ink it, and make a claim without instructions in under 2 minutes.
- **SC-015**: In a review against the supplied sample images, stakeholders rate the ticket look, the ball console, the combination tiles and the
  overall calm, uncluttered feel at least 4 out of 5 on average.
- **SC-016**: In a room of 200 people, 95% of ball calls reach every connected screen within 1 second, and the server process stays under 512 MB during
  a full match.

## Assumptions

- Terms: a **pattern** is an entry of the 40-pattern catalogue; a **combination** is a pattern the host put in play for this match; the **ticket
  ceiling** is the "max tickets each" the host sets; **New round** is the host's button on the results screen.

- Housie follows the platform's room model: one host, invite links for players, no joining after the match starts, and the 60-second reconnect
  window.
- The host may play (chosen at setup) or act as a pure caller. A playing host sees a Master Board | My Tickets switch on the left of the host screen.
- The room's limit counts the host and ranges from 2 up to a configurable ceiling (200 for now); the platform's current Housie limit of 4 is raised
  as part of this feature (as was done for Ludo's colour order). Beyond a handful of players, player identity relies on names and a color tag
  rather than a distinct color per player.
- Defaults: ticket ceiling 1, players choose 1 ticket, calling mode manual, all of Early Five, Top Line, Middle Line, Bottom Line, Four Corners and Full
  House 1st preselected as combinations.
- Winning combinations apply per ticket (a player may use any one of their tickets for a claim); a player may win several different combinations.
- A combination counts as complete when every cell it requires on the chosen ticket has been called and is crossed by the player; the "any N numbers"
  patterns use any numbers of that ticket.
- There are no money, stakes, or prize values in this version; winners are recognised on screen only.
- Ink marks are private to each player and are stored for the match so reloads keep them and the server can check claims; they are cleared when the match ends.
- Combinations are fixed once the match starts; mid-match changes are out of scope for fairness.
- The supplied sample images are style references (royal arcade palette, paper tickets, glossy ball, compact tiles); where they differ from the written
  scope (for example, chat showing system lines, or toggles shown mid-match), the written scope wins.
- Mockups of the player and host screens are provided in `mockups/` as layout and style references for planning; they are illustrative, not final art.
- All of this is verified by playing in a browser; no automated test suites are added (constitution Principle III), and everything runs on the existing
  Render deployment with no new services.
- Out of scope: money or prizes, bots as players, auto-dab or "suggested claims", spectators, saved match history, voice chat, and more than 4 tickets
  per player.

## Appendix: Winning Pattern Catalogue (40)

Positions refer to a ticket's three rows (top, middle, bottom) and the five numbers in each row counted left to right (position 1 to 5); empty
cells are skipped. "Any N" patterns use any numbers on the ticket.

| Group | Pattern | Numbers required |
|-------|---------|------------------|
| Early (4) | Early Five | Any 5 numbers |
| Early | Early Seven | Any 7 numbers |
| Early | Early Ten | Any 10 numbers |
| Early | Early Twelve | Any 12 numbers |
| Lines (7) | Any Line | Any one complete row |
| Lines | Top Line | All 5 numbers of the top row |
| Lines | Middle Line | All 5 numbers of the middle row |
| Lines | Bottom Line | All 5 numbers of the bottom row |
| Lines | Top and Middle | Top row and middle row |
| Lines | Middle and Bottom | Middle row and bottom row |
| Lines | Top and Bottom | Top row and bottom row |
| Shapes (20) | Four Corners | Positions 1 and 5 of the top and bottom rows |
| Shapes | Star | Four corners plus the middle row's position 3 |
| Shapes | Pyramid | Top position 3; middle positions 2 to 4; bottom row (all 5) |
| Shapes | Reverse Pyramid | Top row (all 5); middle positions 2 to 4; bottom position 3 |
| Shapes | Diamond | Top position 3; middle positions 2 and 4; bottom position 3 |
| Shapes | Left Edge | Position 1 of every row |
| Shapes | Right Edge | Position 5 of every row |
| Shapes | Both Edges | Positions 1 and 5 of every row |
| Shapes | Middle Column | Position 3 of every row |
| Shapes | Plus | Middle row (all 5); top position 3; bottom position 3 |
| Shapes | Letter H | Positions 1 and 5 of every row; middle positions 2 to 4 |
| Shapes | Letter U | Positions 1 and 5 of the top and middle rows; bottom row (all 5) |
| Shapes | Letter T | Top row (all 5); middle position 3; bottom position 3 |
| Shapes | Frame | Top row and bottom row (all 5 each); middle positions 1 and 5 |
| Shapes | Letter L | Positions 1 of the top and middle rows; bottom row (all 5) |
| Shapes | Letter Z | Top row and bottom row (all 5 each); middle position 3 |
| Shapes | Checkerboard | Top positions 1, 3, 5; middle positions 2, 4; bottom positions 1, 3, 5 |
| Shapes | Diagonal Down | Top position 1; middle position 3; bottom position 5 |
| Shapes | Diagonal Up | Top position 5; middle position 3; bottom position 1 |
| Shapes | Corners and Middle Line | Four corners plus the middle row (all 5) |
| Number types (5) | Five Odds | Any 5 odd numbers |
| Number types | Five Evens | Any 5 even numbers |
| Number types | Young Five | Any 5 numbers from 1 to 45 |
| Number types | Old Five | Any 5 numbers from 46 to 90 |
| Number types | Young and Old | Any 5 numbers from 1 to 45 and any 5 from 46 to 90 |
| Full house (4) | Almost House | Any 14 of the 15 numbers |
| Full house | Full House 1st | All 15 numbers (first valid claim) |
| Full house | Full House 2nd | All 15 numbers (second valid claim) |
| Full house | Full House 3rd | All 15 numbers (third valid claim) |

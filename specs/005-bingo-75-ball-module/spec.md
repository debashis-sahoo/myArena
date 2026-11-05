# Feature Specification: Bingo (75-Ball) Visual-First Game Module

**Feature Branch**: `005-bingo-75-ball-module`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Initialize feature specification: Bingo (75-Ball) Visual-First Game Module, built on the Platform Core room and chat engine and hosted on Render with server-authoritative state. High-contrast royal arcade look, maximum viewport scaling, manual player interactions, no automated test dependencies. Scope: (1) Room configuration and multi-card allocation: the host sets the maximum Bingo cards per participant (for example 1, 2 or 3); players pick how many cards to play within that limit before the match; the server generates authoritative 5x5 cards on the standard American 75-ball distribution (B 1-15, I 16-30, N 31-45, G 46-60, O 61-75); the central space is marked FREE but is NOT auto-daubed. (2) Two-column screen: the left column has the player's card(s) with bold, vibrant B-I-N-G-O headers on top, played by manual daubing only (the FREE space must be tapped by hand, with a glowing pulsing tooltip on first load reading 'Tap to claim your FREE space!'; tapping a number applies a translucent neon dauber with a satisfying physical stamp animation), and below it a compact dashboard of only the host-selected winning patterns with live Available / Claimed badges and a prominent glowing BINGO! button; the right column has a Current Ball console on top (one third: a large 3D sphere showing the letter and number such as 'G-54' plus a compact history grid of previous balls) and pure player-to-player chat below (two thirds: no system-generated logs or bot announcements). (3) Host dashboard: choose winning patterns before the match (Standard: Single Line horizontal/vertical/diagonal, Four Corners, Letter X, Letter L, Blackout/Full House; Custom/Thematic: Postage Stamp 2x2 in a corner, Diamond, Kite, Inner Square), a real-time master 75-ball board (15x5) highlighting drawn numbers under their B-I-N-G-O columns, manual 'Draw Next Ball' or automatic calling every 5, 8 or 10 seconds, and instant server validation of claims (valid claims lock the pattern globally; invalid ones show a local 'Bogus Bingo' alert). (4) Manual verification: correct 5x5 column constraints; FREE space needs a manual tap and shows the tooltip at game start; the current ball shows the right letter-number and previous balls fill the history grid; chat shows only typed player messages; a valid BINGO! updates pattern status on every connected client."

## Clarifications

### Session 2026-11-04

- Q: Should a player be able to daub a number on their card before that number has been called? → A: Yes. Any number can be daubed at any time with no feedback; only daubs on called numbers (and the FREE space) count in a claim.
- Q: When a player's card completes several open patterns at the same moment, should one BINGO! press win all of them? → A: Yes. One press wins every open pattern the submitted card completes at that moment.
- Q: Should "Single Line" be one pattern that any row, column or diagonal can win, or separate patterns for horizontal, vertical and diagonal lines? → A: One "Single Line" pattern; any complete row, column or diagonal wins it, with one winner.
- Q: Once a player's card completes a pattern, how long do they have to claim it? → A: No deadline. The pattern can be claimed at any time until someone wins it; later balls do not invalidate a completed pattern.
- Q: When a player holds two or three cards and presses BINGO!, should the server check only the card they are viewing, or all of their cards? → A: Only the currently selected card; the button names that card when the player holds more than one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Sets Up the Room (Priority: P1)

The host opens a Bingo room and, before anyone plays, makes a few simple choices on one calm setup screen: how many people the
room holds, the most cards any one player may take (1 to 3, default 1), whether the host plays too, which winning patterns are in play
(Standard and Custom/Thematic groups), and how balls are called (manual button, or automatically every 5, 8 or 10 seconds). Sensible
defaults are pre-selected so a host can start with one tap. The host shares the invite link, watches players arrive with their chosen
card counts, and starts the match when ready.

**Why this priority**: Nothing else can happen until a room is configured, and the host's choices define the whole match.

**Independent Test**: Create a Bingo room, set 4 players, a card ceiling of 3, two winning patterns and automatic calling at 8
seconds; confirm the lobby shows those settings, that a second window can join, and that the host can start once at least one other
person is seated.

**Acceptance Scenarios**:

1. **Given** I create a Bingo room, **When** the setup screen opens, **Then** I can set the maximum number of people, the card ceiling
   (1 to 3, default 1), whether I also play, the winning patterns (at least one), and the caller mode, and each already has a default value.
2. **Given** I am setting up, **When** I open the pattern chooser, **Then** I see all nine patterns grouped as Standard and
   Custom/Thematic, each with a small picture of the shape, and I can switch any of them on or off, or switch a whole group on or off at once.
3. **Given** I have not selected any pattern, **When** I try to start, **Then** I am told to pick at least one and the match does not start.
4. **Given** people are seated, **When** I lower the maximum below the number already seated, **Then** the change is refused with a clear
   message and nobody is removed.
5. **Given** I lower the card ceiling, **When** some players had already chosen more cards than the new limit, **Then** their choices are
   reduced to the new limit and they see the change.
6. **Given** at least one person besides me is seated and one or more patterns are chosen, **When** I press Start, **Then** the match
   begins, all settings except the calling mode and interval become fixed, and every player's cards are issued.

---

### User Story 2 - Players Choose Cards and See Them Clearly (Priority: P1)

After joining, each player sees the host's settings and picks how many cards they want to play, from 1 up to the host's ceiling
(default 1). They can change the number freely until the host starts. When the match begins they receive that many unique cards,
shown large and legible on the left side of the screen under bold, vibrant B-I-N-G-O headers. With one card it fills the area; with
two or three, the cards are tabbed or stacked, whichever keeps every number comfortably tappable, so the player never has to squint or
scroll the page.

**Why this priority**: Cards are the player's whole game; they must be valid, fair, and easy to read.

**Independent Test**: With a ceiling of 3, join as a player, switch the card count between 1 and 3, start the match, and inspect the
cards: each has five columns of five cells under B-I-N-G-O, the numbers sit in the correct column ranges, and the centre says FREE.

**Acceptance Scenarios**:

1. **Given** the host's ceiling is 3, **When** I choose a card count, **Then** I can pick any of 1, 2 or 3, and my choice is visible to the
   host in the lobby.
2. **Given** I chose more cards than the ceiling allows (for example after the host lowers it), **When** the lobby updates, **Then** my
   count is reduced to the ceiling and I am told.
3. **Given** the match starts, **When** my cards appear, **Then** each is a 5 by 5 grid under the headers B, I, N, G and O, where column B holds
   five different numbers from 1-15, I from 16-30, N four different numbers from 31-45, G from 46-60 and O from 61-75, no number repeats on
   the card, and the centre cell reads "FREE".
4. **Given** several players hold cards, **When** I compare cards, **Then** no two cards in the room are identical, and my own cards are
   different from each other.
5. **Given** I hold two or more cards, **When** I look at the card area, **Then** I can see and reach every card without leaving the
   screen, the card I am looking at is clearly named (for example "Card 2 of 3"), and every number cell is large enough to tap reliably.

---

### User Story 3 - Daub Numbers by Hand, Including the FREE Space (Priority: P1)

Numbers are never marked for the player. When a ball is called, the player looks for it and taps the cell on their card to stamp a
vibrant, translucent neon dauber (a highlighter-style blob) with a satisfying physical "stamp" animation. Tapping a daubed cell
again lifts the dauber. The central FREE space is not marked either: the player must tap it themselves, and the first time they see their card a
playful, glowing tooltip pulses over it saying "Tap to claim your FREE space!". The daubs are the player's own work: the game never adds or
removes them, and a claim counts only daubs on numbers that were actually called (and on the FREE space).

**Why this priority**: Manual daubing, including the FREE space, is the defining interaction the owner asked for; automatic marking would remove the game.

**Independent Test**: Start a match, have the host draw a ball that appears on your card, and confirm the cell stays unmarked until you tap
it; tap to daub it, tap again to remove it; confirm the FREE space shows the pulsing tooltip, stays unmarked until tapped, and the tooltip
goes away once you tap it.

**Acceptance Scenarios**:

1. **Given** a ball is called that is on my card, **When** it appears on the caller console, **Then** the matching cell on my card is not
   marked or changed in any way.
2. **Given** an unmarked number cell, **When** I click or tap it, **Then** a neon translucent dauber appears over it with a short stamping effect, and
   the number underneath stays readable.
3. **Given** a daubed cell, **When** I click or tap it again, **Then** the dauber is removed.
4. **Given** a number that has not been called, **When** I tap its cell, **Then** the dauber still appears (it is my own mark) and nothing is said or
   flagged, but it cannot help a claim until that number is called.
5. **Given** the match has just started and I look at my card for the first time, **When** the card appears, **Then** the FREE space is unmarked and a glowing
   tooltip reading "Tap to claim your FREE space!" pulses over it, without blocking taps on any cell.
6. **Given** the FREE tooltip is showing, **When** I tap the FREE space, **Then** the dauber stamps onto it, the tooltip disappears, and it does not
   come back for that card (even if I later lift the dauber).
7. **Given** I reload the page or reconnect, **When** I return to the match, **Then** my daubs are still there, and the FREE tooltip shows again only
   on cards whose FREE space I have never tapped.
8. **Given** I hold a keyboard or use assistive technology, **When** I focus a card cell (including FREE) and press Enter or Space, **Then** it toggles
   exactly as a tap would.

---

### User Story 4 - The Host Calls Balls and Everyone Sees Them Beautifully (Priority: P1)

The host calls balls one at a time, either by pressing "Draw Next Ball" or by letting the room draw automatically every 5, 8 or 10
seconds (changeable, pausable, and resumable at any time). Each ball carries its column letter (B 1-15, I 16-30, N 31-45, G 46-60, O 61-75).
Each draw is a short, satisfying reveal: a large glossy 3D sphere rolls into view showing its letter and number (for example "G-54") and settles in the
Current Ball console, with a soft glow. The same ball appears for every player at the same moment. Beside it, a compact history grid fills with
the previously called balls. The host additionally has a master board of all 75 numbers, laid out under the B-I-N-G-O columns, that lights up every
drawn number in real time. No number is ever drawn twice, and calling ends after the seventy-fifth ball.

**Why this priority**: Without calls there is no game; the reveal and the call history are the visual centre of the experience.

**Independent Test**: As host, draw several balls manually, then switch to automatic at 5 seconds; on a player's screen confirm each ball appears
within a second with the right letter and number, the previous balls fill the history grid, and the host's master board lights up the same
numbers under the right letters.

**Acceptance Scenarios**:

1. **Given** the match is running in manual mode, **When** I press "Draw Next Ball", **Then** one new number from 1 to 75 that has not been called
   before is revealed on every screen, with a rolling-in animation, within 1 second.
2. **Given** automatic mode at 5, 8 or 10 seconds is on, **When** the interval elapses, **Then** the next ball is drawn and revealed without any
   action from me, and I can pause, resume, change the interval, or return to manual at any time.
3. **Given** a ball is revealed, **When** a player looks at the upper right of their screen, **Then** they see that ball as a large glossy 3D
   sphere with its letter and number (a number such as 54 always shows as "G-54"), plus a compact history grid of previously called balls
   (newest first, with a count such as "Called 12 of 75").
4. **Given** I am the host, **When** a number is drawn, **Then** it lights up on my master board, under its own letter column, at the same moment.
5. **Given** all 75 balls have been called, **When** I try to draw again, **Then** no further ball is drawn and the match moves to its end state.
6. **Given** reduced motion is on for a viewer, **When** a ball is revealed, **Then** the ball simply appears with a brief fade and its letter and
   number stay clear.

---

### User Story 5 - Claim BINGO! and See It Everywhere (Priority: P1)

The lower left of the player's screen shows only the patterns the host switched on, as a compact dashboard of tiles. Each tile shows a small picture of the
shape, its name, and a live badge: "Available" while nobody has won it, and "Claimed" (with the winner's name) once it is won. A prominent, glowing
"BINGO!" button sits with the dashboard. When a player believes the card they are viewing completes a pattern, they press BINGO!. The server checks the
card at once against the numbers actually called so far and the spaces the player has daubed. A valid claim locks every pattern that card completes, so
those tiles flip to "Claimed" on every screen with a short golden celebration; an invalid claim shows a private "Bogus Bingo" alert only to the claimant.

**Why this priority**: Claims are how the game is won and the only part with real stakes; they must be fair, instant, and clear.

**Independent Test**: With a valid completed pattern on your selected card, press BINGO! and verify the pattern's badge turns to "Claimed" (with your
name) on the host's and other players' screens; then press BINGO! on a card that completes nothing and confirm only you see "Bogus Bingo".

**Acceptance Scenarios**:

1. **Given** the host chose a set of patterns, **When** I look at the pattern dashboard, **Then** it lists only those patterns, each with its picture, name
   and an "Available" or "Claimed" badge, plus the BINGO! button, and nothing else.
2. **Given** I hold more than one card, **When** I select a card, **Then** it is highlighted and named, the BINGO! button says which card it will submit
   (for example "BINGO! - Card 2"), and I see no hint about which patterns are complete.
3. **Given** the card I am submitting completes one or more Available patterns using numbers that were all called before my claim and that I have
   daubed (and, where a pattern includes the centre, the FREE space I have tapped), **When** I press BINGO!, **Then** the server accepts it, every such
   pattern shows "Claimed" with my name on every screen, and a gold celebration plays.
4. **Given** the card I submit completes no Available pattern, **When** I press BINGO!, **Then** only I see a "Bogus Bingo" alert, the badges stay as they
   were, and nothing changes for anyone else.
5. **Given** two players claim the same pattern at nearly the same moment, **When** both are valid, **Then** exactly one player wins it (the claim the
   server received first) and the other is told it was just claimed.
6. **Given** a pattern is already Claimed, **When** anyone looks at its tile, **Then** it shows "Claimed" with the winner's name and cannot be claimed
   again.
7. **Given** a pattern needs a number I did not daub, a number that has not been called yet, or the FREE space I did not tap, **When** I claim, **Then** that
   pattern does not count: every pattern cell must be both called (or FREE) and daubed by me on the submitted card, and daubs elsewhere on the card do not
   matter.
8. **Given** the card I submit completes only patterns that someone else has already claimed, **When** I press BINGO!, **Then** I see a private "Too late -
   already claimed" notice instead of "Bogus Bingo", and no penalty applies.
9. **Given** a claim is rejected as bogus, **When** I press BINGO! again immediately and repeatedly, **Then** claims are limited to a short pace (one
   every 2 seconds); after 3 bogus claims in a row, only that player's claims are blocked for 1 minute: the BINGO! button is disabled with a "Claims
   paused" notice and countdown, a valid claim before that resets the count, and the lock lifts by itself.

---

### User Story 6 - Pure Player Chat (Priority: P2)

Under the Current Ball console, the lower two thirds of the right column is a clean chat reserved for human players. Only messages typed by people
appear, each with the sender's name and color tag: no game logs, no ball announcements, no claim or win lines, no bogus alerts, no join or leave lines, and no
bot chatter. Calls and claims are shown only in their own places (the ball console, the pattern badges, brief on-screen notices), never in the chat stream.
On narrow screens the chat moves into a collapsible drawer that shows an unread count when new messages arrive. Before the match starts, the lobby chat keeps
the platform's usual join and leave lines; they stop when the match begins.

**Why this priority**: Chat is a platform feature that must work here, and the owner wants it strictly human and unobtrusive, but the game itself can be
played without it.

**Independent Test**: Exchange messages between two windows and confirm only typed messages appear; draw balls, make a bogus claim and a valid claim, and
confirm none of that appears in chat.

**Acceptance Scenarios**:

1. **Given** the match is running, **When** balls are drawn, claims are made or won, or people join or leave, **Then** none of these events appear as lines in
   the chat stream.
2. **Given** I type a message and send it, **When** it is delivered, **Then** every person in the room sees it with my name and color tag, in order.
3. **Given** a narrow screen with the chat drawer closed, **When** other people send messages, **Then** the drawer handle shows an unread indicator with a
   count that grows with each message and clears when I open the drawer.
4. **Given** I type text containing markup or very long content, **When** it is shown, **Then** it appears as plain text and is length-limited.

---

### User Story 7 - A Calm, Beautiful, Uncluttered Screen on Every Device (Priority: P2)

The screen has two columns that fill the available space: cards and patterns on the left; ball console and chat on the right (one third and two thirds of the
column height). The look is high-contrast royal arcade: deep midnight and royal backgrounds, gold accents, bold vivid B-I-N-G-O headers, a glossy 3D ball and a
glowing neon dauber. Effects are saved for the moments that matter (a ball arriving, a dauber stamp, the FREE tooltip, a claim being won) and everything else
stays quiet: no extra panels, no log streams, no decoration that competes with the numbers. On narrow or portrait screens the layout restacks (ball console on
top, then cards, then patterns, with chat in a drawer) so everything stays usable without page scrolling.

**Why this priority**: The owner's priority is visual quality with maximum screen use, but the game logic must work first.

**Independent Test**: Open a match on a large desktop, a laptop, a tablet and a phone in both orientations; confirm the layout, that cards and pattern tiles stay
legible and tappable, that nothing scrolls the page, and that effects play only on ball reveals, daubs, the FREE tooltip and claims.

**Acceptance Scenarios**:

1. **Given** a landscape screen of at least tablet size, **When** I view a match as a player, **Then** I see two columns: cards above the pattern dashboard on
   the left; the Current Ball console over chat on the right, with the ball console about one third of the right column's height and chat about two thirds.
2. **Given** a portrait or narrow screen, **When** I view a match, **Then** the layout restacks into a single column (ball console, cards, patterns) with chat in a
   collapsible drawer, and the page itself never scrolls.
3. **Given** any screen from 320 to 2560 px wide, **When** I view my card, **Then** every number is readable and every cell is at least 40 px across so it can
   be tapped reliably.
4. **Given** the match is quiet (no draw, no claim), **When** I look at the screen, **Then** nothing is animating except a very subtle ambient background, the
   active-ball glow, the glowing BINGO! button, and (until tapped) the FREE tooltip.
5. **Given** a viewer has asked for reduced motion, **When** effects would play, **Then** they are replaced by brief, simple transitions (the tooltip stays
   visible but does not pulse) and all information remains available.
6. **Given** all text and numbers, **When** compared with their backgrounds, **Then** they are high contrast and easy to read.
7. **Given** any supported screen, **When** I view the match, **Then** every panel is sized to its content and the screen, with tight but comfortable spacing,
   compact controls and short labels, so the cards, ball console and pattern tiles are as large as the screen allows and no area is left empty or filled with
   decoration.

---

### User Story 8 - The Host's Dashboard During the Match (Priority: P2)

During play the host's left column swaps the cards for the master board and a compact view of the chosen patterns with their Available / Claimed status, while
the right column shows the caller console (Draw Next Ball, auto-calling controls, current ball and the recent balls) over the same chat. The host may also
play (chosen at setup): a playing host holds cards like any player and the left column then offers a Master Board | My Cards switch, with the same BINGO!
button; a non-playing host is a pure caller and holds no cards. Either way the host calls, watches claims resolve, and chats. When all chosen patterns are
claimed or all 75 balls have been called, the match ends and everyone sees a results screen listing which player won which patterns.

**Why this priority**: The host needs situational awareness to run a good game, but the core loop works without extra polish.

**Independent Test**: As host, run a short match with two patterns; confirm the master board, the caller controls and the claim status all update live, and
that when both patterns are claimed the match ends with a results screen for everyone.

**Acceptance Scenarios**:

1. **Given** I am the host during a match, **When** I look at the left column, **Then** I see the master board and the chosen patterns with live status; if I
   chose to play, I can switch that area to my own cards and back, and I can claim from them.
2. **Given** I am the host, **When** a claim is accepted, **Then** the pattern's status updates on my screen immediately and the celebration plays for me too.
3. **Given** every chosen pattern has been claimed, or all 75 balls have been called, **When** that happens, **Then** calling stops and everyone sees a
   results screen listing each pattern and the player who won it (and which have no winner).
4. **Given** the match has ended, **When** I choose to, **Then** I can return everyone to the lobby for another round (the lobby settings return to their
   defaults: card ceiling 1, default patterns, manual calling, host plays on, and every card count 1; the room's player limit stays) or leave to the Hub.
5. **Given** I lose connection, **When** I return within the reconnect window, **Then** I see the same board, the same call history and the current
   auto-calling state, and calling continues.

---

### Edge Cases

- A player leaves or is removed mid-match: their cards stop playing, they can no longer claim, patterns they already won stay claimed, and the match
  continues for the rest.
- Every card holder leaves or loses their seat while the match runs (only a non-playing host remains): the match ends at once and everyone still present
  sees the results screen (won patterns stay won, the rest show "No winner"); the host can start a new round.
- A player disconnects and returns within the reconnect window: they see the same cards, daubs, FREE-tooltip state, call history, current ball and pattern
  statuses, and can claim again.
- The host's seat is released: the platform's host handover applies, the new host takes over calling and the master board, and automatic calling continues at
  the same setting (or pauses if the new host prefers).
- The host leaves while the room is still in the lobby: the platform's host handover applies, the lobby settings stay as they are, and the "host plays" setting
  now applies to the new host (if it is off, the new host's card choice is ignored and they only call).
- The host sets a card ceiling lower than a player's current choice, or lowers the player limit below the seated count: handled as in User Story 1 (reduce
  choices; refuse the limit change).
- People cannot join once the match has started, and nobody can change card counts or the patterns after the start.
- A claim names a card the player does not own: it is refused with a short message to that player only (not counted as a bogus claim) and changes nothing.
- A claim arrives for a number called a moment after the claim was submitted: only numbers called before the server received the claim count.
- The player never taps the FREE space: patterns that include the centre (any line through it, Letter X, Kite, Inner Square, Blackout) cannot be completed
  on that card; patterns that do not touch the centre are unaffected.
- A submitted card completes several Available patterns at once (for example Blackout also completes lines and corners that nobody has claimed yet): all of
  them are awarded to that claimant in one claim.
- Several players complete different open patterns on the same draw: each pattern is awarded to the first valid claim that completes it, and the rest receive
  the "Too late" notice if nothing else of theirs is open.
- A player holds the same number on two of their own cards: allowed; each card is checked separately.
- Automatic calling is on and the host disconnects briefly: draws continue during the reconnect window so the match does not stall.
- Rapid repeated claims or taps are limited so the interface cannot be flooded.
- Chat messages cannot contain markup that changes the screen; they are shown as plain text only.

## Requirements *(mandatory)*

### Functional Requirements

**Room Configuration and Cards**

- **FR-001**: The host MUST be able to set the maximum number of people in the room (from 2 up to a configurable ceiling that is 200 for now, counting the
  host), and the room MUST refuse a limit lower than the number of people already seated. The ceiling MUST be a single operator-adjustable setting so it can
  change in a later iteration without redesign.
- **FR-002**: The host MUST be able to set a card ceiling of 1, 2 or 3 cards per player (default 1), and any player choices above a newly lowered ceiling
  MUST be reduced to it with the player informed.
- **FR-003**: Each player MUST be able to choose how many cards to play, from 1 up to the host's ceiling (default 1), and change the choice until the host
  starts the match; the host MUST see every player's current choice in the lobby.
- **FR-004**: At setup the host MUST be able to choose whether to play too. A playing host chooses a card count (1 up to the ceiling, default 1), receives
  cards and may claim like any player; a non-playing host holds no cards and only calls and moderates.
- **FR-005**: The match MUST be startable only when at least one other person besides the host is seated and at least one pattern is chosen.
- **FR-006**: After the match starts, the player limit, card counts, chosen patterns and the card ceiling MUST be fixed; only the calling mode and interval
  may change. Nobody MUST be able to join after the start.
- **FR-007**: At match start the server MUST generate every card as a 5 by 5 grid under the headers B, I, N, G, O, with column B holding five different
  numbers from 1-15, column I from 16-30, column N four different numbers from 31-45, column G from 46-60 and column O from 61-75, no number repeated on a
  card, and the centre cell (third row of column N) marked "FREE".
- **FR-008**: No two cards in a room MUST be identical, and a player's own cards MUST differ from one another.

**Winning Patterns**

- **FR-009**: The host MUST be able to choose, before the match, which of the nine patterns in the Pattern Catalogue are in play, individually or by group
  (Standard, Custom/Thematic), with a small picture of each shape shown in the chooser, and MUST choose at least one.
- **FR-010**: Only the chosen patterns MUST appear anywhere in the players' views; unchosen patterns MUST NOT be shown or claimable.
- **FR-011**: Each chosen pattern MUST be won at most once per match. Its badge MUST read "Available" until won and "Claimed" with the winner's name once won,
  identical on every screen within 1 second of any change.

**Manual Daubing and the FREE Space**

- **FR-012**: Called numbers and the FREE space MUST NEVER be marked on a card by the game; the player alone marks cells.
- **FR-013**: Clicking, tapping, or pressing Enter or Space on a card cell (including FREE) MUST toggle a translucent neon dauber with a brief physical
  stamp effect that leaves the number readable; tapping again removes it.
- **FR-014**: Any number MUST be daubable whether or not it has been called, with no warning, cue or feedback about correctness; only daubs on called
  numbers (and the FREE space) count in a claim (FR-024).
- **FR-015**: When a card first appears, a glowing, pulsing tooltip reading "Tap to claim your FREE space!" MUST sit over that card's FREE space without
  blocking taps on any cell (every cell stays tappable through it); it MUST disappear when the FREE space is first tapped and MUST NOT return for that card, and MUST be shown without pulsing when
  reduced motion is on.
- **FR-016**: Daubs MUST be remembered for the player across reloads and reconnects and are private to that player (never shown to others); the server MUST
  hold each player's daubs so claims can be checked against them (FR-024).

**Caller and Ball Console**

- **FR-017**: The host MUST be able to draw the next ball with a "Draw Next Ball" button, and MUST be able to switch to automatic calling at 5, 8 or 10
  seconds, pause and resume it, change the interval, or return to manual at any time during the match.
- **FR-018**: The server MUST choose every ball at random from the numbers 1 to 75 not yet called, never repeating a number, and MUST stop after the
  seventy-fifth.
- **FR-019**: Every ball MUST carry the letter of its column (B 1-15, I 16-30, N 31-45, G 46-60, O 61-75) and be shown as that letter and number (for
  example "G-54").
- **FR-020**: A newly called ball MUST appear on every screen within 1 second as a large 3D-style glossy sphere showing its letter and number, with a short
  rolling-in reveal.
- **FR-021**: The player's upper-right console MUST show the current ball and a compact history grid of the previously called balls (newest first, with a
  "Called n of 75" count); all called balls MUST be reachable from the history grid.
- **FR-022**: The host's view MUST include a master board of all 75 numbers laid out as five B-I-N-G-O columns of 15 numbers each (drawn rotated, as five
  rows of 15, only when the screen is too short for the columns to keep every number at least 11 px), highlighting every called number in real time.

**Claims**

- **FR-023**: The player's pattern dashboard MUST carry a prominent, glowing BINGO! button that submits the player's currently selected card (the selected
  card MUST be clearly highlighted and named, with one card selected automatically, and the button MUST name the card it submits when the player holds more
  than one); no separate claim dialog is needed.
- **FR-024**: The server MUST validate every claim immediately. A pattern counts as completed by the submitted card only if every cell the pattern requires
  is daubed by the claimant and either holds a number that was called before the claim was received or is the FREE space; the card MUST belong to the
  claimant. Daubs on other cells do not matter, and a required cell that is called but not daubed, or daubed but not called, does not count. A claim has no
  deadline: a completed pattern can be claimed at any time until someone wins it, however many balls have been called since.
- **FR-025**: When the submitted card completes one or more Available patterns, the server MUST award every such pattern to the claimant in that single
  claim, lock each for the whole room as "Claimed", and play a brief celebration on every screen.
- **FR-026**: When the submitted card completes no pattern that is Available or already Claimed, the server MUST produce a private "Bogus Bingo" alert to the
  claimant only, change nothing for others, and the interface MUST NOT hint which patterns are complete.
- **FR-027**: When the submitted card completes only patterns that were already Claimed, the claimant MUST receive a private "Too late - already claimed"
  notice with no penalty.
- **FR-028**: When two valid claims for one pattern race, the server MUST award it to the claim it received first and tell the other claimant that it was
  just claimed.
- **FR-029**: Claims MUST be paced (at most one per player every 2 seconds). After 3 bogus claims in a row by the same player (a valid claim resets the
  count), the server MUST refuse that player's claims for 1 minute; during the lock the BINGO! button is disabled with a short "Claims paused" notice and a
  countdown, only that player sees it, and the lock ends on its own (the count restarts at zero).
- **FR-030**: When every chosen pattern is claimed, the seventy-fifth ball has been called, or no card holder remains in the match (everyone with cards has
  left or lost their seat), the match MUST end and every screen MUST show a results screen listing each pattern and who won it (or that it had no winner);
  the host MUST be able to start a new round with the lobby defaults restored (card ceiling 1, default patterns, manual calling, host plays on, every card
  count 1, player limit kept).

**Game Chat**

- **FR-031**: During the match, the room chat in the lower right panel MUST show only messages typed by people, with name and color tag; balls, claims, wins,
  bogus alerts, joins, leaves, host actions and every other automated line MUST NOT appear in it. Before the match starts, the lobby chat keeps the
  platform's usual join and leave lines.
- **FR-032**: Chat text MUST be displayed as plain text, length-limited, and rate-limited by the platform; on narrow screens the chat MUST sit in a
  collapsible drawer that shows an unread count while closed.

**Layout, Visuals and Quality**

- **FR-033**: In landscape the player screen MUST be two columns: cards above the pattern dashboard on the left; the Current Ball console (about one third of
  the height) above chat (about two thirds) on the right. The host screen MUST mirror this with the master board and pattern dashboard on the left and the
  caller console (draw controls, current ball, recent balls) above chat on the right. For a playing host, the left side MUST offer a Master Board | My Cards
  switch.
- **FR-034**: On portrait or narrow screens the layout MUST restack into one column (ball console, cards or master board, patterns) with chat in a
  collapsible drawer, and the page itself MUST NOT scroll at any size from 320 to 2560 px wide.
- **FR-035**: Card cells MUST be at least 40 px across on every supported screen; with two or three cards the area MUST tab or stack them so every card stays
  reachable.
- **FR-036**: The match screen MUST use space efficiently: the layout MUST scale to fill the available viewport; panel headers, buttons, tiles, the history
  grid and the master board MUST be compact (short labels, text never smaller than 11 px, tight padding and gaps); decorative or empty areas MUST be avoided;
  and extra detail (card tabs, notices) MUST appear on demand rather than occupy permanent space. Compactness MUST never reduce card cells below the FR-035
  minimum or touch targets below 40 px.
- **FR-037**: The visual style MUST be a high-contrast royal arcade look (deep midnight and royal backgrounds, gold accents, bold vibrant B-I-N-G-O headers,
  glossy 3D ball, neon translucent dauber) with high-contrast text; effects (ball reveal, dauber stamp, FREE tooltip, claim celebration) MUST be reserved for
  those moments, and no logs, tickers or extra panels beyond those listed in this specification MUST appear on the match screen.
- **FR-038**: With a reduced-motion preference, effects MUST be replaced by brief simple transitions with all information intact; every interactive element
  MUST have visible hover, pressed and keyboard-focus states and work by touch, pointer and keyboard.
- **FR-039**: Animations MUST stay smooth on mid-range phones and laptops, and every screen MUST see calls and claims in the same order.

**Platform Integration and Authority**

- **FR-040**: The module MUST use the Platform Core's rooms, invites, host role, presence and chat, with the room's player limit chosen by the host (up to the
  configurable ceiling in FR-001), and Bingo MUST become a playable game on the Hub instead of "Coming Soon".
- **FR-041**: The server MUST be the only authority for card generation, ball selection, call order, claim validation and pattern status; clients MUST only
  send intents (draw, pause, resume, change interval, BINGO! with a card, card count, daub toggles for their own cards).
- **FR-042**: A player who disconnects and returns within the reconnect window MUST see the current cards, their daubs, the call history, the current ball and
  all pattern statuses; a player whose seat is released MUST stop playing and MUST NOT be able to rejoin that match.
- **FR-043**: Hosts and players MUST be able to leave from the match screen with confirmation; if the host's seat is released the platform's host handover
  applies and calling continues.

### Key Entities *(include if feature involves data)*

- **Match**: One game of Bingo in a room: chosen settings (player limit, card ceiling, patterns, caller mode and interval), the call history, the current
  ball, the status of each pattern, and its phase (lobby, running, finished).
- **Player Entry**: A seated person: name, color, host marker, chosen card count, issued cards, daubs, claim pacing and lock state, and connection state.
- **Bingo Card**: A 5 by 5 grid owned by one player: 24 numbers placed by the column rules plus the FREE centre; unique within the room.
- **Ball Call**: One drawn number (1 to 75) with its letter and its position in the call order.
- **Winning Pattern**: A named shape from the catalogue: its group, the cells of a card that must be daubed and called, whether it is in play, and its status
  (Available, or Claimed by a player with the card and the time).
- **Claim**: A player's BINGO! submission naming a card, with the server's decision (accepted, too late, or bogus) and the time received.
- **Daub**: A player's private toggle on one cell of one of their cards (including FREE); used by the server, together with the called numbers, to decide
  claims.
- **Chat Message**: A line typed by a person: sender, color, text, time; automated events are never chat messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A host can set up a room (player limit, card ceiling, patterns, calling mode) and start the match in under 60 seconds, and in under 10
  seconds when accepting the defaults.
- **SC-002**: Across 40 generated cards, 100% satisfy every card rule (5 by 5, each column inside its B-I-N-G-O range with no repeats, four numbers plus FREE
  in column N, FREE in the centre) and no two are identical.
- **SC-003**: With the ceiling at 3, a player can choose any count from 1 to 3 and the host sees each change in under 1 second.
- **SC-004**: In 100% of observed ball calls, no card cell (including FREE) is marked by the game; a cell shows a dauber only after its owner taps it, and the
  FREE tooltip appears on every new card until its FREE space is first tapped.
- **SC-005**: A newly drawn ball appears on every connected screen within 1 second of being drawn with the correct letter and number, and all screens show the
  same sequence of balls.
- **SC-006**: In automatic mode each draw happens within 0.5 seconds of the chosen 5, 8 or 10 second interval.
- **SC-007**: The history grid and the master board show every previously called ball under the correct letter after each draw, with a correct "Called n of
  75" count, in 100% of observed draws.
- **SC-008**: A claim is decided and its result shown (Claimed on all screens, or a private Bogus Bingo alert) within 1 second in 95% of claims.
- **SC-009**: In 100% of observed claims, validity matches the called numbers, the submitted card and the claimant's daubs (every pattern cell called or FREE
  and daubed); a pattern is never awarded twice, and a bogus claim is never visible to other players.
- **SC-010**: In 100% of observed matches the chat stream contains only messages typed by people, with no automated line of any kind.
- **SC-011**: On every tested screen from 320 to 2560 px wide, in both orientations, the page does not scroll, all card numbers are legible, card cells are at
  least 40 px across, and the playing area (cards, ball console, pattern tiles) uses at least 90% of the viewport apart from the header and gaps.
- **SC-012**: With reduced motion enabled, 100% of information and controls remain available and understandable.
- **SC-013**: Animations stay smooth (a steady frame rate with no sustained drops below 30 frames per second during ball reveals and dauber stamps) on a mid-range phone (for example an Android phone from 2021 or later with 4 GB of RAM) and
  a laptop during a full match, and a first-time player can find a called number, daub it, tap the FREE space and make a claim without instructions in under
  2 minutes.
- **SC-014**: In a stakeholder review, the card look, the ball console, the pattern dashboard and the overall calm, uncluttered feel are each rated at least 4
  out of 5 on average.
- **SC-015**: In a room of 200 people, 95% of ball calls reach every connected screen within 1 second.

## Assumptions

- Terms: a **pattern** is an entry of the Pattern Catalogue (nine in total); **card** is a player's 5 by 5 Bingo card; the **card ceiling** is the "maximum
  cards per participant" the host sets; a **daub** is the player's own mark; **New round** is the host's button on the results screen.
- Bingo follows the platform's room model and Housie's precedent: one host, invite links for players, no joining after the match starts, and the 60-second
  reconnect window. When a seat is released, host handover follows the platform's room rules, as in Housie; the claim pace and lock, the results screen and the new-round defaults are defined in this specification.
- The room's limit counts the host and ranges from 2 up to a configurable ceiling that starts at the same value Housie uses (200 for now) and has its own
  operator setting; the platform's current Bingo limit is raised as part of this feature. Beyond a handful of people, identity relies on names and a color tag rather than a distinct color per person.
- The host may play (chosen at setup, on by default) or act as a pure caller. A playing host sees a Master Board | My Cards switch on the left of the host
  screen.
- The card ceiling is 1 to 3 in this version, default 1. Defaults for patterns: Single Line, Four Corners and Blackout preselected; calling mode manual.
- The FREE space counts as "called" from the start but only counts toward a pattern once the player has daubed it themselves. Patterns that include the centre
  therefore require that tap; this is what the "Tap to claim your FREE space!" tooltip teaches.
- Any number on a card may be daubed whether or not it has been called (as in Housie); only daubs on called numbers count in a claim, and the game gives no
  feedback about correctness until a claim is made.
- A single BINGO! press submits the selected card and the server decides which patterns it completes; the player does not pick a pattern first. A claim awards
  every Available pattern the card completes at that moment.
- "Single Line" is one pattern: any complete row, column or either of the two diagonals wins it. "Blackout" and "Full House" are the same pattern. The other
  shapes follow the Pattern Catalogue appendix and are fixed (not rotated or mirrored), except where a pattern says "any".
- Each letter column has its own vivid color, used consistently on the card headers, the ball and the master board, so a letter-number pair is recognizable at
  a glance.
- Claims are limited to one every 2 seconds, and 3 bogus claims in a row lock that player's claims for 1 minute, exactly as in Housie.
- Winning patterns apply per card (a player may use any one of their cards for a claim); a player may win several patterns. There are no money, stakes or prize
  values in this version; winners are recognised on screen only.
- Daubs are private to each player and are stored for the match so reloads keep them and the server can check claims; they are cleared when the match ends.
- Patterns are fixed once the match starts; mid-match changes are out of scope for fairness.
- No sample images were supplied; the visual direction is the written royal arcade brief, reusing the platform's existing look and Housie's layout
  conventions where they fit.
- Platform versus game ownership: the Platform Core owns rooms, invites, presence, host role and chat; the Bingo module owns card generation, ball calling,
  daubs, pattern rules, claim validation and its own screens. The module runs on the existing Render deployment with no new services.
- All of this is verified by playing in a browser with at least two clients; no automated test suites are added (constitution Principle III). Reproducible
  checks use a development-only way to fix the ball sequence; production clients can never choose balls.
- Out of scope: money or prizes, bots as players, auto-daub or "suggested claims", spectators, saved match history, voice chat, 90-ball variants,
  automated lines in chat, a minimize-to-bar chat on wide screens, and more than 3 cards per player.

## Appendix A: Winning Pattern Catalogue (9)

Positions use rows 1 to 5 from top to bottom and the columns B, I, N, G, O from left to right; the centre is N3 (the FREE space). A pattern counts only
when every listed cell is daubed by the player and called (or is the FREE space).

| Group | Pattern | Cells required |
|-------|---------|----------------|
| Standard | Single Line | Any one complete row, any one complete column, or either diagonal (5 cells) |
| Standard | Four Corners | B1, O1, B5, O5 |
| Standard | Letter X | Both diagonals: B1, I2, N3, G4, O5 and O1, G2, N3, I4, B5 (9 cells) |
| Standard | Letter L | The whole B column plus the whole bottom row: B1 to B5 and I5, N5, G5, O5 (9 cells) |
| Standard | Blackout (Full House) | All 25 cells, including FREE |
| Custom/Thematic | Postage Stamp | Any one 2 by 2 block in a corner of the card: B1 I1 B2 I2, or G1 O1 G2 O2, or B4 I4 B5 I5, or G4 O4 G5 O5 (4 cells) |
| Custom/Thematic | Diamond | N1, I2, G2, B3, O3, I4, G4, N5 (8 cells, the centre is not needed) |
| Custom/Thematic | Kite | The upper-right 2 by 2 block G1, O1, G2, O2 plus the tail N3, I4, B5 (7 cells) |
| Custom/Thematic | Inner Square | The inner 3 by 3 block: I2, N2, G2, I3, N3, G3, I4, N4, G4 (9 cells) |

## Appendix B: Manual Verification Checkpoints

These are the owner's client-side checks, mapped to the requirements they prove. Each is run with at least two browser windows (host and player), from
a reproducible starting state, and recorded as scenario, expected result and observed result.

| # | Checkpoint | Expected result | Covers |
|---|------------|-----------------|--------|
| 1 | Start a match and inspect each player's card(s) | Every card is 5 by 5 with B 1-15, I 16-30, N 31-45 (four numbers plus FREE), G 46-60, O 61-75, no repeats | US2, FR-007, FR-008, SC-002 |
| 2 | Open a new card and look at the centre | FREE is unmarked and the pulsing "Tap to claim your FREE space!" tooltip shows; tapping FREE daubs it and removes the tooltip | US3, FR-012, FR-015, SC-004 |
| 3 | Host draws balls | The Current Ball shows the right letter and number (for example G-54) and each previous ball joins the history grid and the master board | US4, FR-019 to FR-022, SC-005, SC-007 |
| 4 | Type messages, draw balls, claim | Chat shows only the typed player messages and no automated line | US6, FR-031, SC-010 |
| 5 | Submit a valid pattern with BINGO! from a player | The pattern badge flips to Claimed on every connected client; an invalid submission shows "Bogus Bingo" to the claimant only | US5, FR-024 to FR-026, SC-008, SC-009 |

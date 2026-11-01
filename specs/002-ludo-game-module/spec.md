# Feature Specification: Responsive Ludo Game Module with Natural Dice & Hopping Pawn Animation

**Feature Branch**: `002-ludo-game-module`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Responsive Ludo Game Module with Natural Dice & Hopping Pawn Animation. Built upon the Platform Core room and chat engine. Visual focus: a polished 2D board with bright colors, tactile 3D-style pawns, and an animated 3D-style die. Scope: (1) adaptive viewport management where the board always fills the available screen (landscape: chat left, board center, dice/action panel right; portrait: board on top, dice section, collapsible chat/activity drawer), (2) high-contrast board with Yellow (P1 host), Green (P2), Red (P3), Blue (P4), start lanes, arrows, star safe squares and HOME, plus glowing player status panels, (3) a prominent active-turn system with a timer and a large, physically natural die that tumbles, bounces and settles (click, tap, spacebar or ROLL DICE button), (4) pawns that hop square by square along the 52-square path with highlighted route, dust puffs, squash-and-stretch and an explosive bounce home on capture, (5) server-validated rules and turn order, 6 to leave home or roll again, standard safe squares, and bot opponents with human-like pacing and chat commentary. Skip automated unit tests; verify through direct browser-based visual gameplay."

**Revision (2026-11-02)**: The landscape layout changed from three columns to two (board left; dice console, player bubbles, and the
minimizable chat and activity panel stacked on the right); player cards became compact circular bubbles; the die became bigger with
rounded edges and a more natural roll. Where the input description above says "chat left" or "glowing player status panels", this revision wins.

## Clarifications

### Session 2026-11-01

- Q: When a player's seat is released during a match, what happens to their pawns? → A: The pawns are removed from the board and the
  player is skipped from then on.
- Q: In which order should turns pass around the table? → A: Player-number order with the corners numbered clockwise: P1 Yellow (top-left),
  P2 Green (top-right), P3 Blue (bottom-right), P4 Red (bottom-left), so turns also go clockwise. This replaces the reference image's
  numbering (P3 Red, P4 Blue).
- Q: In a 2-player match, which two corners should the players start in? → A: Opposite corners: Yellow (P1) and Blue (P2), with the other two
  corners empty. Corner colors are therefore decided when the match starts, from the number of players seated.
- Q: Which events should give the player an extra roll in the same turn? → A: Rolling a 6, capturing a pawn, and bringing a pawn HOME; three
  6s in a row still forfeit the third.
- Q: What happens when a connected player keeps letting the 15-second timer run out? → A: After 3 missed turns in a row the player's seat is
  released as if they had left (with a warning after the 2nd missed turn).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Take a Turn: Roll a Natural-Looking Die (Priority: P1)

When a match starts, the room switches to the Ludo game screen. A dedicated "DICE ROLL" console shows whose turn it is, with a
pulsing highlighted border and a countdown. On the active player's own screen the console is unmistakable: a golden border
flashes around the roll target and a bouncy "Your Turn to Roll!" tooltip appears. The player rolls by clicking or tapping the
large die, pressing the spacebar, or pressing the big "ROLL DICE" button. The die tumbles, bounces and settles flat in its tray
like a real die, with a shadow, motion blur and a small shake of the dice console on impact. Everyone sees the same result.

**Why this priority**: Rolling is the heart of every turn. If it is unclear whose turn it is, or the die feels fake, the game
does not work.

**Independent Test**: Start a 2-player match. On P1's turn confirm the highlight, tooltip and timer; roll using each of the three
methods in turn (die, spacebar, button) and confirm each tumbles naturally and settles on a face that all players see. On the other
player's screen confirm a translucent, non-interactive "P1's TURN..." state.

**Acceptance Scenarios**:

1. **Given** it is my turn to roll, **When** the turn begins, **Then** my screen shows a golden border around the dice console, a
   bouncy "Your Turn to Roll!" tooltip, an enabled "ROLL DICE" button, and a countdown starting at 0:15.
2. **Given** it is another player's turn, **When** I look at the dice console, **Then** it shows that player's name and color
   (for example "P2's TURN...") with a translucent, non-interactive look, and I cannot roll.
3. **Given** it is my turn to roll, **When** I click or tap the die, press the spacebar, or press "ROLL DICE", **Then** the die
   tumbles, rotates, bounces and settles flat showing a result from 1 to 6, with a moving shadow, motion blur, and a brief screen
   shake.
4. **Given** the die has settled, **When** the result is shown, **Then** every player sees the same number, and the result is
   announced in the console and in the activity log.
5. **Given** the die is tumbling, **When** I click, tap, or press the spacebar again, **Then** nothing additional happens.
6. **Given** the countdown reaches 0:00 before I act, **When** it expires, **Then** the game rolls for me automatically and shows
   the same tumble.
7. **Given** the die is displayed, **When** I view it on a desktop or on a phone, **Then** it is at least 96 px wide on desktop and
   64 px wide on mobile, and it is a rounded-edge cube (no sharp corners).

---

### User Story 2 - Move a Pawn with Bouncy Square-by-Square Hops (Priority: P1)

After a roll, the pawns that can legally move pulse so the player can see their options. The player selects one and it hops
square by square along the track to its destination: each hop is a parabolic arc with a small dust puff and a squash-and-stretch
landing, while the route ahead is highlighted. If the pawn lands on an opponent's pawn on a non-safe square, the captured pawn
explodes back to its base with a bounce.

**Why this priority**: Visible, physical movement is the core of the requested experience, and movement must be unambiguous so
players trust the rules.

**Independent Test**: Roll a number of at least 4, select a pulsing pawn, and count the hops: one visible hop per square, none skipped,
no sliding or teleporting. Then arrange (or play to) a capture and confirm the explosive bounce back to base.

**Acceptance Scenarios**:

1. **Given** I have rolled and one or more pawns can legally move, **When** the roll result settles, **Then** each eligible pawn
   pulses and I can select one by clicking or tapping it.
2. **Given** I select an eligible pawn after rolling N, **When** it moves, **Then** it makes exactly N separate parabolic hops,
   one per square along the track in order, and never teleports or slides.
3. **Given** a pawn is hopping, **When** it lands on each square, **Then** a small dust puff appears and the pawn squashes then
   stretches back, and the squares it will cover are highlighted along its route.
4. **Given** a pawn leaves the home base on a 6, **When** it moves, **Then** it hops out onto its color's start square.
5. **Given** my pawn lands on a square holding an opponent's pawn that is not on a safe square, **When** it arrives, **Then** the
   opponent's pawn is captured and bounces back dramatically to its base, and the capture is announced.
6. **Given** my pawn lands on a safe square that holds an opponent's pawn, **When** it arrives, **Then** no capture occurs and
   both pawns share the square.
7. **Given** a roll with no legal move for any of my pawns, **When** the result settles, **Then** the game tells me there is no
   move and passes the turn after a short pause.
8. **Given** other players are watching, **When** a pawn hops, **Then** they see the same hops and the same capture in the same
   order.
9. **Given** the countdown for choosing a pawn expires, **When** I have not chosen, **Then** the game moves one of my eligible
   pawns for me (using the same preferences as the bots, such as finishing or capturing first) and shows the usual hops.

---

### User Story 3 - Play a Full Match with Standard Rules (Priority: P1)

Two to four players take turns in order. A 6 is needed to bring a pawn out of the base and also grants a bonus roll. Pawns travel
once around the 52-square track, then up their own colored home lane to the central HOME, needing an exact roll to finish. Star
squares and each color's start square are safe. The first player to bring all four pawns HOME wins, and the room celebrates. The
server decides every roll and move; no client can choose a die result, skip ahead, or move out of turn.

**Why this priority**: A game that plays fair and consistently is what turns animations into a real game.

**Independent Test**: Play a 2-player match to completion, checking turn order, 6-to-exit, bonus rolls, safe squares, capture,
exact finish and the winner announcement; then try to act out of turn from a second window and confirm it is refused.

**Acceptance Scenarios**:

1. **Given** the host starts a match, **When** play begins, **Then** the first turn goes to P1 (Yellow, host) and turns then pass
   in seat order P1, P2, P3, P4 among the seated players (clockwise around the board).
   1a. **Given** a match with 2 players, **When** it starts, **Then** P1 plays Yellow (top-left) and P2 plays Blue (bottom-right), the
   opposite corners; **given** 3 players, **then** P1 to P3 play Yellow, Green and Blue; **given** 4 players, **then** P1 to P4 play Yellow,
   Green, Blue and Red; unused corners stay visible but inert.
2. **Given** all my pawns are in the base, **When** I roll a number other than 6, **Then** no pawn can move and the turn passes;
   **when** I roll a 6, **then** I can bring a pawn out and I roll again.
3. **Given** I rolled a 6, **When** I finish moving, **Then** I get another roll in the same turn; **given** I roll three 6s in a
   row, **then** the third 6 gives no move and the turn passes.
4. **Given** my pawn captures an opponent's pawn or reaches HOME, **When** the move completes, **Then** I get a bonus roll.
5. **Given** a pawn needs exactly 3 to reach HOME, **When** I roll 5, **Then** that pawn cannot move this turn and is not shown
   as eligible.
6. **Given** my fourth pawn reaches HOME, **When** it lands, **Then** the match ends, I am announced as the winner to everyone,
   and the final standings (pawns home per player) are shown.
7. **Given** it is not my turn, **When** I try to roll or move (including by sending requests from another window), **Then** the
   game refuses and nothing changes.
8. **Given** any roll, **When** the die result is produced, **Then** it comes from the server and cannot be chosen or influenced
   by any player.

---

### User Story 4 - A Board That Always Fills the Screen (Priority: P1)

The board is always a perfect square, as large as the screen allows, with nothing to scroll. On laptops and tablets in landscape the
screen has two columns: the board maximized on the left, and on the right the dice console, the player bubbles, and below them the
chat and activity panel, which can be minimized. On phones and tablets in portrait the board sits at the top with a dedicated dice section below it and a
collapsible "peek" drawer for chat and the activity log. Resizing the window or rotating the device re-fits the board immediately.

**Why this priority**: The constitution makes full use of the screen a core requirement, and a small board makes the game hard to
play.

**Independent Test**: Open a match on a desktop and on a phone. Resize the window from small to very large and rotate the phone;
at every step confirm the board is square, fully visible, scrolling is never needed, and the layout switches between two columns
and stacked at the right point.

**Acceptance Scenarios**:

1. **Given** a landscape screen, **When** I view a match, **Then** I see the board on the left, and on the right the dice console, the
   player bubbles, and the chat and activity panel below them, with no page scrolling.
2. **Given** a landscape screen, **When** I minimize or reopen the chat panel, **Then** the panel collapses to its title bar or expands again,
   the board stays square, and the panel's open or minimized state is remembered on this device.
3. **Given** a portrait screen, **When** I view a match, **Then** the board is at the top using the full available width (never taller
   than 85% of the screen height), a dice section is directly below, and chat and activity are in a collapsible peek drawer.
4. **Given** any screen size from 320 to 2560 px wide, **When** I view a match, **Then** the board is a perfect square, completely
   visible, with all squares, pawns and labels in view and no scrolling.
5. **Given** a match is in progress, **When** I resize the window or rotate the device, **Then** the board and bubbles re-fit
   immediately, the game state is preserved, and any animation in progress finishes without breaking the layout.
6. **Given** a phone-sized board, **When** I tap a pawn, **Then** selection is easy and reliable even though squares are small, and
   when two of my eligible pawns share a square they behave identically, so whichever I tap moves.

---

### User Story 5 - See Who Is Here: Circular Player Bubbles (Priority: P2)

Each player has a compact circular bubble: their avatar in a ring of their color, name, host crown, an "n/4" home badge, and
connection state (connected, reconnecting, or left). The bubble of whoever's turn it is glows and pulses. The board's four home
corners are labeled with the same player slots. Bubbles are small on purpose so the chat panel keeps the space.

**Why this priority**: Presence and progress make the match readable at a glance, but the game can be played without polish here.

**Independent Test**: Play with two or more players; disconnect one and verify their bubble shows reconnecting then left; move
pawns home and verify the progress count updates for everyone.

**Acceptance Scenarios**:

1. **Given** a match is in progress, **When** I look at the screen, **Then** every seated player has a bubble showing avatar,
   name, color, host marker, "n/4" home count, and connection state, without covering any board square.
2. **Given** a player's turn begins, **When** it is their turn, **Then** their bubble glows and pulses, and everyone else's bubbles
   are calm.
3. **Given** a pawn reaches HOME, **When** it lands, **Then** its owner's "Home" count increases for everyone immediately.
4. **Given** a player loses connection, **When** it happens, **Then** their panel shows "Reconnecting" for everyone, and shows
   "Left" if they do not return in time.

---

### User Story 6 - Play Solo Against Believable Bots (Priority: P2)

In "Play with AI" matches, bot opponents behave like people. On a bot's turn it pauses about 1.5 seconds, then rolls with the same
natural tumble, picks a pawn using sensible choices (finish a pawn, capture, leave home on a 6, run from danger), and hops it along
the path. Bots post short commentary in the chat ("Nova rolled a 6!", "Blaze captured Zippy's pawn!").

**Why this priority**: It lets one person enjoy the full game right away; it depends on stories 1 to 3.

**Independent Test**: Start a Play with AI match and watch several bot turns: confirm the pause, the tumble, the hops, and the chat
commentary; confirm bots never move out of turn or break the rules.

**Acceptance Scenarios**:

1. **Given** it is a bot's turn, **When** the turn begins, **Then** the console shows the bot's name and after about 1.5 seconds
   the bot's die tumbles naturally and settles on a server-decided result.
2. **Given** a bot has eligible pawns, **When** it chooses, **Then** it picks a legal pawn (preferring to finish, capture, or exit
   home over other moves) and the pawn hops square by square like any human move.
3. **Given** a bot rolls, moves, captures, or gets home, **When** it happens, **Then** a short comment appears in chat in the
   bot's color.
4. **Given** the human plays against 1 to 3 bots, **When** the match runs, **Then** every rule applies equally to bots and humans.

---

### User Story 7 - Chat and Activity From the Match Screen (Priority: P2)

The room chat from the platform stays available during the match: under the dice console in landscape (with an option to minimize it) and in a peek drawer in portrait.
Alongside chat there is an activity log of game events (rolls, moves, captures, pawns home, turn changes). Messages keep the
player's color tags, and the drawer shows an unread indicator.

**Why this priority**: Chat is a platform feature that must keep working inside the game screen, including on phones.

**Independent Test**: From a phone in portrait, open the peek drawer, send a message, and confirm it reaches the other player;
confirm game events appear in the activity log.

**Acceptance Scenarios**:

1. **Given** a match in portrait, **When** I open the peek drawer, **Then** I can read and send chat messages and switch to the
   activity log, and the drawer collapses again without losing messages or half-typed text.
2. **Given** a match in landscape, **When** I use the chat panel under the dice console, **Then** chat and the activity log are available there,
   I can minimize it, and it scrolls independently of the board.
3. **Given** the drawer is collapsed, **When** new chat messages arrive, **Then** an unread count is shown on the drawer handle.
4. **Given** game events happen, **When** they occur, **Then** each appears in the activity log in order with the acting player's
   name and color.

---

### User Story 8 - Keep Playing Through Drops, Timeouts and Departures (Priority: P3)

If a player's connection drops, the game keeps going. Within the reconnect window they return to the exact current state; their
turns during the gap are auto-played by the timer. If they do not return, their seat is released. Hosts and players can leave from
a Quit button.

**Why this priority**: The experience must stay fair and unblocked on the real-world connection quality of phones and a free-tier host.

**Independent Test**: In a 3-player match disconnect one player: confirm turns keep flowing, then reconnect within the window and
confirm the state is current; repeat without reconnecting and confirm the seat is released and play continues.

**Acceptance Scenarios**:

1. **Given** a player's connection drops, **When** their turn comes, **Then** the countdown runs and the game plays the turn for
   them automatically so others are never blocked.
1a. **Given** a connected player has missed 2 turns in a row, **When** their next turn begins, **Then** they see a clear warning that
   missing another turn will remove them; **given** they miss a third turn in a row, **then** their seat is released, their pawns are
   removed, an announcement is shown, and play continues; **given** they act manually at any point, **then** the missed-turn count resets.
2. **Given** a player reconnects inside the reconnect window, **When** they return, **Then** they see the current board, dice
   state, timer, and chat immediately and can act on their turn.
3. **Given** a player does not return in time, **When** their seat is released, **Then** their pawns are removed from the board,
   they are skipped in turn order, an announcement is shown, and the match continues for the others.
4. **Given** only one human player remains in an online match, **When** the others have left, **Then** that player is told they are
   the last player and can keep playing or quit, and if they quit the room closes.
5. **Given** I press "Quit", **When** I confirm, **Then** I leave the match and return to the Hub, and my seat is released.
6. **Given** the browser tab is in the background, **When** I return to it, **Then** the board shows the latest state without
   replaying a backlog of animations.

---

### Edge Cases

- A roll of 6 when no pawn can use it (for example every pawn is blocked from finishing): the bonus roll still applies, and that 6 counts
  toward the three-sixes limit.
- Two of my own pawns on the same square: both stay selectable and clearly distinguishable; a choice is offered when needed.
- A pawn one square from HOME and a roll of 1: it can finish; a roll larger than the remaining distance makes it ineligible.
- A pawn passes over opponent pawns without stopping: no capture; only landing captures.
- Only the landing square can capture, but it may hold several opposing pawns (of one or more opponents): all of them are captured and each
  bounces back to its own base; a bonus roll may then start the next move.
- Window resized or phone rotated during a die tumble or a hop: the animation completes or settles cleanly in the new size.
- A very small phone (320 px wide): every square, pawn and label remains visible, and pawn selection remains reliable.
- The device prefers reduced motion: movement and rolling are shown with simple, quick, non-tumbling transitions and clear result
  highlights, with no screen shake.
- A message or event arrives while an animation is playing: it is queued so animations stay in order.
- Two players press roll at nearly the same instant on different devices: only the player whose turn it is can roll.
- The host leaves mid-match: the platform hands over the host role; Ludo continues with seat order unchanged.
- A match with 2 players: they play opposite corners (Yellow and Blue); the other two corners remain visible but inert.
- A player's color changes between the lobby and the match (for example a 2-player match moves P2 from the lobby's Green to Blue): their
  chat color tag and panel switch to the new color when the match starts, and earlier chat messages keep the color they were sent with.
- Connection is slow: the player sees "waiting for server" feedback instead of a frozen, unresponsive die.

## Requirements *(mandatory)*

### Functional Requirements

**Board and Layout**

- **FR-001**: The Ludo screen MUST show a classic 15 by 15 cross-shaped board: four colored home bases (Yellow top-left, Green top-right,
  Red bottom-left, Blue bottom-right), a shared 52-square track, four colored home lanes leading to a central "HOME", colored start
  squares with directional arrows, and star-marked safe squares.
- **FR-002**: The board MUST always be a perfect square and MUST be shown completely, with no page scrolling, on every screen size
  from 320 to 2560 px wide in both orientations.
- **FR-003**: The board MUST use the largest square that fits the space the layout gives it, and MUST re-fit immediately when the
  window is resized, the device is rotated, or the chat panel is minimized or opened.
- **FR-004**: In landscape, the screen MUST be two columns: the board maximized on the left, and on the right the dice console, the
  player bubbles, and below them the chat and activity panel with an option to minimize it.
- **FR-005**: In portrait, the screen MUST be stacked: board at the top using the full available width and never taller than 85% of the
  viewport height, a dice section directly below, and chat and activity log in a collapsible peek drawer. On short portrait screens
  (height under about 700 px) the dice section and player bubbles MUST switch to a compact form and the board MUST shrink as needed so
  that the header, board, dice section, panels, and drawer handle all fit without scrolling.
- **FR-006**: The chat panel's minimized or open state MUST be remembered on the device.
- **FR-007**: The match header MUST show the room name and code, the invite link with a copy control, small player avatars, a "Lobby"
  control, and a "Quit" control. "Lobby" MUST show the players, invite link and room details without leaving or pausing the match;
  "Quit" MUST ask for confirmation before leaving.
- **FR-008**: The board's four home corners MUST be labeled with each player's slot (P1, P2, P3, P4; slot order is the host first, then the
  other players by seat order at match start), with a "(Host)" tag that follows the current host, and colors MUST be high contrast and
  saturated, with white or very light squares for the track.

**Player Presence**

- **FR-009**: Each seated player MUST have a compact circular bubble showing avatar in a ring of their color, name, host marker, "n/4"
  home progress, and connection state (connected, reconnecting, left); bubbles MUST NOT cover board squares.
- **FR-010**: The bubble of the player whose turn it is MUST be visibly highlighted for everyone.

**Turn System and Dice**

- **FR-011**: A "DICE ROLL" console MUST show whose turn it is ("YOUR TURN!" for me, otherwise the other player's name and color), a
  pulsing active border, and a countdown that starts at 0:15 for each action (roll, then pawn choice).
- **FR-012**: When my turn to roll begins, my screen MUST show a golden border around the roll target and a bouncy "Your Turn to
  Roll!" tooltip; other players MUST see a translucent, non-interactive status.
- **FR-013**: The die MUST be large and clearly visible within its tray: at least 96 px on desktop and 64 px on mobile, drawn as a cube
  with rounded edges and corners.
- **FR-014**: I MUST be able to roll by clicking or tapping the die, pressing the spacebar, or pressing the "ROLL DICE" button, only
  when it is my turn to roll and no roll is already in progress.
- **FR-015**: Rolling MUST show a natural three-dimensional tumble: the die travels across its tray, rotates, bounces with decaying
  height, and settles flat on one face, with a moving shadow, motion blur during tumbling, and a brief shake of the dice console on
  landing.
- **FR-016**: The displayed face MUST always equal the server-decided result, and every player MUST see the same result.
- **FR-017**: When the countdown expires, the game MUST act for the player automatically (roll, or move an eligible pawn using the same
  preference order as the bots: finish a pawn, capture, leave the base on a 6, escape danger, land on a safe square, otherwise the pawn
  with the greatest progress), using the same animations. A turn in which any action was auto-played counts as a missed turn.
  After 2 missed turns in a row the player MUST see a warning that missing another turn will remove them; after 3 missed turns in a row
  the player's seat MUST be released as if they had left (FR-039). Any manual action by the player resets the count to zero.

**Pawn Movement**

- **FR-018**: Pawns MUST look like glossy three-dimensional tokens with drop shadows, in their player's color.
- **FR-019**: After a roll, every pawn that can legally move MUST pulse, and I MUST be able to select one by click or tap; ineligible pawns
  MUST NOT be selectable.
- **FR-020**: A selected pawn MUST move by performing one separate parabolic hop per square along its path, in order, never teleporting
  or sliding; a move of N squares MUST show exactly N hops.
- **FR-021**: While a pawn moves, the squares of its route MUST be highlighted, each landing MUST show a small dust puff and a
  squash-and-stretch, and the pawn MUST end settled on its destination.
- **FR-022**: A capture MUST send the opponent's pawn back to its base with an explosive bounce and a visible announcement.
- **FR-023**: If no pawn can legally move after a roll, the game MUST say so and pass the turn after a short pause.
- **FR-024**: When two pawns share a square, or a pawn is hard to tap on a small board, selection MUST remain easy and unambiguous
  (enlarged tap areas; eligible pawns take priority over ineligible ones; two eligible pawns of mine on one square are equivalent, so
  either one moves).

**Rules and Authority**

- **FR-025**: The server MUST generate every die result (1 to 6), validate every roll and move, enforce turn order, and reject any
  action out of turn or for an ineligible pawn.
- **FR-026**: Turns MUST pass in seat order P1, P2, P3, P4 among the seated players, which is clockwise around the board. When the match
  starts, corners MUST be assigned from the number of players seated: 4 players use Yellow (P1, host), Green (P2), Blue (P3), Red (P4); 3
  players use Yellow, Green, Blue; 2 players use Yellow (P1) and Blue (P2), the opposite corners. Unused corners MUST stay visible but inert.
- **FR-027**: A pawn MUST need a 6 to leave the base and enter its color's start square; every 6 rolled MUST also grant a bonus roll,
  even if no pawn can use it; three 6s in a row MUST end the turn without a move on the third.
- **FR-028**: A pawn MUST travel the 52-square shared track from its start square, then up its own colored home lane to HOME, and MUST
  need an exact roll to land on HOME; a roll that overshoots makes that pawn ineligible.
- **FR-029**: Star-marked squares and each color's start square MUST be safe: no capture occurs there and pawns of different colors
  may share them. Landing on a non-safe square holding one or more opponent pawns MUST capture all of them. Pawns passing over others do
  not capture.
- **FR-030**: Capturing a pawn or bringing a pawn HOME MUST grant a bonus roll.
- **FR-031**: The first player to bring all four pawns HOME MUST be declared the winner for everyone, and final standings (pawns home
  per player) MUST be shown.
- **FR-032**: Game state MUST be synchronized so all players always see the same board, dice, timer and turn; reconnecting players MUST
  receive the current state before they can act, without replaying a backlog of animations.

**Bots**

- **FR-033**: In Play with AI matches, bots MUST take turns under exactly the same rules as humans.
- **FR-034**: A bot's turn MUST pause about 1.5 seconds, then roll with the same natural tumble, then choose a legal pawn (preferring to
  finish, capture, or exit home) and hop it along its path.
- **FR-035**: Bots MUST post short commentary in chat for notable events (rolls of 6, captures, pawns home, wins).

**Chat, Activity, and Platform Integration**

- **FR-036**: The platform room chat MUST be available throughout the match: in a minimizable panel under the dice console in landscape
  and in the peek drawer in portrait, with an unread indicator when minimized or collapsed.
- **FR-037**: An activity log of game events (rolls, moves, captures, pawns home, turn changes, departures) MUST be available beside chat,
  in order, with the acting player's name and color.
- **FR-038**: The Ludo module MUST use the Platform Core's rooms, invites, host role, presence and chat without reimplementing them, and
  MUST declare its seat colors as Yellow, Green, Blue, Red in that order (clockwise from the top-left corner), with the final corner for
  each player decided when the match starts (FR-026).
- **FR-039**: When a player's seat is released during a match (they left, lost connection past the reconnect window, pressed Quit, or missed 3
  turns in a row), their pawns MUST be removed, they MUST be skipped in turn order, and the match
  MUST continue for the remaining players; a released player MUST NOT be able to rejoin that match.

**Accessibility, Motion and Quality**

- **FR-040**: With a reduced-motion preference, rolling and movement MUST use brief, simple transitions with clear result and destination
  highlights, and no screen shake; all game information MUST remain available.
- **FR-041**: Every interactive element MUST have visible hover, pressed and keyboard-focus states, and the die and pawns MUST be usable by
  touch, pointer, and keyboard.
- **FR-042**: Animations MUST stay smooth (frame time at or under 20 ms for 95% of frames) on mid-range phones and laptops (reference: a
  4x CPU slowdown in browser tools), and MUST play in the same order on every player's screen.
- **FR-043**: The game MUST give clear feedback while waiting for the server (for example a "rolling..." or "waiting" state) instead of
  appearing frozen.

### Key Entities *(include if feature involves data)*

- **Match**: One game of Ludo in a room: the seated players, whose turn it is, the current phase (waiting to roll, rolling, choosing a
  pawn, moving, finished), turn timer, consecutive-six count, and winner.
- **Player Slot**: A seat in the match: slot number (P1 to P4), corner color (assigned when the match starts), display name, host marker, bot
  or human, connection state, and pawns
  home count.
- **Pawn**: One of four tokens per player: owner, location (base, a track square, a home-lane square, or HOME), and whether it can move
  after the current roll.
- **Square**: A position on the board: track squares (52), start squares, safe (star) squares, home-lane squares, and the central HOME.
- **Die Roll**: A server-decided result from 1 to 6, the player who rolled, and the turn it belongs to.
- **Move**: A pawn's journey from one location to another for a roll: the squares it passes, and any capture or arrival at HOME.
- **Activity Entry**: A log line describing a game event with time, actor and color.
- **Layout Preference**: Per-device chat panel state (open or minimized).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On every tested screen from 320 to 2560 px wide, in portrait and landscape, the board is a perfect square, completely
  visible, and needs no scrolling.
- **SC-002**: In landscape, the board uses at least 90% of the smaller dimension of the space available to it; in portrait it uses at
  least 90% of the smaller of the available width and 85% of the viewport height.
- **SC-003**: Rotating a device or resizing a window re-fits the board in under 0.5 seconds with game state unchanged.
- **SC-004**: In 100% of observed moves, a move of N squares shows exactly N distinct hops with a dust puff and squash on each landing, and
  never slides or teleports.
- **SC-005**: Every die roll tumbles for between 1 and 2 seconds and settles on the number the server decided; across 100 observed rolls,
  the shown number matches the announced result every time.
- **SC-006**: All players see the same roll result and the same pawn movements, with no more than 1 second difference between screens, in
  at least 95% of turns under normal network conditions.
- **SC-007**: A first-time player completes a full turn (roll and pawn move) in under 20 seconds without instructions.
- **SC-008**: Bot turns pause 1.5 seconds (plus or minus 0.3 seconds) before rolling, and bot commentary appears within 1 second of each
  notable event.
- **SC-009**: An action attempted out of turn, or for an ineligible pawn, is refused 100% of the time, and no player can choose or change a
  die result.
- **SC-010**: A player who does nothing is auto-played within 1 second after the countdown reaches 0:00, and a player who misses 3 turns in a
  row is removed and announced within 1 second of the third countdown ending, after being warned following the second.
- **SC-011**: A player who reconnects within the reconnect window sees the current board, turn and timer within 2 seconds and can act on
  their turn.
- **SC-012**: Across matches with 2, 3 and 4 players and with bots, the winner is announced correctly when the fourth pawn reaches HOME in
  100% of observed games.
- **SC-013**: With reduced motion enabled, 100% of game information and controls remain available and understandable.
- **SC-014**: Animations stay visually smooth (no visible stutter; 95% of frames at or under 20 ms under a 4x CPU slowdown) on a
  mid-range phone and a laptop during a 4-player match.
- **SC-015**: In a review against the reference image, stakeholders rate the board, pawns, dice and player bubbles as meeting or exceeding its polish.

## Assumptions

- This feature builds on the Platform Core ([specs/001-platform-hub-rooms](../001-platform-hub-rooms/spec.md)): rooms, invite links, host
  role, presence, reconnect window (60 seconds), chat, and the game stage. Ludo replaces the placeholder game board and engine and
  uses the platform's room shell, adapted to the layouts here once a match starts.
- Ludo declares its own seat colors in clockwise order: Yellow (P1, host, top-left), Green (P2, top-right), Blue (P3, bottom-right), Red (P4,
  bottom-left); the Platform Core's earlier default order (Red, Green, Yellow, Blue) is updated for Ludo as part of this feature. The board
  itself keeps the colors in the reference positions (Yellow top-left, Green top-right, Red bottom-left, Blue bottom-right).
- The reference image is a visual style reference. Where it differs from the written scope (it shows a two-column layout, and labels the
  bottom corners P3 Red and P4 Blue), the written scope and the clarified numbering win: landscape uses two columns (board left; dice, player
  bubbles, and chat on the right), and the bottom-right corner is P3 (Blue) and the bottom-left is P4 (Red).
- Turn order is seat order P1, P2, P3, P4 (clockwise). Corner colors are assigned when the match starts from the number of players (2: Yellow
  and Blue; 3: Yellow, Green, Blue; 4: all). The Platform Core must therefore let a game assign final player colors at match start; until
  then the lobby shows the seat colors in the order Yellow, Green, Blue, Red.
- House-rule defaults (standard casual Ludo): 6 to leave the base; 6, capture, and reaching HOME each grant a bonus roll; three 6s in a row
  forfeit the third; exact roll to finish; no blockades; star squares and start squares are safe.
- "52-square path" means the shared loop each pawn follows from its start square, then a colored lane of five squares ending at the central
  HOME. Each pawn travels once around the loop.
- The countdown is 15 seconds for each action (the roll, then the pawn choice). When it expires the game plays the action automatically
  (roll, or the best eligible move). A player who misses 3 turns in a row is removed from the match like a player who left; in a Play with AI
  match this ends the match, because the only human is gone. The Platform Core must let a game release the seat of a player who is still
  connected.
- A released seat during a match removes that player's pawns from the board and skips them thereafter; their player bubble shows "Left" and
  they cannot win. A match with a single remaining human continues until they quit.
- A finished match shows the winner and standings with a way back to the Hub. Rematches and spectators are out of scope.
- Bots use simple preference-based choices (finish, capture, exit home, avoid danger); advanced strategy is out of scope.
- "3D" pawns and dice are rendered to look three-dimensional (volume, gloss, lighting, shadows) on the 2D board; a true 3D scene is not
  required.
- Sound effects are out of scope beyond the platform's existing sound toggle; adding roll and hop sounds is optional.
- Testing is by direct, browser-based visual gameplay on desktop and mobile viewports (including rotation) per the constitution; no automated
  unit-test suites are created for this feature.
- Production hosting stays on Render's free plan with the existing keepalive; no new services or storage are needed, and matches end if the
  service restarts, as rooms do today.

# Feature Specification: Ludo

**Feature Branch**: `003-ludo-game`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Add a new game Ludo with 1. hyper realistic visuals, 2. hyper realistic natural 3D dice roll effect, 3. support max of 4 players in the room, 4. enable chat across room members, 5. create multiple themes for the Ludo boards and the pawn visuals: Avenger, Halloween, Diwali, etc."

**Builds on**: [001-base-platform-experience](../001-base-platform-experience/spec.md) (rooms, lobby, readiness, rematch, chat, reconnection) and [002-games-landing-page](../002-games-landing-page/spec.md) (the games catalog and room setup). Where this feature changes an earlier requirement, the change is listed under "Changes to Existing Requirements".

## Clarifications

### Session 2026-10-30

- Q: What does "play solo with an AI/computer partner" mean for Ludo? → A: The player plays alone against 1 to 3 computer opponents, started from the catalog's "Play against AI" with no room. Computer players filling empty seats in an online room are not included.
- Q: Where is it recorded? → A: As its own user story (User Story 8) with its own requirements, so that User Story 1 stays about room matches.
- Q: Who takes the first turn in a match? → A: The game picks the first player at random from the players in the match, in room and solo matches alike.
- Q: What happens when a player's pawns stand together and an opponent lands on them? → A: Two or more pawns of the same player on the same square form a block, and opponents cannot land on a block.
- Q: Can opponents move past a block? → A: Yes, they may jump over it; they just cannot stop on it.
- Q: What happens when someone opens the invitation after the match has started? → A: They are told the match is in progress and cannot join it, and they can wait in the room until the match ends and the room returns to the lobby.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play a full Ludo match with friends in a room (Priority: P1)

A host picks Ludo on the landing page, creates a private room for 2 to 4 players, and shares the invitation. Friends join from laptops and phones, mark themselves ready, and the host starts the match. Each player gets a color and four pawns. Players take turns rolling the die and moving pawns around the board under the classic Ludo rules until one player brings all four pawns home. The game, not any player's device, decides every roll and every legal move.

**Why this priority**: Without a correct, complete, fair match nothing else in this feature has value. This story alone is a playable Ludo.

**Independent Test**: Create a Ludo room for 4 people, start the match, and play to a winner. Repeat with 2 and 3 players. Check each rule scenario below, and confirm a player cannot roll or move out of turn.

**Acceptance Scenarios**:

1. **Given** a Ludo room with 2 to 4 ready players, **When** the host starts the match, **Then** every player is shown with a distinct color and four pawns in their base, the board and turn order are visible to everyone, and the game picks the first player at random and announces it.
2. **Given** it is a player's turn and no pawn of theirs is on the board, **When** they roll a 6, **Then** they may bring one pawn onto their start square and roll again.
3. **Given** it is a player's turn and no pawn of theirs is on the board, **When** they roll anything other than a 6, **Then** the roll is shown and the turn passes to the next player.
4. **Given** a player has pawns that can legally move after a roll, **When** the roll settles, **Then** only the pawns that can legally move are offered, and choosing one moves it exactly the rolled number of squares.
5. **Given** a pawn lands on a square holding an opponent's pawn that is not on a protected square, **When** the move completes, **Then** the opponent's pawn returns to its base and the capturing player rolls again.
6. **Given** a pawn is on a protected square (a start square or a star square), **When** an opponent's pawn lands there, **Then** nothing is captured and both pawns share the square.
7. **Given** a pawn is near home, **When** the roll is larger than the squares remaining, **Then** that pawn cannot move, and the player may move another pawn or the turn passes if none can.
8. **Given** a player rolls three 6s in a row, **When** the third 6 settles, **Then** that turn ends without moving any pawn.
9. **Given** a player brings their fourth pawn home, **When** the move completes, **Then** the match ends, the winner is announced to everyone, and the room offers the base platform's rematch and back-to-lobby choices.
10. **Given** a player's device sends a roll, a move, or a chosen result that is not theirs to make at that moment, **When** the game receives it, **Then** it is refused with a plain explanation and the match is unchanged.
11. **Given** two or more pawns of the same player stand together on an unprotected square, **When** an opponent's pawn could otherwise land on that square, **Then** that move is not offered, and the board shows the block clearly. Opponents may still move past the block, as long as they do not stop on it.

---

### User Story 2 - Roll a natural, realistic 3D die (Priority: P1)

When it is their turn, a player taps or clicks "Roll" and sees a lifelike die thrown onto the board: it tumbles, bounces off the surface and the board edge, spins, and settles with one face up, with believable lighting and shadows. Every roll looks different. The face it settles on is exactly the number the game decided, and every player in the room sees the same roll at the same time.

**Why this priority**: The dice roll is the signature moment of Ludo and the first thing the owner asked to be hyper realistic. It must also be trustworthy, because players will judge fairness by what they see.

**Independent Test**: Roll many times with 2 or more people watching on different devices. Confirm each roll looks different and natural, settles within a few seconds, shows the same final face to everyone, and always matches the number shown as text and used by the game.

**Acceptance Scenarios**:

1. **Given** it is a player's turn and they have not yet rolled, **When** they choose "Roll", **Then** a 3D die is thrown onto the board and visibly tumbles, bounces, and settles over roughly 1 to 3 seconds.
2. **Given** a roll is in progress, **When** it settles, **Then** the top face shows exactly the number the game decided, and the number is also stated in text.
3. **Given** two players watching the same roll on different devices, **When** the roll plays, **Then** both see the same throw start and settle on the same face, within about one second of each other.
4. **Given** several rolls in a row, **When** the player watches them, **Then** the path, spin, and resting position of the die differ each time.
5. **Given** a roll is in progress, **When** anyone tries to choose or move a pawn, **Then** nothing happens until the die has settled.
6. **Given** a viewer does not want to wait, **When** they use the skip control during a roll, **Then** the final result is shown at once for that viewer only, and nobody else's view changes.
7. **Given** a viewer joins or returns to the room during or just after a roll, **When** the board loads, **Then** they see the settled die and the correct result without a replay that contradicts it.

---

### User Story 3 - A hyper realistic board and pawns (Priority: P2)

The Ludo board looks like a real, beautifully made object lying on a table: believable materials, depth, lighting, and shadows. The pawns are detailed 3D pieces that move step by step along the path, are visibly knocked back to base when captured, and celebrate when they reach home. Players can look at the board in an angled 3D view or switch to a flat top-down view.

**Why this priority**: Visual quality is the owner's headline request, but a match is still playable without it, so it follows the core match and the dice.

**Independent Test**: Start a match on a laptop and on phones. Review the board, pawns, movement, capture, and finish. Ask outside reviewers to rate how realistic and attractive it looks.

**Acceptance Scenarios**:

1. **Given** a match has started, **When** the board appears, **Then** it shows realistic materials, lighting, depth, and soft shadows for the board, the pawns, and the surface it rests on.
2. **Given** a player moves a pawn, **When** the move plays, **Then** the pawn travels square by square along the path rather than jumping, and the destination is clear.
3. **Given** a capture happens, **When** it plays, **Then** the captured pawn is visibly sent back to its base so everyone understands what happened.
4. **Given** a pawn reaches home, **When** it arrives, **Then** a short celebratory effect plays.
5. **Given** the player prefers a simpler view, **When** they switch to the flat top-down view, **Then** every square, pawn, and protected square is still clear and usable.
6. **Given** the match screen is opened, **When** the 3D visuals are still preparing, **Then** a clear loading state is shown, and the game never blocks on visuals the device cannot show (see the lite option in User Story 7).

---

### User Story 4 - Chat with everyone in the room during the match (Priority: P2)

All members of the room can send and read chat messages throughout the match, whether or not it is their turn, without the chat covering the board. Alongside chat, a short game log states what just happened (for example, "Pat rolled a 6" or "Sam captured Alex's pawn") so people who looked away can catch up.

**Why this priority**: Playing with friends is social, and chat is expected. The room's chat already exists in the base platform, so this story is about keeping it present and usable during play.

**Independent Test**: In a 4-player match on a laptop and phones, send messages from each device while the match is running and confirm everyone sees them, the board stays usable, and the game log is separate from chat.

**Acceptance Scenarios**:

1. **Given** a match is running, **When** any member sends a chat message, **Then** every member in the room sees it, with the sender's name, in the order sent.
2. **Given** messages were sent in the lobby before the match, **When** the match screen opens, **Then** those messages are still available.
3. **Given** a phone-sized screen, **When** the match is shown, **Then** chat opens and closes from a control without hiding the whole board, and shows how many messages are unread while closed.
4. **Given** a wide screen, **When** the match is shown, **Then** chat is visible beside the board without covering it.
5. **Given** it is another player's turn, **When** a member types and sends a message, **Then** the game and its turn are not affected in any way.
6. **Given** something happens in the game, **When** it completes, **Then** a plain-language line appears in the game log for everyone, separate from chat messages.

---

### User Story 5 - Choose a theme for the room's board and pawns (Priority: P2)

Before the match, the host picks a theme for the room, such as Classic, Super Heroes, Halloween, or Diwali. The theme restyles the board, the pawns, the die, and the surrounding scene for everyone, and it never changes the rules or how easy the game is to read.

**Why this priority**: Themes are a headline request and a strong reason to come back, but they only decorate a match that already works.

**Independent Test**: Start a match in each theme and confirm that the look changes while the rules, the path, the protected squares, and the clarity of whose pawn is whose do not.

**Acceptance Scenarios**:

1. **Given** the host is in the lobby with Ludo selected, **When** they open the room settings, **Then** they see the available themes with a preview of each and the current choice.
2. **Given** the host chooses a theme, **When** they save it, **Then** every member in the room sees the new choice in the lobby.
3. **Given** a match starts, **When** the board appears, **Then** the board, pawns, die, and surroundings all use the chosen theme for every player.
4. **Given** a match is running, **When** a player looks for a theme control, **Then** the theme cannot be changed until the match ends.
5. **Given** any theme, **When** a player looks at the board, **Then** they can tell which pawns belong to whom, where the protected squares are, and where each home is, without relying on color alone.
6. **Given** a rematch is requested, **When** the room returns to the lobby, **Then** the host can keep the theme or choose a different one.

---

### User Story 6 - Stay in the match through disconnects, timeouts, and departures (Priority: P2)

Matches last a while, and phones lock and networks drop. A player who loses connection keeps their seat and pawns for the platform's recovery window and returns to the exact state of the board. A match is not held up forever by someone who is away: turns have a time limit, and a player who keeps missing turns is played automatically until they come back.

**Why this priority**: Reliability is a constitutional requirement and matters a great deal for a long game, but it builds on a working match.

**Independent Test**: Start a 4-player match, disconnect one player on their turn, let the time limit pass, reconnect them, and confirm the board, turn, and last roll are restored with no lost or doubled action. Then remove and let a seat expire and confirm the match carries on.

**Acceptance Scenarios**:

1. **Given** a player disconnects and reconnects within 10 minutes, **When** they return, **Then** they see the current board, whose turn it is, the last roll, and the theme, and nothing they did before dropping is lost or repeated.
2. **Given** it is a player's turn and they do nothing within the turn time limit, **When** the time runs out, **Then** the game plays a legal move for them and the turn passes, and everyone sees that it happened.
3. **Given** a player misses three turns in a row, **When** the third time limit ends, **Then** they are marked as away and their later turns are played automatically and immediately until they act again.
4. **Given** the host chose a turn time limit in the room settings, **When** the match starts, **Then** that limit applies to every turn, and "no limit" is available.
5. **Given** a player leaves, is removed, or their seat expires, **When** the match is running, **Then** their pawns leave the board and the match continues for the others, and if only one player remains that player is declared the winner.
6. **Given** the host leaves during a match, **When** the platform hands the host role to another player, **Then** the match continues unaffected and the new host controls only room management, not the game.

---

### User Story 7 - Works well for everyone on every device (Priority: P2)

Ludo is playable and enjoyable on a laptop, an Android phone, and an iPhone, in portrait and landscape, with mouse, keyboard, or touch, and for people who use assistive technology, prefer reduced motion, have color-vision differences, or have a device that cannot show rich 3D smoothly. Realistic visuals are a layer on top of a game that is always clear and playable.

**Why this priority**: The platform requires every feature to be accessible and to work on mixed devices, and the rich visuals must not exclude anyone or harm performance.

**Independent Test**: Play a match using only a keyboard, then with a screen reader, then with reduced motion on, then on a low-powered phone, then in portrait and landscape on phones, checking that nothing important depends on motion, color, or 3D.

**Acceptance Scenarios**:

1. **Given** a narrow phone screen, **When** the match is shown, **Then** the whole board fits, every pawn that can be chosen is easy to tap, and chat and the game log are reachable without losing the board.
2. **Given** keyboard-only use, **When** it is the player's turn, **Then** they can roll, step through the pawns they may move, choose one, and use chat, with a visible focus indicator at every step.
3. **Given** a screen reader, **When** the match plays, **Then** whose turn it is, the roll result, which pawns can move, each move, each capture, and the result of the match are announced.
4. **Given** the player has reduced motion turned on, **When** a die is rolled or a pawn moves, **Then** there is no tumbling or sweeping camera motion, the result is revealed with a simple static change, and the game is just as playable.
5. **Given** a device that cannot keep the rich visuals smooth, **When** the match starts, **Then** the game chooses a simpler visual quality on its own, and the player can change the quality at any time.
6. **Given** the lite visual quality is used, **When** a match is played, **Then** all information and rules are identical to the rich version, with simplified visuals and a simpler roll.
7. **Given** the phone is rotated, locked, or sent to the background and brought back, **When** the match is shown again, **Then** the current state is shown with no lost or doubled roll or move.
8. **Given** any theme, **When** the board is viewed with a color-vision difference, **Then** each color's pawns, homes, and start squares are still told apart by shape, marking, or label as well as color.

---

### User Story 8 - Play alone against the computer (Priority: P2)

A visitor who has nobody to play with chooses Ludo on the landing page and picks "Play against AI". Without creating a room or inviting anyone, they choose how many computer opponents to face (1 to 3), how strong they are, and a theme, and then play a full Ludo match against them. The computer plays by exactly the same rules as a person, rolls the same realistic die, and takes its turns at a natural pace.

**Why this priority**: It lets anyone play at any time and is a good way to learn the game, but it builds on the working match, the dice, and the visuals, so it follows the room match.

**Independent Test**: From the landing page choose Ludo, then "Play against AI", pick one computer opponent and play to the end. Repeat with 3 opponents and with each difficulty. Confirm no room or invitation exists, the computer never breaks a rule, and its turns do not drag.

**Acceptance Scenarios**:

1. **Given** the visitor has selected Ludo on the landing page, **When** they choose "Play against AI", **Then** a short setup appears for the number of computer opponents (1 to 3), the difficulty, and the theme, and no room, invitation, or account is involved.
2. **Given** the setup is complete, **When** the visitor starts, **Then** the match begins with the visitor and the computer opponents each holding a distinct color and four pawns, on the same board, with the same dice and visuals as a room match.
3. **Given** it is a computer opponent's turn, **When** the turn plays, **Then** the same 3D die is rolled, a short visible pause shows that the computer is choosing, a legal move is made, and a line appears in the game log.
4. **Given** any computer opponent, **When** it plays, **Then** it follows every rule a person does, including leaving base on a 6, extra rolls, three 6s, captures, protected squares, and exact finishing, and it can capture and be captured.
5. **Given** the easy, normal, and hard difficulties, **When** the visitor plays each, **Then** the computer's choices of which pawn to move differ in quality, while its dice rolls remain just as fair and unaffected.
6. **Given** the match ends, **When** the winner is announced, **Then** the visitor can choose "Play again" or "Back to games".
7. **Given** the visitor refreshes the page or switches away briefly, **When** they return on the same device, **Then** the match is shown exactly as it was, with no lost or repeated roll or move.
8. **Given** a solo match, **When** the screen is shown, **Then** the chat panel is not offered (there is nobody to talk to), and the game log, themes, quality levels, and every accessibility feature of User Story 7 work as in a room match.

---

### User Story 9 - Recognize Ludo at a glance on the games page (Priority: P2)

On the games landing page, the Ludo tile shows an attractive picture that clearly says "Ludo", such as the four-color board with pawns and a die, instead of a generic icon. It makes Ludo the most inviting tile on the page without slowing the page down or hiding the tile's text.

**Why this priority**: The tile is the first thing a visitor sees of Ludo, and the owner asked for it to be attractive. It does not affect playing, so it follows the match itself.

**Independent Test**: Open the landing page on a laptop and on phones in light and dark modes, with a fast and a slow connection. Confirm the Ludo tile shows the picture, it looks sharp, the text stays readable, and the page stays quick. Then make the picture fail to load and confirm the tile still looks complete.

**Acceptance Scenarios**:

1. **Given** Ludo is available, **When** a visitor opens the landing page, **Then** the Ludo tile shows an attractive picture that clearly represents the game of Ludo, next to its name, status, and details.
2. **Given** the visitor selects the Ludo tile, **When** the play options appear, **Then** the same picture is used in the options header so the selected game is easy to recognize.
3. **Given** a phone with a high-density screen, **When** the tile is shown, **Then** the picture is sharp and is not stretched, cropped through its main subject, or blurry.
4. **Given** the light and dark modes, **When** the tile is shown in each, **Then** the picture and the tile's text stay clear and attractive.
5. **Given** a slow connection, **When** the page loads, **Then** the tile's text and details appear first, the picture appears without moving the layout, and the page is still usable before the picture arrives.
6. **Given** the picture cannot load, **When** the tile is shown, **Then** a simple fallback artwork appears so the tile is never blank or broken.
7. **Given** a screen reader, **When** it reaches the Ludo tile, **Then** it announces the game's name, status, and details as text, and nothing important depends on seeing the picture.

---

### Edge Cases

- A room has fewer ready players than the minimum of 2: the match cannot start and the base platform explains why.
- A fifth person tries to join a full Ludo room: they receive the base platform's full-room message, since the room's limit is 4.
- A person opens the invitation after the match has started: they are told the match is in progress and cannot take part, and they wait in the room with chat available but without the board until the match ends and the room returns to the lobby. They never take over a seat.
- A 2-player or 3-player room: only the seats in use appear as active, the empty colors stay as unused bases, and turn order skips them.
- A roll gives no legal move at all: the roll is shown, a short explanation appears, and the turn passes automatically.
- A roll gives exactly one legal move: the movable pawn is still highlighted and the player confirms the move, unless the turn time limit chooses it for them.
- A player rolls a 6 and has no pawn that can use it: the extra roll still applies.
- A pawn lands where several pawns already stand: the rules for protected squares, blocks, and captures above decide the outcome in every case, and the board shows every pawn on the square clearly.
- A player on the last squares before home cannot use a roll larger than needed: that pawn stays and the player may move another.
- Two players act at the same instant (for example, one rolls as the other's time runs out): only one outcome is accepted, everyone sees the same result, and nothing is doubled.
- The host changes the theme or the time limit just before pressing start: the match uses what the lobby showed at the moment it started.
- A device fails to load the rich visuals: the player is moved to a simpler quality with a clear notice, and can still play.
- A player's connection drops during a roll: when they return they see the settled result, not a stale or contradictory die.
- A player wins while others are disconnected: the match ends, and returning players see the result.
- Very long display names, very small screens, increased text size, and both orientations: names wrap, controls stay usable, and nothing overflows.
- The room closes during a match: the base platform's closure rules apply and no match data remains afterward.
- In a solo match the visitor leaves for good or does nothing for a long time: the match is discarded after 30 minutes without activity and nothing is kept afterward.
- A computer opponent has no legal move: its roll is shown, the turn passes, and the log says so, exactly as for a person.
- The visitor starts a solo match with 3 computer opponents and rolls many 6s in a row: the three-6s rule applies to every player equally, computer or person.
- The Ludo picture is very slow to arrive or is blocked: the tile shows its text and the fallback artwork, and the landing page is not delayed.
- The landing page is shown on a very small or very large screen: the picture scales without distorting and the tile's text never overlaps it unreadably.

## Requirements *(mandatory)*

### Functional Requirements

**Availability and room setup**

- **FR-001**: Ludo MUST appear in the games catalog as a playable game with its name, a short description, artwork, a player range of 2 to 4 (default 4), a typical duration of about 20 to 45 minutes, and the two ways to play, "Play against AI" and "private room".
- **FR-002**: A Ludo room MUST hold at most 4 players, a match MUST need at least 2 ready players to start, and a further person who tries to join a full room MUST receive the base platform's full-room message, and a person who joins after the match has started MUST be told the match is in progress, MUST NOT take over any seat, and MAY wait in the room until it returns to the lobby.
- **FR-003**: When a match starts, each player MUST be given a distinct color and four pawns in that color's base. Colors are assigned in the order players joined, from Red, then Green, Yellow, and Blue around the board; a 2-player match uses the opposite colors Red and Yellow, and a 3-player match uses Red, Green, and Yellow.
- **FR-004**: The host MUST be able to choose the room's Ludo settings in the lobby before the match: the theme (see FR-021 to FR-025) and the turn time limit (see FR-010).

**Rules and fairness**

- **FR-005**: The game MUST follow these classic Ludo rules: the game picks the first player at random from the players in the match, and players then take turns in clockwise order, skipping unused colors; a pawn leaves its base only on a roll of 6 and goes to its start square; a roll of 6 earns another roll; three 6s in a row end the turn without moving a pawn; a pawn moves exactly the rolled number of squares along its path to its home; a pawn that would pass its home can move only if the roll fits exactly; a pawn that lands on an opponent's pawn on an unprotected square captures it, sending it back to base, and the capturer rolls again; two or more pawns of the same player on the same unprotected square form a block, and an opponent's pawn cannot land on a block but may move past it; start squares and star squares are protected, so no capture happens there; the first player to bring all four pawns home wins.
- **FR-006**: The game MUST decide every die roll and every legal move itself. Players MUST only be able to ask to roll and to choose among the pawns the game offers; no player's device may supply a roll, a result, or a move out of turn, and every refused request MUST be explained in plain language with no change to the match.
- **FR-007**: Each die roll MUST be fair and independent: every face equally likely, with no pattern from earlier rolls and no way for any player or the host to influence it, and the same MUST hold for the random choice of the first player.
- **FR-008**: Ludo MUST show to every player, at all times, the full state of the board, because no information in Ludo is hidden.
- **FR-009**: When a match ends, the game MUST announce the winner to everyone and show how many pawns each other player brought home, and the room MUST offer the base platform's rematch and back-to-lobby choices.
- **FR-010**: The host MUST be able to choose a turn time limit of 30 seconds, 60 seconds (the default), 90 seconds, or no limit. When a turn's time runs out, the game MUST play a legal move for that player using a fixed, documented preference and show everyone that it did so. A player who misses three turns in a row MUST be marked away, and their later turns MUST be played automatically and immediately until they act again.
- **FR-011**: When a player leaves, is removed, or loses their seat during a match, their pawns MUST leave the board and the match MUST continue for the remaining players; if one player remains, that player MUST be declared the winner.
- **FR-012**: The host MUST have no extra power over the match: the host MUST take turns under the same rules as every player.

**Dice roll**

- **FR-013**: A roll MUST be shown as a realistic 3D die thrown onto the board that tumbles, bounces off the surface and the board edge, spins, and settles with lifelike lighting and shadows, taking roughly 1 to 3 seconds. The path, spin, and resting position MUST differ from roll to roll.
- **FR-014**: The die MUST settle showing exactly the number the game decided, and that number MUST also be stated in text. Nothing in the motion MAY change, delay, or contradict the decided number.
- **FR-015**: Every player MUST see the same roll, starting and settling at about the same time and ending on the same face. A person who joins or returns during or after a roll MUST see the settled result without a contradictory replay.
- **FR-016**: A roll MUST begin only when the player whose turn it is chooses "Roll" by mouse, touch, or keyboard. Pawn choices MUST be unavailable until the die has settled. Any viewer MUST be able to skip the animation for themselves, which shows the final result at once for them only.

**Visuals**

- **FR-017**: The board, pawns, and surroundings MUST look realistic, with believable materials, lighting, depth, and shadows, in every theme.
- **FR-018**: Pawn movement MUST be animated square by square along the path, a captured pawn MUST be visibly sent back to its base, and a pawn reaching home MUST play a short celebration.
- **FR-019**: Players MUST be able to switch between an angled 3D view and a flat top-down view of the board at any time, and both views MUST keep every square, pawn, and protected square clear.
- **FR-020**: The game's rich visuals MUST be prepared only when a Ludo match is about to start, MUST show a clear loading state, and MUST NOT slow the landing page or the lobby.
- **FR-021**: The game MUST offer at least these themes: Classic (the default), Super Heroes (inspired by a team of superheroes), Halloween, Diwali, and Winter Holidays.
- **FR-022**: A theme MUST restyle the board, the pawns, the die, the surrounding scene, and the celebration effects, and MUST NOT change the rules, the path, the protected squares, or which information is shown.
- **FR-023**: The host MUST be able to choose the theme in the lobby settings, with a preview of each theme; the choice MUST be shared with every member, MUST apply to every player's view, MUST be fixed once the match starts, and MUST be changeable again in the lobby after a rematch or return to the lobby.
- **FR-024**: Adding or retiring a theme MUST NOT require any change to the rules of the game.
- **FR-025**: In every theme, whose pawn is whose, where each home and start square is, and which squares are protected MUST be clear without relying on color alone, and all text and controls MUST stay legible.
- **FR-026**: The game MUST offer visual quality levels (high, standard, and lite) and MUST choose one automatically at the start of a match based on the device, which the player can change at any time. The lite level MUST show the same information and follow the same rules with simplified visuals and a simpler roll. If the rich visuals cannot load, the game MUST fall back to lite with a clear notice.

**Chat and game log**

- **FR-027**: All room members MUST be able to send and read room chat throughout the match, including messages sent in the lobby, whether or not it is their turn. Sending chat MUST NOT affect the game.
- **FR-028**: Chat MUST follow the base platform's rules for chat content, limits, and deletion when the room closes.
- **FR-029**: Chat MUST NOT cover the board: on wide screens it MUST sit beside the board, and on phones it MUST open and close from a control and show an unread count while closed.
- **FR-030**: The game MUST keep a plain-language game log visible to everyone, separate from chat, recording rolls, moves, captures, automatic moves, departures, and the result.

**Devices, accessibility, and recovery**

- **FR-031**: The match MUST work on laptop, Android phone, and iPhone, in portrait and landscape, in a room that mixes them. The whole board MUST fit the screen down to 320 pixels wide, and every choosable pawn MUST be at least 44 by 44 CSS pixels to touch.
- **FR-032**: Every match action, including rolling, choosing a pawn, switching view, changing quality, and using chat, MUST work with keyboard and touch as well as mouse and trackpad, with a visible focus indicator.
- **FR-033**: The game MUST announce to assistive technology whose turn it is, each roll result, which pawns can move, each move, each capture, and the result. Status MUST NOT be conveyed by color alone, and core flows MUST meet WCAG 2.2 AA.
- **FR-034**: The game MUST honor reduced-motion preferences: with reduced motion requested, there MUST be no tumbling, sweeping camera motion, or decorative animation, rolls MUST be revealed with a simple static change, pawn moves MUST be shown without travel animation, and nothing MAY depend on motion to be understood.
- **FR-035**: A player who reconnects within the platform's recovery window MUST be restored to the current board, turn, last roll, and theme, with no lost or duplicated roll or move. Phone rotation, lock, and background and resume MUST also keep the state without loss or duplication.
- **FR-036**: The game's surrounding controls MUST work in both light and dark modes of the platform.
- **FR-037**: Ludo MUST use only the platform's room, role, chat, and reconnection features and MUST NOT redefine them; the platform MUST NOT contain Ludo's rules.
- **FR-038**: Acceptance evidence for this feature MUST cover full matches with 2, 3, and 4 players, a solo match against the computer at each difficulty, the dice roll, chat during a match, every theme, reduced motion, keyboard-only, screen-reader, and lite-quality checks, on a real laptop, a real Android phone, and a real iPhone, as host and as player, in a mixed-device room, recorded with device, operating system, browser and version, tester, date, and result. Viewport emulation MUST NOT substitute for the phones.

**Playing alone against the computer**

- **FR-039**: Choosing "Play against AI" for Ludo MUST start a solo match with no room, no invitation, and no account. Before starting, the visitor MUST be able to choose 1, 2, or 3 computer opponents, a difficulty of easy, normal (the default), or hard, and a theme (see FR-021 to FR-025).
- **FR-040**: In a solo match the visitor and each computer opponent MUST each hold a distinct color and four pawns, assigned by the color rules in FR-003 with the visitor in Red.
- **FR-041**: Computer opponents MUST follow every rule in FR-005, MUST NOT see or use anything a person could not, MUST NOT act out of turn, and MUST NEVER make an illegal move. Their dice rolls MUST be as fair and independent as in FR-007, at every difficulty.
- **FR-042**: Difficulty MUST change only the quality of a computer opponent's choices among the legal moves, never its dice, and the three levels MUST play noticeably differently.
- **FR-043**: A computer opponent's turn MUST use the same 3D die as in FR-013 to FR-016, show a short visible pause while it chooses, and complete within about 3 seconds not counting the roll animation. Each of its rolls, moves, and captures MUST appear in the game log.
- **FR-044**: A solo match MUST offer the same themes, visuals, quality levels, and accessibility behavior as a room match (FR-017 to FR-026 and FR-031 to FR-036), MUST NOT offer chat, and MUST NOT use a turn time limit.
- **FR-045**: Refreshing the page or briefly leaving it MUST NOT lose a solo match on the same device, and a match left for more than 30 minutes without activity MUST be discarded. Nothing about a solo match MAY be shared with other people.
- **FR-046**: When a solo match ends, the visitor MUST see the winner and the pawns each player brought home, and MUST be offered "Play again" and "Back to games".

**Ludo's picture on the games page**

- **FR-047**: The Ludo tile on the games landing page MUST show an attractive picture that clearly represents the game of Ludo (for example the board, pawns, and a die) in place of a generic icon, and the same picture MUST appear in the header of the play options when Ludo is selected.
- **FR-048**: The picture MUST be sharp on high-density phone and laptop screens, MUST look good in both light and dark modes, MUST scale without distortion at every screen size, and MUST NOT make the tile's text hard to read.
- **FR-049**: The picture MUST NOT be needed to understand the tile. The tile's name, status, and details MUST remain available as text to assistive technology, and the picture MUST be treated as decoration.
- **FR-050**: The landing page MUST show the tile's text and details before the picture, MUST NOT shift its layout when the picture arrives, and MUST NOT be noticeably slower because of it (the picture MUST be no larger than 100 KB). If the picture cannot load, the tile MUST show the platform's fallback artwork instead.

### Key Entities *(include if feature involves data)*

- **Ludo Match**: One game played in a room from start to winner. Holds the players and their colors, the pawns, whose turn it is, the last roll, the turn time limit, the theme, and the game log.
- **Seat and Color**: A player's place in the match with their assigned color (Red, Green, Yellow, or Blue), their away status, and how many pawns they have home.
- **Computer Opponent**: A player in a solo match controlled by the game rather than a person, with a color, four pawns, and a difficulty level. It follows the same rules as a person.
- **Solo Match**: A Ludo match started from "Play against AI" with one person and 1 to 3 computer opponents, chosen theme and difficulty, and no room.
- **Catalog Picture**: The single attractive picture that represents Ludo on its games page tile and in its play options header, with fallback artwork if it cannot load.
- **Pawn**: One of a player's four pieces, in base, on the path, or home, with its position and the owner's color.
- **Board Path**: The ring of squares, each player's start square, the protected squares, and each player's home lane.
- **Die Roll**: One roll with its decided number, who rolled it, and when; shown to everyone as the same thrown die.
- **Turn**: The current player's opportunity to roll and move, including extra rolls, with its time limit.
- **Theme**: A named look (Classic, Super Heroes, Halloween, Diwali, Winter Holidays) covering the board, pawns, die, surroundings, and celebration, with no effect on rules.
- **Visual Quality**: The level of visual richness in use for a player's device (high, standard, or lite), a per-player choice that does not affect others.
- **Game Log Entry**: One plain-language line describing something that happened in the match.
- **Chat Message**: A room message from the base platform, shown during the match.

## Changes to Existing Requirements

This feature amends earlier features as follows. Everything not listed is unchanged.

| Earlier requirement | Change |
|---------------------|--------|
| 002 catalog roadmap (Ludo shown as "Coming soon" with solo and online modes) | Ludo becomes a playable game with 2 to 4 players and two ways to play, "Play against AI" (solo against 1 to 3 computer opponents) and a private room. Its "Coming soon" placeholder is replaced by the real entry. The landing page therefore offers both "Play against AI" and "Create private room" for Ludo. |
| 001 FR-019 and room settings (player limit 1 to 100) | A Ludo room's limit is 2 to 4, from the game's range, and the host cannot raise it above 4. |
| 002 tile artwork (a fixed set of generated icons and colors, with no picture files to supply) | A game may now provide its own picture for its tile. Ludo does, and every other game keeps the generated artwork, which is also the fallback when a picture cannot load. |
| 001 FR-005 (host manages shared room settings) | The settings the host manages for Ludo include the theme and the turn time limit, chosen in the lobby and fixed during the match. |
| 001 room screen (lobby with member list and chat) | While a Ludo match runs, the room screen gives the game a match area while keeping the member list, chat, and the base platform's match controls reachable. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated sessions with groups of friends, at least 90% of players complete their first roll and first pawn move within 1 minute of the match starting, without help.
- **SC-002**: In 100% of scripted rule scenarios (leaving base on a 6, extra turn, capture, protected squares, blocks, exact finish, three 6s, winning, leaving mid-match), the outcome matches the rules, and in 0 test attempts is a roll, a move out of turn, or a client-supplied result accepted.
- **SC-003**: Across a sample of at least 6,000 rolls, each die face appears between 15% and 18.5% of the time.
- **SC-004**: For 100% of rolls, every player's die settles on the same face as the number the game decided, and for at least 95% of rolls the die settles within 3 seconds on the acceptance devices.
- **SC-005**: In a review by at least 8 people outside the project team, the average rating is at least 4 out of 5 for "the dice roll looks natural and realistic" and at least 4 out of 5 for "the board and pawns look realistic and attractive" in each theme.
- **SC-006**: On the acceptance phones, the board and dice animations stay at or above 30 frames per second for at least 95% of a 4-player match at the quality the game chooses automatically, and the match screen is ready to play within 5 seconds of the start for at least 95% of starts over a typical mobile connection.
- **SC-007**: In 100% of reconnection checks within the 10-minute window, the player returns to the same board, turn, last roll, and theme, with no lost or duplicated roll or move.
- **SC-008**: Chat messages reach all room members within 1 second for at least 95% of messages during a 4-player match, and in 100% of checks sending chat leaves the match state unchanged.
- **SC-009**: At least 5 themes are available, and in 100% of theme checks (including a color-vision-difference review) a tester can tell each player's pawns, homes, start squares, and protected squares apart without relying on color.
- **SC-010**: Keyboard-only and screen-reader acceptance each complete a full match, and in 100% of reduced-motion checks no tumbling, camera motion, or pawn travel animation appears.
- **SC-011**: On a low-powered phone, a full match is completed at lite quality with the same information and rules as the rich version, in 100% of checks.
- **SC-012**: 100% of the real-device acceptance matrix in FR-038 is recorded for laptop, Android, and iPhone, covering 2, 3, and 4 player matches, a solo match, and every theme at least once; emulation does not count toward this result.
- **SC-013**: In moderated sessions, at least 90% of first-time visitors choose "Play against AI" and make their first move in a solo match within 30 seconds of the match starting, without help.
- **SC-014**: In 100% of automated solo checks across all difficulties and 1 to 3 opponents, no computer opponent makes an illegal move, acts out of turn, or uses a roll other than the fair die roll, and at least 95% of computer turns finish within 3 seconds not counting the roll animation.
- **SC-015**: In a review by at least 8 people outside the project team who play each difficulty, the majority rate easy as noticeably easier than hard.
- **SC-016**: In a review by at least 8 people outside the project team, the average rating is at least 4 out of 5 for "the Ludo tile picture is attractive and clearly Ludo" in both light and dark modes, and the landing page still meets the 002 loading target with the picture in place, including when the picture is blocked.

## Assumptions

- Ludo is played with the classic rules listed in FR-005. Variations (a second die, team play, continuing play for second and third place) are not included. The match ends when the first player brings all four pawns home.
- Ludo supports private rooms and solo play against 1 to 3 computer opponents. "AI/computer partner" is interpreted as computer opponents, not a teammate, so team play is not included. Computer players filling empty seats in an online room are not included. A solo match runs for one person only and is not shared.
- Computer opponents use a simple, documented strategy that differs by difficulty only in how they choose among legal moves (for example, easy chooses at random, normal prefers captures and progress, hard also avoids landing within reach of an opponent). Their dice are never affected by difficulty.
- A solo match is kept only on the visitor's own device and only while it is in use. It is discarded after 30 minutes without activity.
- The "Avengers" theme is delivered as an original "Super Heroes" theme inspired by a team of superheroes. Official names, logos, and character likenesses from the Avengers films and comics are licensed and are not used. If the owner obtains such a license, it can be added later as another theme without changing the game, and this feature does not wait for it.
- Halloween, Diwali, Winter Holidays, and Classic are original artwork. More themes can follow.
- The Ludo tile uses one original picture made for this feature, in the Classic look, and does not change with the chosen theme. It does not use licensed characters or logos.
- "Hyper realistic" is interpreted as photorealistic-style 3D rendering within what current phone and laptop browsers can sustain smoothly. It is judged by outside reviewers (SC-005) and always offers a simpler quality level so that no device is excluded.
- The die's motion is a visual presentation of a result the game has already decided; players do not control the outcome by how they tap or flick.
- Colors are assigned automatically by join order and cannot be picked in this feature.
- Turn limits default to 60 seconds, and automatic play on timeout uses a simple fixed preference documented with the game: capture if possible, otherwise move the pawn furthest along.
- The turn time limit applies to each decision in a turn, separately for the roll and for choosing a pawn, and restarts at each. A timeout of either counts as one missed turn, and the count resets when the player acts.
- A player marked away returns with an explicit "I'm back" control, or by any manual roll or move, because their turns are otherwise played at once.
- No audio is provided by this feature. If sound is added later it will follow the visitor's sound preference from the landing page.
- Watching a match without playing (spectating) is not supported, because the platform has only the host and player roles. A person who joins after the match has started waits in the room with chat and sees a waiting message instead of the board.
- Rooms, roles, readiness, rematch, chat, reconnection, closure, the 10-minute recovery window, and display-name rules come from the base platform unchanged. The game's catalog entry, room creation, and landing page behavior come from the games landing page feature.
- A typical match lasts about 20 to 45 minutes.
- The feature follows the platform's rules for light and dark modes, device support, and accessibility, and needs real-device acceptance like every feature.

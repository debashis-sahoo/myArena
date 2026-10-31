# Feature Specification: Ludo Visual Redesign

**Feature Branch**: `004-ludo-visual-redesign`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "Redesign how Ludo looks, in the style of popular Ludo apps and the owner's reference images: a flat, bright board with pin-shaped pawns that show no number, pawns that hop square by square, a natural-looking 3D die roll, a screen that works well on phones and laptops (board on the left, die, current player's name and chat on the right on wide screens), and removal of the 3D scene. The game rules, rooms, chat, timers, recovery, solo play, themes and tile picture from feature 003 are unchanged."

## Background

Feature 003 delivered Ludo with a full 3D scene. The owner found the look weak next to popular Ludo apps and asked for a bright, clean, game-like board instead. This feature changes how Ludo is drawn and how the match screen is laid out. It does not change any rule, room, chat, timer, recovery, solo or theme behaviour. It replaces the 3D board, the 3D die, the visual quality choices and the pawn look of feature 003.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a clear, bright Ludo board with pin pawns (Priority: P1)

A player opens a Ludo match on a phone or a laptop and sees a flat, colourful board like those in popular Ludo apps: four thick coloured corner frames, each with a white inner yard holding round slots; a white track of grid squares; coloured home lanes with small entry arrows; four coloured triangles in the middle; outlined stars on the safe squares. Each pawn is a pin: a glossy domed head on a point, standing on a round ring in the player's colour, with a small mark on the head that is different for each colour. Pawns carry no number.

**Why this priority**: The board and the pawns are what players look at the whole time. Without them looking right, nothing else matters.

**Independent Test**: Start a match with 2, 3 and 4 players and, in solo mode, open the board on a phone-sized and a laptop-sized screen: the board shows every element above, every pawn is a pin with no number, and each colour is told apart by its head mark as well as its colour.

**Acceptance Scenarios**:

1. **Given** a match has started, **When** the board appears, **Then** it shows the corner frames, white yards with four slots each, the track, the home lanes with entry arrows, the centre triangles and the stars, with no pawn numbers anywhere.
2. **Given** a pawn is in a yard, **When** it leaves, **Then** its slot shows an empty coloured disc.
3. **Given** two or more pawns share a square, **When** the board is drawn, **Then** every one of them can still be seen.
4. **Given** a player who cannot tell colours apart, **When** they look at the pawns, **Then** each colour has its own mark on the pin head (circle, triangle, square or diamond).
5. **Given** a theme other than Classic, **When** the board is drawn, **Then** it keeps the same layout and shows that theme's colours and decoration around the board.
6. **Given** it is a player's turn to move and two or more of their pawns can move, **When** they point at or focus one of the move buttons, **Then** the matching pawn on the board is highlighted so they can tell which pawn the button moves.

---

### User Story 2 - Pawns hop square by square (Priority: P1)

When a pawn moves, it hops from one square to the next, one square at a time, the way a person would move a physical pawn, and lands with a small settle on each square. A pawn that leaves its yard hops onto the start square; a captured pawn is sent back to its yard; a pawn that reaches home is shown arriving.

**Why this priority**: It is what makes moves readable and the game feel alive.

**Independent Test**: Make a move of 1, 4 and 6 squares, a capture, and a move into home, and watch from another device: the pawn visits every square on the way, in order, in a steady rhythm.

**Acceptance Scenarios**:

1. **Given** a pawn moves N squares, **When** the move plays, **Then** the pawn visibly hops N times, one per square, ending on the destination square.
2. **Given** a move captures an opponent's pawn, **When** the capturing pawn lands, **Then** the captured pawn is then sent back to its yard.
3. **Given** a player has reduced motion turned on, or effects turned off, **When** a pawn moves, **Then** it appears on its destination at once.
4. **Given** a move arrives while the previous one is still playing, **When** it starts, **Then** the previous one completes at once and the board is never out of date.
5. **Given** a player reconnects or the page was hidden, **When** the board is shown again, **Then** every pawn is where the game says it is, with no replay of old moves.

---

### User Story 3 - A natural 3D die roll (Priority: P1)

The die is a glossy white rounded cube with large black pips. When someone rolls, it tumbles, bounces and slows to a stop on the number the game decided, with a 3D look and a soft shadow. Every player in the room sees the same roll land on the same number at about the same time, and the number is only stated in words once the die has stopped.

**Why this priority**: The roll is the most-watched moment in the game.

**Independent Test**: Roll many times with three devices watching: every roll looks different, always lands on the decided number, and settles within 3 seconds on all devices.

**Acceptance Scenarios**:

1. **Given** a player rolls, **When** the die tumbles, **Then** it spins and bounces with a natural slowing motion and a moving shadow, and stops showing the number the game decided.
2. **Given** several players watch the same roll, **When** it plays, **Then** they see the same motion and the same final number.
3. **Given** the die is rolling, **When** a viewer presses "Skip animation", **Then** the die shows its final number for that viewer only.
4. **Given** the die is rolling, **When** a player tries to choose a pawn, **Then** nothing can be moved until the roll has settled.
5. **Given** reduced motion or effects off, **When** a roll happens, **Then** the die shows the final number at once, with no tumbling.
6. **Given** a screen reader user, **When** the die settles, **Then** the result is announced once, when it settles, not when it starts.

---

### User Story 4 - A match screen that fits phones and laptops (Priority: P2)

On a wide screen, the board fills the left side and the right side holds the die, the name of the player whose turn it is, the Roll button, the game log and the chat. On a phone in portrait, the current player's name and the die sit above the board, the board fills the width, the Roll button is below it, and the game log and chat open as sheets from buttons. In landscape on a phone, the board takes the full height with a slim column of die, name and Roll beside it.

**Why this priority**: Players use both kinds of device, often in the same room.

**Independent Test**: Open a match at 320 px, 390 px, a landscape phone and a laptop size: the whole board is always visible, nothing scrolls sideways, and the die, the current player's name and the Roll button are reachable without scrolling past the board on wide screens.

**Acceptance Scenarios**:

1. **Given** a wide screen, **When** a match is shown, **Then** the board is on the left, and the die, the current player's name, Roll, the game log and the chat are on the right.
2. **Given** a phone in portrait, **When** a match is shown, **Then** the board fills the width and the die, the current player's name and Roll are shown without covering it.
3. **Given** a phone is rotated, **When** the screen re-lays out, **Then** the board stays fully visible and the same state is shown.
4. **Given** a player's name label on each corner block, **When** it is that player's turn, **Then** their label is highlighted.
5. **Given** text is enlarged to 200%, **When** the screen is shown, **Then** nothing is cut off or overlapping and nothing scrolls sideways.

---

### User Story 5 - Themes keep working with the new look (Priority: P2)

The five themes (Classic, Super Heroes, Halloween, Diwali, Winter Holidays) still exist and are still chosen in the lobby or in solo set-up. Each changes the colours of the board and its frame and adds simple decoration around the board, keeping every shape mark, marker and star readable.

**Why this priority**: Themes were part of the original request and must survive the redesign.

**Independent Test**: Play a short match in every theme: the layout is identical, colours and decoration differ, and pawns, homes and safe squares stay distinguishable.

**Acceptance Scenarios**:

1. **Given** a theme is chosen, **When** the match starts, **Then** every player sees that theme's colours and decoration.
2. **Given** any theme, **When** the board is drawn, **Then** the four player colours stay clearly different from each other and from the board.
3. **Given** a theme preview in the lobby, **When** it is shown, **Then** it represents the new flat look.

---

### User Story 6 - A simpler, lighter game with no 3D scene (Priority: P3)

The 3D scene and everything that exists only for it (the visual quality choices, the view toggle and graphics fallbacks) are gone. Ludo loads quickly and looks the same on every device that can show a web page, without needing special graphics support.

**Why this priority**: Less to download, less to go wrong, and nothing that can silently downgrade the look.

**Independent Test**: Open the game on a low-end phone and with graphics acceleration disabled: it looks and plays the same, and no quality setting is offered.

**Acceptance Scenarios**:

1. **Given** any device or browser setting, **When** a match is shown, **Then** the same board and die are drawn and no quality or view setting is offered.
2. **Given** the game is built, **When** its download size is measured, **Then** it is smaller than before this feature.
3. **Given** a player had saved a quality or view choice before, **When** they open the game, **Then** the old choice is ignored and causes no error.

---

### Edge Cases

- A move of 6 squares across the four diagonal corner steps still hops through every square in order.
- Several pawns on one square: they are spread apart but each still hops on its own when it moves.
- A player joins or reconnects during a roll: they see the settled die and the current board, with no replay.
- The page is hidden during a roll or a move: the settled state is shown when it returns.
- Reduced motion, effects off, and "Skip animation" all end in exactly the same settled state.
- A very narrow screen (320 px) and a very wide screen: the board stays a square and fully visible.
- Two pawns of one player can both move and look alike: the highlight that links a move button to its pawn keeps them distinguishable.
- A saved solo match from before this feature still opens.

## Requirements *(mandatory)*

### Functional Requirements

**Board and pawns**

- **FR-001**: The board MUST be drawn flat and bright with four thick coloured corner frames, each with a white inner yard holding four round slots; a white track of grid squares; coloured home lanes with a small entry arrow for each colour; four coloured triangles in the centre; and an outlined star on each safe square.
- **FR-002**: Every pawn MUST be drawn as a pin: a glossy domed head on a point, standing on a round ring in its player's colour.
- **FR-003**: Pawns MUST NOT show a number. Screen readers MUST still be told pawn numbers in the move buttons and the hidden board description.
- **FR-004**: Each colour MUST have its own mark on the pin head so colour is never the only cue (circle, triangle, square, diamond).
- **FR-005**: A yard slot whose pawn is out MUST show an empty coloured disc.
- **FR-006**: Pawns sharing a square MUST all remain visible.
- **FR-007**: When the viewer points at or focuses one of their move buttons, the matching pawn MUST be highlighted on the board. Pawns that can be moved MUST be highlighted all the time, and pressing a highlighted pawn on the board MUST do the same as its move button.
- **FR-008**: Each player's name MUST be shown on their corner block, and the label of the player whose turn it is MUST stand out.

**Pawn movement**

- **FR-009**: A moving pawn MUST hop from square to square, one hop per square, in order, ending on its destination, with a short, steady rhythm (about two tenths of a second per square) and a small settle when it lands.
- **FR-010**: A pawn leaving its yard MUST hop onto its start square, a captured pawn MUST be sent back to its yard after the capturing pawn lands, and a pawn reaching home MUST be shown arriving.
- **FR-011**: A new move MUST complete any move still playing, so the board is never out of date.
- **FR-012**: With reduced motion or effects off, pawns MUST appear on their destination at once. A reconnect, a hidden page or a snapshot MUST show pawns where the game says they are, with no replay.

**The die**

- **FR-013**: The die MUST be a glossy white rounded cube with large black pips and a soft shadow, shown in 3D, and MUST tumble, bounce and slow to a stop in a natural-looking way.
- **FR-014**: The die MUST always stop showing exactly the number the game decided, and every viewer MUST see the same motion and the same number, at about the same time.
- **FR-015**: A roll MUST settle within 3 seconds. The number MUST be stated in words only once the die has settled for that viewer.
- **FR-016**: "Skip animation" MUST show the final number at once for the viewer who pressed it only. With reduced motion or effects off, the die MUST show the final number at once.
- **FR-017**: No pawn MAY be chosen while the die is rolling.
- **FR-018**: The result MUST be announced to screen readers once, when the die settles.

**Layout**

- **FR-019**: On wide screens the board MUST be on the left; the die, the current player's name, the Roll button, the game log and the chat MUST be on the right, with the game log above the chat.
- **FR-020**: On phones in portrait the current player's name and the die MUST be shown with the board, the board MUST fill the width, the Roll button MUST be below it, and the game log and chat MUST open from buttons as sheets that leave the board visible.
- **FR-021**: In landscape on a phone the board MUST fill the available height, with a slim column for the die, the current player's name and Roll beside it.
- **FR-022**: The whole board MUST be visible down to 320 px wide and when text is enlarged to 200%, with nothing scrolling sideways, and the layout MUST adapt when the device is rotated.
- **FR-023**: Every control and every tappable pawn MUST be at least 44 by 44 CSS pixels.
- **FR-024**: The existing focus rules, announcements, status line, countdown, away banner and result panel from feature 003 MUST keep working in the new layout.

**Themes**

- **FR-025**: The five themes MUST remain selectable in the lobby and in solo set-up, and each MUST change the board and frame colours and add simple decoration around the board, with the four player colours always clearly different and every shape mark, arrow and star still readable. Theme previews MUST show the new look.

**Removal and compatibility**

- **FR-026**: The 3D scene and everything that exists only for it (the quality choices, the view toggle, the graphics-failure notices and their saved settings) MUST be removed. Previously saved quality or view choices MUST be ignored without error.
- **FR-027**: No game rule, room, chat, timer, away, recovery, solo, theme-setting, catalogue or tile-picture behaviour MAY change, and a saved solo match from feature 003 MUST still open.
- **FR-028**: The look MUST be the same on every device and browser, with no dependency on graphics acceleration.

### Key Entities

- **Board look**: the flat drawing of the frames, yards, track, lanes, centre, arrows and stars, in a theme's colours and decoration.
- **Pin pawn**: a pawn's picture: head mark by colour, a ring in the player's colour, and its highlighted and hopping states.
- **Die**: the cube, its current face, whether it is rolling, and the throw (motion) every viewer shares for one roll.
- **Match layout**: how the board, the die, the current player's name, Roll, the game log and the chat are arranged for a screen size.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a review with the owner's reference images beside it, the owner confirms the board and pawns match the intended style (bright, flat, pin pawns, no numbers) on a phone and on a laptop.
- **SC-002**: In 100 consecutive rolls watched by three devices, every roll lands on the number the game decided, looks different from the one before, settles within 3 seconds, and shows the same final number on every device.
- **SC-003**: Moves of 1 to 6 squares always show one hop per square in order, in 100% of tested moves, including captures and moves into home.
- **SC-004**: The whole board is visible and nothing scrolls sideways at 320 px, 390 px, in landscape on a phone, on a laptop, and at 200% text, with every control at least 44 by 44 pixels.
- **SC-005**: At least 9 out of 10 new players can tell, without help, which pawn a move button will move when two or more are movable.
- **SC-006**: The amount of data a player downloads to start a Ludo match is smaller than before this feature, and the game looks and plays the same with graphics acceleration turned off.
- **SC-007**: Every existing Ludo rule, room, chat, timer, away, recovery and solo check that passed before this feature still passes.
- **SC-008**: The motion stays smooth (at least 30 frames per second for 95% of a 4-player match) on the acceptance phones used for feature 003.

## Assumptions

- The rules, the server, the timers, chat, solo play, recovery, the catalogue entry and the tile picture from feature 003 are reused as they are.
- The die's throw (the seeded, shared motion) from feature 003 is reused, so every viewer sees the same roll.
- The five themes and their settings are kept; only how they look changes.
- No new third-party libraries are needed.
- The owner's reference images define the target style; pixel-for-pixel copying of any commercial game's artwork is not intended, so the pin, die and board are drawn originally in that style.
- Testing is kept proportionate: logic is covered by unit tests, and a small set of end-to-end checks covers the screen sizes, a roll and a move, accessibility and overflow. The owner reviews screenshots for the look.
- Real-device and outside-reviewer checks (as in feature 003) are still done by people and are not part of the automated work.

# Feature Specification: UNO Multi-Player & AI Game Module

**Feature Branch**: `006-uno-game-module`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Initialize feature specification: UNO Multi-Player & AI Game Module, built on the Platform Core room and chat engine and hosted on Render with
server-authoritative state. High-contrast royal arcade look, fluid responsive layout, manual interactions, no automated test dependencies. Scope: (1) Room creation: clicking the
UNO tile on the myArena Hub opens a modal that forces a choice between 'Play with AI' (the host picks 1 to 4 bots; a private room is created instantly with the host and those bots
only, no invite link, the match starts at once; bots wait a natural 1.5 to 2 seconds before playing or drawing and obey the same rules) and 'Play Online' (the host sets the room
capacity from 2 to 5; a private room is created with the host in Slot 1 and a shareable invite link is shown; the match cannot start below 2 players; the host keeps a 'Fill empty
slots with AI' button that forces the match to start). (2) Table layout: a central play area with a face-down Draw Pile and a face-up Discard Pile whose active colour glows as an
ambient aura; the player's hand fanned in an arc at the bottom, cards enlarging and lifting on hover or tap; up to four opponents arranged across the top and side margins on
desktop and landscape, and on mobile portrait two on the top edge, one middle-left and one middle-right, each showing connection status, an active-turn indicator and a visual
count of remaining cards; a game chat in a right column (a collapsible drawer on mobile) reserved for human players and hidden in 'Play with AI'. (3) Tactile mechanics: a snappy
parabolic throw to the Discard Pile when a valid card is tapped or dragged; a card flying from the deck into the hand when drawing; a bouncy snap-back with a subtle screen shake
for an illegal move; a glowing four-colour wheel in the centre for Wild and Wild Draw 4. (4) The UNO! call: a prominent glowing button above the hand that must be pressed before
or exactly when playing the second-to-last card; if a player reaches one card without it, opponents see a 'Catch [Player]!' button and the first to press it makes the server
issue a 2-card penalty. (5) Server-side validation of every play against the top of the Discard Pile (colour, number or action symbol) and glowing arrows around the central pile
that animate clockwise or counter-clockwise and reverse with a flare when a Reverse is played."

## Clarifications

### Session 2026-11-05

- Q: After a player is left with one card without having pressed UNO!, how long do opponents have to press "Catch"? → A: A fixed 5 seconds from the moment the card is played,
  the same for humans and bots, whoever plays next.
- Q: What should happen when a player does nothing on their turn? → A: A 30-second countdown; at zero the server draws one card for them and passes; a third missed turn in a row
  removes them from the match.
- Q: When may a player play a Wild Draw 4? → A: Any time on their turn, even when they hold a card of the active colour; there is no restriction and no challenge.
- Q: Can a player answer a Draw 2 or Wild Draw 4 by playing another draw card instead of drawing? → A: Yes, but only a card of the same kind: a Draw 2 on a Draw 2, and a Wild Draw 4
  on a Wild Draw 4. The total grows until someone draws it; a Draw 2 cannot be stacked on a Wild Draw 4, or the reverse.
- Q: After a match ends, should the results screen let the players start another match in the same room, or only return to the Hub? → A: "Play again" re-deals at once with the
  same players in both modes, skipping the lobby; everyone can also return to the Hub.

### Session 2026-11-06 (convergence: plan decisions folded into the spec)

- Q: When the player facing a Draw 2 or Wild Draw 4 holds no matching draw card, do they have to tap the Draw Pile? → A: No. The server takes the whole total for them after a
  short beat of about 1 second so everyone sees it; that turn has no countdown. A player who can stack always keeps the choice and the 30-second countdown.
- Q: Who plays first, and does it change after "Play again"? → A: The first match starts with the host (the dealer is the seat before the host); each "Play again" starts one seat
  further clockwise.
- Q: What happens to a pending penalty when the player facing it leaves or is removed? → A: It is cancelled; it is not passed on to another player.
- Q: Does a stacked card change the active colour? → A: A stacked Draw 2 sets the active colour to its own colour; a stacked Wild Draw 4 uses the colour its player chooses.
- Q: How are standings ordered when cards left are equal, and where do players who left appear? → A: Ties are broken by seat order, and players who left are listed last as "Left".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a Solo Match Against 1 to 4 Bots (Priority: P1)

A visitor clicks the UNO tile on the myArena Hub. A modal asks them to choose how to play before anything is created: "Play with AI" or "Play Online". Choosing "Play
with AI" asks how many computer opponents to face (1 to 4, with 3 preselected). One more tap and the visitor is at the table with that many bots, the cards are
dealt and the match begins at once. No invite link is shown anywhere, because nobody else can join.

**Why this priority**: It is the fastest way to try the game, and it exercises the complete rules engine, table and visuals without needing a second person.

**Independent Test**: Click the UNO tile, choose "Play with AI", pick 3 opponents; confirm the match starts at once with 4 players in total, the room offers no invite link
and no chat, and the host can play a full match to the end.

**Acceptance Scenarios**:

1. **Given** I am on the Hub, **When** I click or tap the UNO tile, **Then** a modal opens with two clearly different actions, "Play with AI" and "Play Online", and no room
   exists until I choose one.
2. **Given** the modal is open, **When** I close it (close control, tap outside, or Escape), **Then** it closes, no room is created and the Hub is unchanged.
3. **Given** I choose "Play with AI", **When** the next step appears, **Then** I can pick 1, 2, 3 or 4 opponents (3 preselected) and confirm with one tap.
4. **Given** I confirmed 3 opponents, **When** the room opens, **Then** I am at a table with 4 players in total (me and 3 bots), each player holds 7 cards, a first card is
   face up, and the match is already running with no waiting room and no Start button.
5. **Given** I am in a "Play with AI" room, **When** I look at the screen, **Then** there is no invite link, no Copy Invite control and no chat panel, and the table uses the
   space those would have taken.
6. **Given** I am in a "Play with AI" room, **When** I leave, **Then** the room ends and nothing is left behind.

---

### User Story 2 - Host an Online Room with an Invite Link (Priority: P1)

A visitor clicks the UNO tile and chooses "Play Online". They set how many people the room holds in total, from 2 to 5. A private room opens with the host already seated
in Slot 1 and a shareable invite link ready to copy. Friends who open the link take the next free slots. The match cannot start until at least two people are seated. If
friends are slow, the host can press "Fill empty slots with AI" to put a bot in every empty slot and start the match straight away.

**Why this priority**: Playing with friends is the platform's main promise, and the host's lobby choices decide who is at the table.

**Independent Test**: Click UNO, choose "Play Online", set capacity 5; confirm a lobby with 5 slots, an invite link and a waiting state. Open the link in a second window and
confirm the guest takes Slot 2. Start with 2 seated and confirm the match runs with just those two. Repeat, pressing "Fill empty slots with AI" with the second window
seated, and confirm 3 bots take the empty slots and the match starts for both windows.

**Acceptance Scenarios**:

1. **Given** I choose "Play Online", **When** the next step appears, **Then** I can set the room capacity from 2 to 5 (4 preselected) and confirm with one tap.
2. **Given** I confirmed capacity 5, **When** the room opens, **Then** I see a lobby with five slots (me in Slot 1, four empty), the room code, a shareable invite link
   with a one-tap Copy control, and a clear "waiting for players" state.
3. **Given** only I am seated, **When** I look at the lobby, **Then** Start is unavailable with a clear reason ("Waiting for at least one more player") and the
   "Fill empty slots with AI" button is available to me.
4. **Given** a guest opens the invite link and joins, **When** they are seated, **Then** every window updates immediately and Start becomes available to the host.
5. **Given** two people are seated and slots are empty, **When** the host presses Start, **Then** the match begins for everyone at once with only the seated people
   playing, and the room closes to new joiners.
6. **Given** at least one slot is empty, **When** the host presses "Fill empty slots with AI" and confirms, **Then** every empty slot is taken by a bot, the match
   begins for everyone at once, and the room closes to new joiners. The button's label states how many slots it will fill.
7. **Given** I am a guest (not the host), **When** I view the lobby, **Then** I see no Start, capacity or "Fill empty slots with AI" controls, and nothing I send can trigger them.
8. **Given** guests are seated, **When** the host lowers the capacity below the number seated, **Then** the change is refused with a clear message and nobody is removed.

---

### User Story 3 - Play a Turn: Match, Throw or Draw (Priority: P1)

On my turn I choose a card from my fanned hand that matches the top of the Discard Pile by colour, number or action symbol, and throw it. If I cannot or do not want to
play, I tap the Draw Pile and a card flies into my hand. The server checks every move. A card that is not allowed bounces back to my hand with a small shake and
a short reason, and nothing else changes.

**Why this priority**: Playing and drawing are the heart of every UNO turn; nothing else works without them.

**Independent Test**: In a match, play a matching card and watch the throw; try a non-matching card and watch it bounce back; try to play during another player's turn and
confirm it is refused; draw a card and watch it fly into the hand.

**Acceptance Scenarios**:

1. **Given** it is my turn and I hold a card matching the top card's colour, number or action symbol (or the active colour after a Wild), **When** I tap it or drag it
   onto the table, **Then** it flies to the Discard Pile in a snappy arc and becomes the new top card on every screen.
2. **Given** it is my turn, **When** I try to play a card that does not match, **Then** the card bounces back into my hand, the screen gives a brief subtle shake, a
   short reason appears, and the game state, the turn and my hand are unchanged.
3. **Given** it is not my turn, **When** I try to play or draw, **Then** the action is refused, my card bounces back, and nothing changes for anyone.
4. **Given** it is my turn, **When** I tap the Draw Pile, **Then** one card flies from the pile into my hand. If it can be played I may throw it at once or choose to keep
   it (which ends my turn); if it cannot be played my turn passes.
5. **Given** it is my turn, **When** I look at my hand, **Then** the cards I may play are visibly brighter than those I may not, and my turn is clearly signalled with a
   countdown.
6. **Given** I tap a card quickly twice, **When** the server receives both, **Then** the card is played at most once and nothing illegal happens.
7. **Given** the Draw Pile runs out, **When** a card must be drawn, **Then** the Discard Pile (except its top card) is shuffled to make a new Draw Pile and play goes on.
8. **Given** I hold a Wild Draw 4 and also a card of the active colour, **When** I play the Wild Draw 4, **Then** it is accepted like any Wild: there is no restriction and no
   challenge.

---

### User Story 4 - Action Cards, the Colour Wheel and the Direction Arrows (Priority: P1)

Skip, Reverse and Draw 2 change who plays next. Wild and Wild Draw 4 open a glowing four-colour wheel in the middle of the table so the player picks the new colour by hand.
The discard pile glows in the active colour so everyone always knows what is legal, and glowing arrows wrapped around the central piles show the direction of play. When a
Reverse is played the arrows flip direction with a flare.

**Why this priority**: These cards and cues are what make UNO feel like UNO, and the colour aura and direction arrows are explicit owner requirements.

**Independent Test**: Play a Wild and confirm the wheel opens, the aura takes the chosen colour on every screen, and the next player can only play that colour (or a Wild).
Play a Reverse and confirm the arrows flip. Play a Skip, a Draw 2 and a Wild Draw 4 and confirm the effect on the next player, then stack a second Draw 2 on a Draw 2 and confirm
the running total.

**Acceptance Scenarios**:

1. **Given** it is my turn, **When** I play a Wild or Wild Draw 4, **Then** a bright four-colour wheel pops up in the centre of the screen and I choose red, yellow, green or
   blue by hand before the card is committed.
2. **Given** the wheel is open, **When** I dismiss it without choosing, **Then** the card returns to my hand and nothing changes for anyone.
3. **Given** I chose a colour, **When** the card lands, **Then** the aura around the Discard Pile changes to that colour for everyone and the next player may only
   play that colour, a Wild or a Wild Draw 4.
4. **Given** a Reverse is played in a game of three or more, **When** it lands, **Then** the glowing arrows around the central piles reverse direction within half a
   second with a visual flare for everyone, and play continues in the new direction.
5. **Given** a Reverse is played in a game of two players, **When** it lands, **Then** the arrows still flip, and the player who played it takes the next turn
   (a Reverse acts as a Skip between two players).
6. **Given** a Skip is played, **When** it lands, **Then** the next player is skipped and a brief "Skipped!" notice appears over that player.
7. **Given** a Draw 2 is played, **When** it lands, **Then** a penalty of 2 is pending and every screen shows the running total ("+2") beside the piles; the next player may
   either play another Draw 2, which raises the total to 4 and passes the penalty on, or draw the whole total (shown flying from the deck) and lose their turn.
8. **Given** a Wild Draw 4 is played, **When** it lands, **Then** the player has chosen a colour, a penalty of 4 is pending and shown, and the next player may either play
   another Wild Draw 4 (choosing a colour, raising the total by 4) or draw the whole total and lose their turn.
9. **Given** a penalty is pending against me, **When** I try to play any card other than a draw card of the same kind (including a Skip, a Reverse, a Wild, or a Wild Draw 4
   on a Draw 2), **Then** it is refused with a short reason and nothing changes; only matching draw cards glow in my hand, and tapping the Draw Pile draws the whole total.
10. **Given** the match is running, **When** I look at the central area, **Then** the arrows are always visible and animate clockwise or counter-clockwise to show the current
   direction, and the active colour is shown by the aura and also by its name or symbol, never by colour alone.

---

### User Story 5 - The UNO! Call and Catching (Priority: P1)

When a player is about to be left with one card, they must shout UNO! by pressing the glowing "UNO!" button above their hand, before or exactly when they play their
second-to-last card. If they forget, every opponent sees a flashing "Catch [Name]!" button. The first opponent to press it makes the server hand the forgetful player a
2-card penalty. The forgetful player can still save themselves by pressing UNO! before anyone catches them.

**Why this priority**: The UNO! call and the catch are the signature rules of the game and an explicit owner requirement.

**Independent Test**: With two windows, play down to one card in window A without pressing UNO!; confirm window B sees "Catch A!", press it, and confirm A draws exactly 2
cards. Repeat with A pressing UNO! first and confirm there is no penalty and the catch is refused.

**Acceptance Scenarios**:

1. **Given** I hold exactly 2 cards, **When** I look above my hand, **Then** the "UNO!" button is glowing and ready; I may press it before playing, or at the same time as
   I play a card.
2. **Given** I pressed UNO! while holding 2 cards, **When** I play one of them and am left with 1 card, **Then** every screen shows a brief "UNO!" flash for me and
   I cannot be caught.
3. **Given** I play my second-to-last card without having pressed UNO!, **When** I am left with 1 card, **Then** every opponent's screen flashes a "Catch [My Name]!"
   button for a short window, and my own screen keeps the "UNO!" button pulsing so I can still call it.
4. **Given** a "Catch" button is showing, **When** an opponent presses it before I press UNO!, **Then** the server gives me 2 cards from the Draw Pile (shown flying into
   my hand), every screen shows a brief "Caught!" flash, and the catch button goes away.
5. **Given** a "Catch" button is showing, **When** I press UNO! first, **Then** I am safe, the catch button disappears for everyone, and any later press of it is refused
   with a short "too late" message.
6. **Given** two opponents press "Catch" at almost the same moment, **When** the server receives both, **Then** only the first is accepted, the penalty is applied once,
   and the second opponent sees "too late".
7. **Given** the catch window passes without a catch or a call, **When** it ends, **Then** the catch button disappears for everyone and the player is safe.
8. **Given** I do not hold exactly 2 cards and no catch window is open against me, **When** I press UNO!, **Then** it is ignored with a gentle "Not yet" hint and no penalty.
9. **Given** I called UNO! and then an opponent's Draw 2 or Wild Draw 4 makes me draw so that I hold more than 2 cards, **When** my hand changes, **Then** my earlier call is
   cleared and I must call again the next time I hold 2 cards.

---

### User Story 6 - A Table That Fits Every Screen (Priority: P2)

The table fills whatever screen it is on. On a desktop or any landscape screen, up to four opponents sit spread across the top and side margins, with the Draw and
Discard Piles in the middle and my hand fanned in an arc along the bottom. On a phone in portrait, two opponents sit on the top edge, one on the middle-left and one on
the middle-right, leaving the centre as large as possible. Each opponent shows who they are, whether they are connected, whether it is their turn, and how many
cards they hold as a small fan of card backs.

**Why this priority**: Graphics-first layout is a platform rule; a playable, beautiful table on every device is part of acceptance, but the rules must work first.

**Independent Test**: With 4 opponents, open the match at phone, tablet and desktop sizes in portrait and landscape and confirm every opponent, both piles, the arrows,
the UNO! button and the whole hand are visible and tappable with no page scroll, overlap or clipping. Then rotate or resize and confirm a quick re-fit with the state unchanged.

**Acceptance Scenarios**:

1. **Given** a desktop or landscape screen, **When** the match starts with 1 to 4 opponents, **Then** opponents are distributed evenly across the top and side margins and
   the central piles use the largest space the screen allows.
2. **Given** a phone in portrait with 4 opponents, **When** the match starts, **Then** two opponents are on the top edge, one on the middle-left and one on the
   middle-right, and the Draw and Discard Piles occupy the large central space.
3. **Given** 1, 2 or 3 opponents on a phone in portrait, **When** the match starts, **Then** one sits at the top centre; two sit at the top left and right; three sit at the
   top centre, middle-left and middle-right.
4. **Given** any opponent, **When** I look at them, **Then** I see their name, avatar and a "Bot" marker if they are a bot, their connection state (connected,
   reconnecting, left), a glowing ring and "playing" cue when it is their turn, and a fan of card backs with the exact number of cards as text.
5. **Given** my hand, **When** it is displayed, **Then** it is fanned in an arc at the bottom; a card enlarges and lifts slightly when the pointer is over it or I
   press it; and the fan tightens as the hand grows so every card stays reachable.
6. **Given** a phone, **When** I press and hold a card in a crowded hand, **Then** it lifts and enlarges so I can see what I am about to play; playing needs a
   release on the card, and sliding off the card cancels.
7. **Given** I rotate the device or resize the window, **When** the layout changes, **Then** the table re-fits within half a second with the game state unchanged.
8. **Given** any size from 320 px to 2560 px wide in either orientation, **When** I view the match, **Then** the page does not scroll, nothing overlaps or is clipped, and
   content respects the device's safe areas.

---

### User Story 7 - Believable Bots (Priority: P2)

Bots play like people. On its turn a bot thinks for a natural 1.5 to 2 seconds, then plays a legal card or draws, exactly like a human, under the same rules and the same
server checks. Bots call UNO! almost always, sometimes forget so that they can be caught, and catch a human who forgets after a fair, human-like pause.

**Why this priority**: Bots carry the solo mode and the "Fill empty slots with AI" override, but the game is playable with humans without them.

**Independent Test**: Start a solo match and watch several bot turns: confirm the 1.5 to 2 second pause, legal choices, colour choices after Wild cards, UNO! flashes, and
that no bot ever plays out of turn or breaks a rule.

**Acceptance Scenarios**:

1. **Given** it is a bot's turn, **When** the turn begins, **Then** the bot shows as "thinking" and after 1.5 to 2 seconds it plays a legal card or draws, with the
   same animations as a human.
2. **Given** a bot holds several playable cards, **When** it chooses, **Then** it plays a legal card by simple sensible preferences (for example, shedding colours it holds
   most of, saving Wild cards, using action cards against a player with few cards) and picks the colour it holds most of after a Wild.
3. **Given** a bot plays a card, **When** the server checks it, **Then** it passes through exactly the same validation as a human's action.
4. **Given** a bot is left with 1 card, **When** it plays, **Then** it calls UNO! most of the time, and now and then forgets so that a human can press "Catch [Bot]!" and
   give it a 2-card penalty.
5. **Given** a human is left with 1 card without having called UNO!, **When** the catch window is open, **Then** bots may catch them, but only after a human-like pause
   that leaves the human a fair moment to call UNO! first.
6. **Given** a bot only knows its own hand and the public table (top card, colour, counts, direction), **When** it plays, **Then** it never uses information a human
   player could not see.

---

### User Story 8 - Pure Player Chat (Priority: P2)

On wide screens the right column is the game chat; on phones it is a collapsible drawer. It is reserved for people: only messages typed by human players appear, each
with the sender's name and colour tag. Game events (plays, draws, UNO! calls, catches, wins) are shown only on the table itself, never in the chat. In a "Play with AI" room
there is nobody to talk to, so the chat is hidden and its space goes back to the table.

**Why this priority**: Chat is a platform feature that must work inside the game, and the owner wants it strictly human, but the game can be played without it.

**Independent Test**: In an online match exchange messages from two windows and confirm only typed messages appear while plays, UNO! calls and catches never do; in a
"Play with AI" match confirm there is no chat and no empty column.

**Acceptance Scenarios**:

1. **Given** an online match is running, **When** cards are played, UNO! is called or someone is caught, **Then** none of these events appear as lines in the chat.
2. **Given** I send a message, **When** it is delivered, **Then** everyone in the room sees it, in order, with my name and colour tag, as plain text and length-limited.
3. **Given** a phone in portrait with the chat drawer closed, **When** another player sends a message, **Then** the drawer handle shows an unread count that clears when I
   open it, and the closed drawer's handle never covers my hand or the UNO! button.
4. **Given** an online match with bots filling empty slots, **When** bots play, **Then** bots send no chat messages.
5. **Given** I am in a "Play with AI" room, **When** I view the screen, **Then** no chat panel, drawer or handle is shown and the table fills the freed space.
6. **Given** the room is still a lobby, **When** people join or leave, **Then** the platform's usual join and leave lines may appear in the lobby chat; they stop when the
   match begins.

---

### User Story 9 - Finishing, Leaving and Slow Players (Priority: P3)

The first player to play their last card wins the match at once and everyone sees a celebration and the standings. A player who does nothing is nudged by a
countdown and eventually removed so that the table is never stuck. Players who drop out and come back within the platform's reconnect window return to the table in sync.

**Why this priority**: A match must always end cleanly and never hang, but this polishes the experience rather than defining it.

**Independent Test**: Play a match to its end and confirm the winner screen; let one window sit idle until its countdown expires; close one window mid-match and reopen it
within the reconnect window to confirm a restored hand and table.

**Acceptance Scenarios**:

1. **Given** a player plays their last card, **When** the server accepts it, **Then** the match ends immediately and every screen shows the winner with a celebration and a
   standings list ordered by cards left (fewest first).
2. **Given** the results screen, **When** I choose to leave, **Then** I return to the Hub; **When** I am the host (or in a "Play with AI" room) and choose "Play again", **Then**
   a fresh match is dealt at once, with no lobby step, to the same players who are still in the room and the same bots.
3. **Given** it is my turn, **When** I do nothing, **Then** a visible countdown (30 seconds) runs, and when it ends the server draws one card for me, passes the turn and
   shows a short notice.
4. **Given** I miss three turns in a row, **When** the third countdown ends, **Then** I am removed from the match like a player who left, after a warning following the
   second, and my cards go back into the Draw Pile.
5. **Given** a player's seat is released in a running match (they left, lost connection beyond the reconnect window, or were removed), **When** it happens, **Then** their
   cards are shuffled into the Draw Pile, they are skipped from then on, the match continues for the others, and they cannot rejoin that match.
6. **Given** only one participant remains at the table, **When** the others have all gone, **Then** that participant is declared the winner at once.
7. **Given** I lose connection and return within the reconnect window, **When** I reconnect, **Then** I see the current table, my own hand, the turn and the direction
   before I can act, without a backlog of animations replaying.
8. **Given** the host leaves or disconnects past the window, **When** others remain, **Then** the host role passes under the platform's room rules, and if no human remains
   the room closes.

---

### Edge Cases

- The first face-up card is an action or Wild card: a Wild or Wild Draw 4 is returned to the Draw Pile and another is turned over; a Skip, Reverse or Draw 2 acts as if
  played by the dealer, so the first player is skipped, the direction reverses, or the first player draws 2 and loses their turn (nobody can stack on the starting card).
- A player draws a playable card: they may play it at once or keep it; keeping it ends the turn. A player who cannot play after drawing has their turn passed automatically.
- A player has drawn a playable card and the countdown ends: the server keeps the card and passes the turn; no second card is drawn and it does not count as a missed turn.
- A player holds a playable card but chooses to draw: this is allowed, and the match continues normally.
- A Draw 2 or Wild Draw 4 is played as a player's last card: the player wins at once and the penalty is not applied.
- A penalty is pending and the Draw Pile holds fewer cards than the total: the Discard Pile is reshuffled as usual, and the player draws as many cards as exist.
- A penalty is pending and the player's countdown ends: the server draws the whole pending total for them, the turn passes, and this counts as a missed turn.
- A player at 2 cards plays a stacked draw card and is left with 1 card: the UNO! call and catch rules apply as for any other card.
- Two-player games: Reverse acts as Skip; Skip and a drawn Draw 2 penalty give the same player another turn after the opponent's turn is lost.
- The Draw Pile runs out and the Discard Pile has only one card: players draw as many cards as are available; if none are available the turn passes.
- Several actions arrive at nearly the same moment (double taps, a Catch and a UNO! call, a Fill and a join): the server orders them, accepts each at most once, and
  the losers see a short "too late" or "match already started" message.
- A player presses UNO! early with 3 or more cards: it is ignored with a gentle hint. A player presses it with 2 cards, then draws to 3: the call is cleared.
- A catch is pressed after the window closed or after the player called UNO!: it is refused with "too late".
- The "Fill empty slots with AI" button is pressed with no empty slots, by a non-host, or after the match started: it is unavailable or refused with no change.
- "Play again" is pressed after other players have already returned to the Hub: the new match is dealt to those who remain; if fewer than 2 participants remain, "Play again"
  is unavailable with a reason and the host can only return to the Hub.
- The host presses "Fill empty slots with AI" while a guest is joining: the server decides one outcome; either the guest has the seat and one fewer bot is added, or the
  guest is told the match has already started.
- A very large hand (for example 25 cards after many penalties): the fan tightens and, below a readable minimum, the hand scrolls sideways inside its own area; the page
  never scrolls.
- A player disconnects while holding the turn: the countdown keeps running; the turn is auto-played at zero, and after the reconnect window the seat is released.
- Reduced motion is on: throws, draws, flashes and the arrows use brief, simple transitions and clear static markers, with no shake.
- The Hub is reopened, or an invite link is opened for a room that has ended, is full or has started: the platform's existing messages and way back to the Hub apply.
- A bot is the next player while a human is deciding on UNO! or Catch: the catch window stays open the same length regardless of who plays next.

## Requirements *(mandatory)*

### Functional Requirements

**Hub and Launch**

- **FR-001**: The Hub MUST show UNO as an active game tile with its own card art, tagline and theme colours, in the same grid as the other games.
- **FR-002**: Activating the UNO tile MUST open a launch modal that requires a choice between "Play with AI" and "Play Online" before any room is created. The modal MUST be
  dismissible by a close control, a tap outside and the Escape key without creating anything, and MUST be keyboard accessible.
- **FR-003**: "Play with AI" MUST ask for the number of computer opponents (1 to 4, 3 preselected), then create a private room holding only the host and that many bots, take
  the host straight to the table, and start the match at once with no lobby wait and no Start press. It MUST NOT generate or show an invite link or Copy Invite control.
- **FR-004**: "Play Online" MUST ask for the room capacity including the host (2 to 5, 4 preselected), then create a private room with the host in Slot 1, open its lobby, and
  show the room code and a shareable invite link (`/room/uno/{roomId}`) with a one-tap Copy control that confirms success.
- **FR-005**: UNO MUST declare to the Platform Core its identity, a minimum of 2 and a maximum of 5 players, a default capacity of 4, and AI support.

**Online Lobby**

- **FR-006**: The lobby MUST show every slot up to the capacity, with each seated player's name, colour tag, host marker, connection state and a "Bot" marker for AI seats,
  and MUST update for everyone in real time as people join, leave, disconnect or reconnect.
- **FR-007**: The host MUST be able to change the capacity between 2 and 5 and remove a player under the platform's room rules; capacity MUST NOT go below the number of
  seated participants.
- **FR-008**: The host MUST NOT be able to start a match with fewer than 2 seated participants; the interface MUST say why. With 2 or more seated, Start MUST be
  available, and empty slots MUST stay empty for that match.
- **FR-009**: The lobby MUST give the host, and only the host, a "Fill empty slots with AI" control, available whenever at least one slot is empty (even if the host is
  alone). Its label MUST state how many slots it will fill, and it MUST ask for a quick confirmation. On confirmation the server MUST seat a bot in every empty slot and
  start the match for everyone at once. The server MUST refuse it from anyone else, when no slot is empty, or after the match has started.
- **FR-010**: Starting the match, by either control, MUST move all participants to the match together and lock the room against new joiners.

**Rules and Server Authority**

- **FR-011**: A match MUST use a standard 108-card deck (see Appendix A), shuffled by the server, with 7 cards dealt to each player and one card turned face up to start. The first
  match starts with the host (the dealer is the seat before the host); FR-050 moves the first player on after each re-deal.
- **FR-012**: The server MUST own the deck, every hand, the draw and discard piles, whose turn it is, the direction of play, the active colour, penalties, UNO! status and
  the winner. Clients MUST only send intents (play a card, with a colour for a Wild; draw; keep the drawn card; call UNO!; catch a player) and MUST NOT decide any outcome.
- **FR-013**: A card MUST be playable when it matches the active colour (the top card's colour, or the colour chosen for a Wild), or has the same number, or has the same action
  symbol (Skip, Reverse, Draw 2) as the top card; Wild and Wild Draw 4 cards MUST be playable on any card. While a draw penalty is pending against a player, the only playable
  cards MUST be a Draw 2 on a Draw 2 and a Wild Draw 4 on a Wild Draw 4.
- **FR-014**: The server MUST refuse any action that is out of turn, uses a card the player does not hold, does not match, is not a matching draw card while a penalty is pending,
  omits or gives an invalid colour for a Wild, repeats an earlier action, or arrives from someone who is not seated. A refused action MUST change nothing and MUST tell only the
  sender why, briefly.
- **FR-015**: A Wild Draw 4 MUST be playable at any time on the player's turn, even when the player holds a card of the active colour. There is no restriction and no
  challenge rule.
- **FR-016**: On their turn a player MAY draw one card from the Draw Pile, even when they hold a playable card. If the drawn card is playable the player MAY play it at once
  or keep it (ending their turn); otherwise the turn passes. A player MUST NOT draw twice in one turn. While a draw penalty is pending against them, drawing MUST take the whole
  pending total at once and end their turn, with no option to play or keep a drawn card. When a player facing a pending penalty holds no matching draw card, the server MUST take the
  whole total for them after a short beat of about 1 second (they cannot do anything else) and end their turn; a player who can stack MUST be left to choose.
- **FR-017**: Action cards MUST have these effects: Skip passes over the next player; Reverse flips the direction (acting as a Skip in a two-player game); Draw 2 puts a
  penalty of 2 on the next player; Wild lets the player choose the active colour; Wild Draw 4 lets the player choose the colour and puts a penalty of 4 on the next player. A player
  facing a penalty MUST either play a draw card of the same kind (a Draw 2 on a Draw 2, or a Wild Draw 4 on a Wild Draw 4), which adds its value to the running total and passes the
  penalty to the next player in turn, or draw the whole total and lose their turn. A Draw 2 MUST NOT be stacked on a Wild Draw 4, or the reverse. A stacked Draw 2 sets the active colour
  to its own colour; a stacked Wild Draw 4 uses the colour its player chooses.
- **FR-018**: When the Draw Pile is empty, the server MUST shuffle the Discard Pile, except its top card, into a new Draw Pile.
- **FR-019**: The starting card MUST be turned over from the Draw Pile; a Wild or Wild Draw 4 MUST be returned to the Draw Pile and replaced, and a Skip, Reverse or
  Draw 2 MUST take effect as if played by the dealer; no player can stack on a starting Draw 2.
- **FR-020**: The first player to play their last card MUST win the match at once, whatever the card; there is no scoring across matches.
- **FR-021**: The server MUST send each player only the faces of their own cards. Every other hand MUST be known to clients only as a count, and the contents of the Draw
  Pile MUST never be sent.
- **FR-022**: Each human turn in which the player has a decision to make MUST have a visible countdown of 30 seconds (a turn that is resolved for the player under FR-016 has no
  countdown). When it ends the server MUST draw one card for the player (the whole pending total if a draw penalty is
  pending; if they already drew a playable card this turn, keep it and draw nothing more), pass the turn and show a short notice. After
  two missed turns in a row the player MUST be warned, and a third MUST remove them as in FR-051. The missed-turn count MUST reset as soon as the player takes any action.

**Table Layout**

- **FR-023**: The central area MUST hold a face-down Draw Pile and a face-up Discard Pile, with the active colour shown as a bright ambient glow around the Discard Pile and
  also as the colour's name or symbol. The glow MUST update for everyone as soon as a card lands. While a draw penalty is pending, the running total (for example "+4") MUST be
  shown beside the piles to everyone.
- **FR-024**: The player's hand MUST be fanned in an arc along the bottom of the screen; each card MUST enlarge and lift slightly under the pointer or a press; and the fan MUST
  tighten as the hand grows so that every card stays reachable, scrolling sideways inside the hand area only below a readable minimum.
- **FR-025**: Opponents MUST be placed so that their order around the table follows the seat order clockwise from my seat; seating stays fixed and a Reverse changes
  only the arrows. On desktop and landscape screens they MUST be
  distributed evenly across the top and side margins. On phones in portrait: 1 opponent at the top centre; 2 at the top left and right; 3 at the top centre, middle-left and
  middle-right; 4 as two on the top edge, one middle-left and one middle-right.
- **FR-026**: Each opponent MUST show name, avatar, a "Bot" marker for AI, connection status, an active-turn indicator, and a fan of card backs with the exact number of cards
  as text; large counts show a limited number of backs plus the number.
- **FR-027**: The layout MUST scale to the largest size that fits without scrolling or clipping between 320 px and 2560 px wide in both orientations, MUST respect safe areas,
  MUST re-fit within half a second on rotation or resize without changing state, and MUST NOT leave large unused areas: the piles and arrow track span at least 95% of the centre area's height or width, and the centre area is at least 50% of the screen height. In "Play with AI" rooms the table MUST use the space
  a chat would occupy.
- **FR-028**: On my turn the cards I may play MUST be visibly brighter than those I may not, and a clear "Your turn" cue with the countdown MUST appear; when it is not my turn
  the active player MUST be clearly marked at their position on the table.
- **FR-029**: Colour MUST never be the only cue: card faces carry their number or symbol, and the active colour is also named.

**Card Motion and Visual Polish**

- **FR-030**: Tapping a playable card, or dragging it onto the table and releasing it, MUST trigger a snappy parabolic throw to the Discard Pile. On touch, a press MUST lift and
  enlarge the card, a release on the card MUST play it, and sliding off MUST cancel.
- **FR-031**: Drawing MUST visibly fly the card from the Draw Pile to the player's hand, and every other player's draw, penalty or play MUST visibly fly to or from that
  player's position on the table for everyone.
- **FR-032**: When the server refuses a play the card MUST snap back into the hand with a bouncy animation, the screen MUST give a subtle haptic-style shake, and a short
  reason MUST appear.
- **FR-033**: Playing a Wild or Wild Draw 4 MUST open a glowing four-colour wheel in the centre of the screen; the player MUST pick the colour by hand; the card MUST only be
  committed on a choice; dismissing the wheel MUST return the card to the hand.
- **FR-034**: Glowing arrows MUST wrap around the central piles and continuously animate clockwise or counter-clockwise to show the current direction, remaining clearly
  visible against every active colour. When a Reverse lands they MUST flip direction within half a second with a visible flare, on every screen.
- **FR-035**: Every animation MUST reflect an event the server has already accepted, MUST NOT decide any result, and MUST play in the same order on every screen.
- **FR-036**: With a reduced-motion preference, throws, draws, flashes and the arrows MUST use brief, simple transitions and clear static markers (for example, a direction
  badge), with no shake, and all information MUST remain available.

**The UNO! Call**

- **FR-037**: A prominent, glowing "UNO!" button MUST sit above the player's hand throughout the match; it MUST glow and be ready whenever the player holds exactly 2 cards,
  or a catch window is open against them.
- **FR-038**: A player who holds exactly 2 cards MAY call UNO! at any time, including at the same instant as they play. A call MUST be remembered, and MUST be cleared if the
  player's hand grows beyond 2 cards. Calling at any other time MUST be ignored with a gentle hint and no penalty.
- **FR-039**: When a player is left with exactly 1 card by playing a card without having called UNO!, the server MUST open a catch window of exactly 5 seconds from the moment
  the card is played, whoever plays next and whether the opponents are human or bots. During it every opponent
  MUST see a flashing "Catch [Name]!" button, and the player MUST still be able to call UNO! to close the window safely.
- **FR-040**: The first accepted "Catch" in the window MUST make the server give the caught player 2 cards from the Draw Pile, close the window, and show a brief "Caught!"
  announcement to everyone. Any other catch, or a catch after a call or after the window, MUST be refused with a short "too late" message and MUST NOT apply a second penalty.
- **FR-041**: A successful call MUST show a brief "UNO!" announcement to everyone, and a player who has called MUST NOT be catchable for that card.

**Bots**

- **FR-042**: In "Play with AI" rooms, and in online rooms where the host filled empty slots, bots MUST take their turns under the same rules as humans and their actions MUST pass
  through the same server validation. A bot MUST only use its own hand and the public table state.
- **FR-043**: A bot MUST wait a random 1.5 to 2 seconds before each action (a play, a draw, or keeping a drawn card), and MUST show a "thinking" cue while it waits.
- **FR-044**: Bots MUST choose legal cards by simple preferences (shed the colour held most, save Wild cards for when nothing else fits, use action cards against a player
  holding few cards), choose the colour they hold most of after a Wild, stack a matching draw card on a pending penalty when they hold one and the next player is not close to
  winning (otherwise draw), call UNO! most of the time and occasionally forget, and MAY catch a human who has not called UNO! after a
  human-like pause that leaves that human a fair moment to call first.
- **FR-045**: Every bot MUST have a friendly name, an avatar and a clear "Bot" marker, and MUST NOT post any chat message.

**Chat**

- **FR-046**: The match MUST include the platform's room chat for human players only: only messages typed by people may appear, each with the sender's name and colour tag,
  as plain text with the platform's length and rate limits. No system lines, game-event lines or bot messages MAY appear while a match is in progress.
- **FR-047**: On wide screens the chat MUST sit in a right-hand column; on phones and narrow screens it MUST be a collapsible drawer with an unread count while closed that
  never covers the hand or the UNO! button when closed.
- **FR-048**: In "Play with AI" rooms the chat MUST be hidden entirely, with no panel, handle or empty column.

**Results, Departures and Recovery**

- **FR-049**: When a match ends, every screen MUST show the winner with a celebration and a standings list ordered by cards left, fewest first (ties broken by seat order, and players
  who left listed last as "Left"), with a way back to the Hub.
- **FR-050**: The results screen MUST offer "Play again" to the host in online rooms and to the human in "Play with AI" rooms. Choosing it MUST re-deal a fresh match at once,
  with no lobby step, to the same participants (the people still connected and the same bots), with the first player one seat further clockwise than in the previous match; the room stays closed to new joiners and its capacity does not change. It MUST be
  unavailable, with a reason, when fewer than 2 participants would remain. Every participant MUST also be able to return to the Hub.
- **FR-051**: When a seat is released during a match (the player left, lost connection past the reconnect window, pressed Quit, or missed three turns in a row), their cards
  MUST be shuffled into the Draw Pile, they MUST be skipped from then on, the match MUST continue, and they MUST NOT be able to rejoin that match. If the released player was facing a
  pending Draw 2 or Wild Draw 4, the penalty MUST be cancelled rather than passed on to another player.
- **FR-052**: If only one participant remains at the table, that participant MUST be declared the winner at once; if no human remains, the room MUST close.
- **FR-053**: A player who reconnects within the platform's reconnect window MUST receive the current table state, including their own hand, before they can act, without a
  backlog of animations replaying.

**Platform Integration and Deployment**

- **FR-054**: UNO MUST use the Platform Core's rooms, invite links, presence, host role, reconnect window and chat without reimplementing them, and MUST own only its deck, rules,
  bots, table views and screens.
- **FR-055**: The module MUST run on the existing Render deployment with no new services or storage; matches and rooms end when the service restarts, and players MUST see
  the platform's existing "reconnecting" state during that time.
- **FR-056**: For verification only, a development-only setting MUST allow the deal and draw order to be fixed; production MUST ignore it and clients MUST never be able to choose
  or influence the deck.

### Key Entities *(include if feature involves data)*

- **Match**: One game of UNO in a room: the seated players, the Draw Pile, the Discard Pile, whose turn it is, the direction of play, the active colour, the turn countdown, any
  open catch window, any pending draw penalty, and the winner.
- **Seat / Player**: A place at the table: slot number, display name, colour tag, host marker, human or bot, connection state, hand size, UNO! call status and missed-turn count.
- **Card**: One of the 108 cards: a colour (red, yellow, green, blue or none for Wild), and a value (0 to 9, Skip, Reverse, Draw 2, Wild, Wild Draw 4).
- **Hand**: The cards a player holds; its faces are visible only to its owner and its size to everyone.
- **Draw Pile / Discard Pile**: The shuffled face-down stack and the face-up stack whose top card sets what is legal.
- **Active Colour and Direction**: The colour that the next card must match (set by the top card or by a Wild) and whether play runs clockwise or counter-clockwise.
- **Catch Window**: The short period after a player is left with one card without having called UNO!, in which they may still call and opponents may catch them.
- **Bot**: A computer-controlled seat with a name, avatar, a thinking delay and simple play preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can go from the Hub tile to a dealt, running match against bots in 3 taps or clicks (tile, "Play with AI", confirm) and in under 10 seconds, and the room
  shows no invite link and no chat in 100% of observed solo matches.
- **SC-002**: A host can go from the Hub tile to an online lobby that shows a copyable invite link in 3 taps or clicks and in under 5 seconds, and a guest who opens the link
  appears in the host's lobby within 2 seconds.
- **SC-003**: Across at least 50 attempted illegal actions (out of turn, non-matching card, a Wild without a colour, duplicate taps, a card not held, a
  host-only control used by a guest), 100% are refused with no change to any screen's game state, and the sender sees the bounce and a short reason within 0.5 seconds.
- **SC-004**: In at least 95% of turns, every player's screen shows the same top card, active colour, direction, turn and card counts within 1 second of the move.
- **SC-005**: A Wild or Wild Draw 4 opens the colour wheel within 0.2 seconds of the tap; after a choice, the aura on every screen shows the new colour within 1 second; and the
  next player is limited to that colour (or a Wild) in 100% of observed plays.
- **SC-006**: In 100% of observed Reverse plays, the arrows on every screen flip direction within 0.5 seconds with the flare, and with reduced motion the direction badge
  changes at the same moment.
- **SC-007**: In 100% of observed forgotten-UNO! cases, the first catch inside the 5-second window gives exactly 2 cards within 1 second and no player is ever penalised twice for
  the same incident, even when two opponents press Catch together; a call inside the window always removes the catch button within 0.5 seconds.
- **SC-008**: Catch buttons appear on every opponent's screen within 0.5 seconds of a player being left with one card without a call, and remain for the whole window.
- **SC-009**: Every bot action waits between 1.2 and 2.3 seconds after its turn begins or after its previous action in the same turn (1.5 to 2 seconds, plus or minus 0.3), and no bot is ever observed breaking a rule or
  playing out of turn.
- **SC-010**: On every tested screen from 320 px to 2560 px wide in portrait and landscape, with 1 to 4 opponents, the page needs no scrolling and every opponent, both piles,
  the arrows, the UNO! button and the hand are fully visible without overlap or clipping; with a 7-card hand on a 320 px screen each card's visible slice is at least 40 px wide.
- **SC-011**: In portrait on a phone with 4 opponents, the central play area (piles and arrows) takes at least 35% of the viewport height; in landscape it takes at least 35%
  of the viewport height as well, with chat docked where it exists; in every case the piles and arrow track span at least 95% of the centre area's height or width.
- **SC-012**: Rotating a device or resizing a window re-fits the table in under 0.5 seconds with the game state unchanged in 100% of observed cases.
- **SC-013**: Across matches with 2, 3, 4 and 5 players, solo and online, the winner is announced correctly when the last card is played in 100% of observed matches.
- **SC-014**: In an online match, 0 system, game-event or bot lines appear in chat across a full match, and in solo matches 0 chat panels, drawers or empty columns appear.
- **SC-015**: No message, screen or developer-visible data on a player's device reveals the face of any other player's card or any card in the Draw Pile, in 100% of inspected
  matches.
- **SC-016**: A player who reconnects within the reconnect window sees the current table, their own hand and the turn within 2 seconds, with no replay of past animations.
- **SC-017**: A first-time player who knows UNO plays a full turn (a card or a draw) within 20 seconds of the match starting, without instructions.
- **SC-018**: Animations stay visually smooth (95% of frames at or under 20 ms under a 4x CPU slowdown) on a mid-range phone and a laptop during a 5-player match.
- **SC-019**: With reduced motion enabled, 100% of game information and controls remain available and understandable.
- **SC-020**: In 100% of observed Draw 2 and Wild Draw 4 chains, the running total shown on every screen within 1 second equals the sum of the stacked cards, only matching draw
  cards are accepted while it is pending, and the player who finally draws receives exactly that many cards (fewer only if the piles run out).

## Assumptions

- Terms: the **table** is the in-match screen; the **active colour** is the colour the next card must match; **Slot 1** is the host's seat; **catch window** is the 5-second period
  in FR-039; **Play again** is the results-screen action in FR-050.
- This feature builds on the Platform Core ([specs/001-platform-hub-rooms](../001-platform-hub-rooms/spec.md)): the Hub, launch modal, rooms, invite links, host role, presence, the
  60-second reconnect window and chat. UNO follows the same "Play with AI" and "Play Online" launch pattern as Ludo, with its own limits (1 to 4 bots; 2 to 5 players), and the
  platform's launch step is extended to ask for the number of bots or the capacity as this specification describes.
- Bots are present in "Play with AI" rooms and in online rooms where the host filled empty slots. The platform already supports bots in Ludo; Housie and Bingo do not use them.
- Rules follow standard casual UNO: 108 cards, 7 cards each, matching by colour, number or symbol, stacking only of a Draw 2 on a Draw 2 and a Wild Draw 4 on a Wild Draw 4 (confirmed in Clarifications), a Wild Draw 4 playable at any time
  (confirmed in Clarifications), no challenge rule, a one-card draw when a player cannot or does not wish to play, and a win when the last card is played. Points and multi-round
  scoring are out of scope.
- Drawing is allowed even when a playable card is held; this is a casual house rule chosen for friendliness and can be tightened in clarification.
- Bots call UNO! about five times in six, and the host's "Fill empty slots with AI" asks for a short confirmation. These values are defaults chosen so that a human can react on
  a phone; they can be changed in planning without changing the rules. The 5-second catch window and the 30-second turn countdown with removal after three missed turns are
  confirmed (see Clarifications).
- The turn countdown and the removal of idle players were not in the original brief; they are included so that one absent player can never freeze a match, and mirror Ludo.
- In "Play with AI" rooms the human is the only person, so there is no chat, and three missed turns end the match, because the only human is gone.
- Chat follows Bingo's precedent: the platform's chat engine is used unchanged, with game events shown only on the table. The room hides the chat in solo rooms; UNO adds no chat of
  its own.
- Visual direction is the written royal arcade brief: rich saturated colours on a deep, high-contrast backdrop, glowing active states and tactile buttons, with the four UNO colours
  kept vivid. Card faces and all artwork are original to myArena and carry number or symbol markers so colour is never the only cue. The "UNO" name and the "UNO!" call are used
  as requested; whether the name may be used for public release is the owner's decision.
- Platform versus game ownership: the Platform Core owns rooms, invites, presence, host role, reconnect and chat; the UNO module owns the deck, rules engine, turn and direction
  handling, UNO! and catch handling, bots, and its table, lobby extras and results screens. The server holds all rule authority; the browser only shows state and sends intents.
- The module runs on the existing Render deployment on the free plan with the platform's keepalive; no new services or storage are needed, and active matches end if the service
  restarts, as rooms do today.
- All of this is verified by playing in a browser with at least two clients at phone, tablet and desktop sizes in both orientations; no automated test suites are added
  (constitution Principle III). Reproducible checks use a development-only way to fix the deck; production clients can never choose cards.
- Out of scope: money, prizes or stakes, scoring across rounds, challenge rules, other house-rule options (stacking a Draw 2 on a Wild Draw 4 or the reverse, jump-in, 7-0,
  draw until playable), spectators, saved history,
  voice chat, more than 5 players, accounts, and adding bots to a running match.

## Appendix A: Deck and Rules Summary

**Deck (108 cards)**

| Cards | Per colour (red, yellow, green, blue) | Total |
|-------|---------------------------------------|-------|
| Number 0 | 1 | 4 |
| Numbers 1 to 9 | 2 of each | 72 |
| Skip | 2 | 8 |
| Reverse | 2 | 8 |
| Draw 2 | 2 | 8 |
| Wild | n/a | 4 |
| Wild Draw 4 | n/a | 4 |

**Playability**: a card is playable if its colour is the active colour, or its number or action symbol equals the top card's. A Wild and a Wild Draw 4 are always playable.

**Effects**

| Card | Effect |
|------|--------|
| Skip | The next player is skipped. |
| Reverse | The direction flips; between two players it acts as Skip. |
| Draw 2 | Puts a penalty of 2 on the next player, who may stack another Draw 2 or draw the total and lose the turn. |
| Wild | The player chooses the active colour. |
| Wild Draw 4 | The player chooses the active colour and puts a penalty of 4 on the next player, who may stack another Wild Draw 4 or draw the total and lose the turn. |

## Appendix B: Manual Verification Checkpoints

Each checkpoint is run in a browser with a controlled development-only deck where a fixed hand is needed. Evidence records the scenario, expected result and observed result.

1. **Solo start**: Click UNO, choose "Play with AI", choose 3 opponents. Expect: a running match with 4 players, 7 cards each, no invite link, no chat panel, no Start button.
2. **Online lobby**: Click UNO, choose "Play Online", set capacity 5. Expect: a lobby with 5 slots, an invite link and Copy control, Start unavailable, and the "Fill empty slots with
   AI" button available to the host only.
3. **Join and start**: Open the invite link in a second window. Expect: the guest takes Slot 2 within 2 seconds; the host can Start; the match runs with 2 players.
4. **Fill with AI**: Repeat 2 and 3, then press "Fill empty slots with AI" and confirm with the second window seated. Expect: 3 bots appear, the match starts for both windows, and
   bots wait 1.5 to 2 seconds before each action.
5. **Wild**: Play a Wild. Expect: the colour wheel opens in the centre; after a choice the aura changes colour in both windows; the next player can only play that colour or a Wild.
6. **Reverse**: Play a Reverse (three or more players). Expect: the arrows flip direction with a flare in every window, and play passes the other way.
7. **UNO and catch**: In window A play down to 1 card without pressing UNO!. Expect: "Catch A!" flashes in window B; pressing it makes A draw exactly 2 cards. Repeat with A pressing UNO!
   first; expect no penalty and a "too late" message for B.
8. **Illegal moves**: Try a non-matching card and a play out of turn. Expect: a bounce with a short reason each time and no change in either window. Then play a Wild Draw 4 while
   holding a card of the active colour. Expect: it is accepted.
9. **Draw and keep**: Draw a playable card and keep it. Expect: the card flies into the hand and the turn passes.
10. **Layouts**: With 4 opponents check 390 x 844, 844 x 390, 768 x 1024, 1366 x 768, 1920 x 1080 and 320 x 568. Expect: no scrolling, overlap or clipping, the hand fully reachable, the
    piles large in the centre, and a quick re-fit on rotation.
11. **Chat**: Send messages in an online match and play cards. Expect: only typed messages appear in the chat; in a solo match there is no chat.
12. **Reconnect**: Reload a window mid-match within a minute. Expect: the current table, own hand and turn without replayed animations.
13. **End of match**: Play a last card. Expect: the winner celebration and standings in every window and "Play again" for the host; pressing it deals a fresh match to both windows at
    once with no lobby step.
14. **Stacking**: Play a Draw 2 with a second Draw 2 in the next player's hand. Expect: "+2" shows in every window; the next player's Draw 2 glows and nothing else does; stacking
    raises the total to "+4"; the following player draws exactly 4 cards and loses the turn. Repeat with Wild Draw 4, and try a Draw 2 on a Wild Draw 4 and expect a bounce.
15. **Render**: After deploy, repeat 1, 2, 5 and 7 on the live URL and record the results; local-only checks are not deployment verification.

# Phase 0 Research: UNO Multi-Player & AI Game Module

Each entry: **Decision**, **Rationale**, **Alternatives considered**. The spec has no open `NEEDS CLARIFICATION` items (five were resolved in the 2026-11-05
clarification session), so the entries below settle design questions the spec leaves to planning. Facts about existing code come from the Platform Core (001),
Ludo (002), Housie (003), the polish update (004) and Bingo (005) as built. UNO is the fourth real game; it reuses their room, lobby, quiet-chat and per-person event
mechanisms and adds three small opt-in platform capabilities (R8).

## R1. Rendering and effects

**Decision**: Plain DOM and CSS with inline SVG, as in Ludo, Housie and Bingo. One `CardFace` component draws every card from its id: a rounded card in the colour (deep
saturated fill, white inner oval, large centre value, corner indices top-left and bottom-right, a small symbol for Skip, Reverse and Draw 2, and a four-colour pinwheel for
Wild cards) and a card back (royal-purple field, gold border, slanted logo oval). The **aura** is a radial gradient and layered `box-shadow` on a wrapper around the
Discard Pile whose colour follows a CSS variable and eases over 350 ms. The **arrows** are an SVG ring of three chevron arcs with a CSS rotation animation (clockwise or
counter-clockwise by a class); a Reverse swaps the class and plays a 600 ms flare (ring flash, arrow glow burst). The **colour wheel** is a four-wedge SVG dialog with glowing
edges. **Throw, draw flight, shake and flare** use the Web Animations API on transforms and opacity only. No canvas, no 3D library, no new dependency.

**Rationale**: DOM buttons give touch, pointer, keyboard and screen-reader behavior for free (FR-024, FR-030); the effects are short transform and opacity changes that stay
smooth on mid-range phones (SC-018); SVG card art scales to any card size without bitmap assets.

**Alternatives**: Canvas or WebGL for the table (rejected: accessibility, battery, more code); bitmap card images (rejected: licensing, weight, blur at large sizes);
a CSS framework (rejected: the project uses plain CSS).

## R2. Deck, card ids and shuffle

**Decision**: A card is an integer id from 0 to 107, decoded by `cardOf(id)` in `shared/src/uno/cards.ts`. Colour order is red, yellow, green, blue. For colour index `c`
(0 to 3), `base = 25 * c`: offset 0 is the 0; offsets 1 to 18 are the numbers 1 to 9 twice (`1 + 2 * (n - 1) + copy`); offsets 19 and 20 are Skip, 21 and 22 Reverse,
23 and 24 Draw 2. Ids 100 to 103 are Wild and 104 to 107 are Wild Draw 4. That is 4 × 25 + 8 = 108 cards (spec Appendix A). The server shuffles with a Fisher-Yates
pass using `node:crypto` `randomInt`, deals 7 cards to each seat round-robin in slot order (host first), and turns the next card over to start (FR-011, FR-019).

**Rationale**: Integer ids make events tiny, keep card faces out of anything the server does not intend to reveal, and let the client draw any revealed card with one
shared function. Shuffling and dealing on the server satisfies Principle V.

**Alternatives**: Sending card objects (rejected: larger payloads, easy to leak extra fields); a client-side shuffle (rejected: authority).

## R3. Rules engine (server, pure functions)

**Decision**: `server/src/games/uno/rules.ts` holds pure functions over a small `Table` shape: `playable(table, hand, drawn)`, `canStack(table, hand)`, `applyPlay`, `nextActive`,
`standings`. Legality, in this order, for the player whose turn it is:

1. Phase `drawn` (the player just drew a playable card): only the drawn card may be played, or the turn may be kept (FR-016).
2. A pending penalty: only a Draw 2 on a pending Draw 2, or a Wild Draw 4 on a pending Wild Draw 4 (FR-013, FR-017); nothing else, and a draw takes the whole total.
3. Otherwise a Wild or Wild Draw 4 is always playable (FR-015); a coloured card is playable when its colour is the active colour, or its number equals the top card's
   number, or its action kind (Skip, Reverse, Draw 2) equals the top card's kind.

Effects after a legal play: a number card advances one seat; Skip advances two (the skipped player is named in the event); Reverse flips the direction and advances one seat
in the new direction, or lets the same player go again when exactly two players are active; Draw 2 sets the active colour to its own colour and adds 2 to the pending
total; Wild sets the chosen colour; Wild Draw 4 sets the chosen colour and adds 4 to the pending total. A player whose hand becomes empty wins at once and the effects of
that last card are not applied (FR-020). The starting card follows FR-019 (a Wild or Wild Draw 4 goes back into the pile and another card is turned; Skip, Reverse and Draw 2
act as if the dealer played them, and nobody may stack on a starting Draw 2). An empty Draw Pile is rebuilt from the Discard Pile except its top card, reshuffled (FR-018); if
there are still too few cards, the player draws what exists.

**Rationale**: Pure functions are easy to check against the appendix tables in a scripted client and keep the engine small. The decision order matches the spec scenarios
exactly, including the "drawn card only" rule and the stacking rule confirmed on 2026-11-05.

**Alternatives**: Letting the client compute playable cards (rejected: authority and drift); encoding rules in data tables (rejected: UNO has too few rules to justify it).

## R4. Per-viewer events and snapshots (hidden hands)

**Decision**: Ludo broadcasts one event with the full state; Bingo broadcasts public events and sends private ones with `emitTo`. UNO cannot broadcast full state because hands
are private, and a public-plus-private pair for every step would make the client correlate two messages. So the server builds **one event per human viewer** and sends it with
`ctx.emitTo(playerId, event)`. Every event is `{ seq, type, ...payload, table, you }`: `table` is the public snapshot (piles' sizes, top card, active colour, direction,
pending penalty, catch window, countdown, per-player hand counts and UNO! flags) and `you` is the viewer's own block (hand, playable ids, drawn card, button states). Payload
fields that would reveal a hidden card (the faces a player drew) are included only in that player's copy. Bots receive nothing (the engine acts for them). `getView(match,
playerId)` returns the same `table` and `you` for create, join and resume acks, so a reconnect needs no replay (FR-053, SC-016). `seq` grows by 1 per event; a client that sees
a gap shows the newest event's state and calls the existing `resyncRoom`.

**Rationale**: One atomic message per viewer keeps privacy simple (nothing to filter later), and carrying the full `table` and `you` on every event makes events
self-contained like Ludo's. With at most 5 seats and about 30 events a match, the extra sends cost nothing.

**Alternatives**: Full-state broadcast (rejected: leaks hands); public broadcast plus a private hand event (rejected: two messages and ordering rules per step); sending only
deltas (rejected: gaps would corrupt the hand; full snapshots make recovery trivial).

## R5. Turn flow, pacing, countdown and pending penalties

**Decision**: A match moves through phases `settling` (animations from the last move are playing; actions other than UNO! and Catch are refused with "Please wait"), `turn`
(the active player may play or draw), `drawn` (the active player drew a playable card and may play it or keep it) and `finished`. After each play the server waits
`SETTLE_PLAY_MS` (600 ms) or `SETTLE_EFFECT_MS` (900 ms when a Skip, Reverse, Wild or stack was played) and after a draw `FLY_MS + (n - 1) * FLY_STAGGER_MS` (400 ms plus 110 ms
per extra card, at most 1200 ms), so the next player's turn begins only after the screens have finished animating; then it emits a `turn` event. A human's turn starts a
30-second countdown (`remainingMs` is computed from `ctx.now()` at snapshot time, as in Ludo). A bot's turn starts a random 1.5 to 2.0 second pause (R7).

When the countdown ends the server draws for the player (the whole pending total when a penalty is pending, else one card, then passes without playing the drawn card; when the player
has already drawn a playable card the server keeps it and passes, with no second draw and no missed turn),
counts a missed turn (any action resets the count), warns after the second miss and releases the seat after the third with `ctx.releaseSeat(id, 'inactive')`, exactly as
Ludo does (FR-022, SC-016).

When a penalty is pending and the target holds no matching draw card, the server resolves it after a short beat (`PENALTY_BEAT_MS`, 900 ms for a person, or the bot's normal 1.5 to 2.0 s pause for a bot, during which everyone sees the
"+N" badge) instead of waiting for a tap. A target who can stack always gets the choice, including the option to draw. If the target leaves, the penalty is cleared.

**Rationale**: Waiting for animations keeps all screens in step (SC-004) and gives bots a human rhythm; auto-resolving an unavoidable penalty removes a pointless tap and a
30-second stall.

**Alternatives**: Accepting actions during animations (rejected: a fast player could act before the previous card has visibly landed, and two screens would disagree on order);
always requiring a tap on the Draw Pile (rejected: slower and invites idle timeouts); passing a pending penalty on when its target leaves (rejected: punishes a bystander).

## R6. UNO! call and catch window

**Decision**: Each seat has a `calledUno` flag, true after a `callUno` accepted while the player holds exactly 2 cards (or during their own catch window), and cleared whenever the
hand grows beyond 2 cards. When a play leaves a player with exactly 1 card and `calledUno` is false, the server opens a **catch window** of exactly 5 seconds (a
`ctx.schedule` timer independent of the turn timer) and emits `catchOpen`. While it is open: `callUno` by the victim closes it safely and emits `uno`; the first accepted
`catchPlayer` by another player gives the victim 2 cards from the Draw Pile, emits `caught` and a `draw` event, and closes the window; any later call or catch is answered
with a rejection ("Too late."). The window also closes when it expires, when the victim's hand changes (an opponent's penalty reaches them), when the victim leaves, and when
the match finishes. Races are decided by arrival order at the server (Node handles one message at a time), so a Catch and a call arriving "together" have one winner (FR-039
to FR-041, SC-007). A call while holding exactly 2 cards (before or as the card is played) sets the flag and emits `uno` at once.

**Rationale**: A fixed server-side window is the same for people and bots (clarified 2026-11-05), needs no client clock and has a single decision point.

**Alternatives**: Window tied to the next player's action (rejected: bots act in 1.5 to 2 s, leaving no fair moment); client-side timing (rejected: authority).

## R7. Bots

**Decision**: `bot.ts` never sees the match. It receives a `BotView` built by the engine from the bot's own hand and the same public `table` humans get, and returns an intent:
`{ call: boolean, action: play | draw | keep }` or a catch decision. Choosing a card: when a penalty is pending, stack if possible unless the next player holds 2 cards or fewer
(then draw); otherwise among playable cards prefer, in order, a Skip, Reverse or Draw 2 when the next player holds 3 cards or fewer, then the number card in the colour the bot holds
most of, then a Wild only if nothing else is playable; after a Wild choose the colour held most (random among ties). If nothing is playable, draw; a drawn playable card is played.
Calling UNO!: before the play that leaves one card the bot calls with probability 5/6 (`UNO_DEV_FORGET` overrides). Catching: when a human's catch window opens, each bot schedules
a catch after a random 2.0 to 3.5 seconds and fires only if the window is still open; the first to fire wins. Every bot action calls the same functions that a human's `onAction`
calls (`playCard`, `drawCard`, `keepCard`, `callUno`, `catchPlayer`), so rules, ordering and events are identical (FR-042). A bot's pause is a random 1.5 to 2.0 seconds measured
from the start of its turn (`UNO_DEV_BOT_MS` fixes it for scripted checks) and the table shows a "thinking" cue (FR-043).

**Rationale**: Splitting the view makes "bots only know what a human knows" structural rather than a promise (FR-042); the heuristics are cheap and give recognisable play.

**Alternatives**: Search or lookahead (rejected: not wanted, adds nothing to a casual game); bots that never forget (rejected: the catch mechanic would never be exercised solo).

## R8. Platform extension: opt-in launch capabilities and Fill with AI

**Decision**: UNO needs four things the platform does not do today. Each is added once to the platform and switched on per game, so Ludo, Housie and Bingo are unaffected:

1. `GameDefinition.launch?: { askCapacity?: boolean; startAiAtOnce?: boolean; hostFillWithAi?: boolean }`; UNO sets all three.
2. **Capacity at creation** (`askCapacity`): `room:create` gains an optional integer `capacity`. For an online room the store validates it against the game's minimum and maximum
   (the same range as `room:setCapacity`) and defaults to `defaultCapacity`. The launch modal adds a "How many players?" step (2 to 5, 4 preselected) before creating.
3. **Start AI rooms at once** (`startAiAtOnce`): after seating the creator and bots, the store calls the new `Room.startNow()` (the body of `start` after its host and count
   checks) so the create acknowledgement already carries the match snapshot (`JoinedData.game` exists for exactly this). The AI opponent picker preselects
   `defaultCapacity - 1` (3 for UNO and Ludo) and the schema ceiling for `botCount` rises from 3 to 4; the store still validates `1..maxPlayers - 1` per game.
4. **Host fills empty seats** (`hostFillWithAi`): a new host event `room:fillAi` seats a bot in every empty seat of an online lobby (names continue the existing bot list and
   stay unique) and then calls `startNow()`. It is refused for non-hosts, outside an online lobby, when no seat is empty, and for games that did not opt in. `HostControls` shows
   "Fill N empty slots with AI" for those games, with a short confirmation step (FR-009).

The lobby is the platform's own: seats, invite link, capacity stepper (2 to 5), Start (disabled below 2 seated) and chat are unchanged and the game registers no lobby screen.
Details and the changed signatures are in [contracts/platform-integration.md](contracts/platform-integration.md).

**Rationale**: Principle IV says shared capabilities belong to the platform; the same flags let Ludo ask for a capacity or fill seats later without new code. `startNow()` is the
smallest way to start at once: no second round trip, no lobby flash, no race with the first bot turn.

**Alternatives**: Client sends `room:start` right after creating (rejected: a visible lobby flash, a second request, and a race with the first turn); a game-specific "fill" action
through the lobby channel (rejected: engines cannot seat participants, so the room would still need a new capability, and it would be hidden from other games); an engine service
`ctx.addBot()` (rejected: larger contract change than one host event).

## R9. Play again and start order

**Decision**: "Play again" is an engine action (`playAgain`), not `room:reset`. Only the host (through `ctx.hostId()`, so it follows host handover; in a solo room the human is the
host) may send it, and only when the match is finished and at least 2 seats are still active. The engine re-deals in place with the same context: same seats (released seats were
already dropped), same bots, `matchNo` + 1, a fresh deck and a `deal` event that carries a full snapshot; the room stays `in_progress`, so it stays locked to joiners and its
capacity does not change (FR-050). The first player is seat `(matchNo - 1) mod n` of the active seats in slot order, so match 1 starts with the host and each rematch starts one seat
further clockwise; the dealer is the seat before the first player and the starting card acts as if the dealer played it. Missed-turn counts and UNO! flags reset.

**Rationale**: The spec asks for a re-deal with no lobby step; `room:reset` returns to the lobby and disposes the match. Doing it in the engine needs no platform change.

**Alternatives**: `room:reset` then `room:start` from the client (rejected: a lobby flash, two requests, and the lobby would let guests in); a new `room:rematch` event (rejected:
not needed).

## R10. Chat

**Decision**: `quietChat: true` on the game definition, so the platform writes no automatic lines while a match runs, and the engine never calls `say` or `notice` (FR-046). The lobby
keeps the platform's join and leave lines because the platform shell renders it. In the match, `UnoChat` wraps the platform `ChatPanel` and keeps only `kind === 'player'` messages. On wide
screens (the existing `dockedChat` test: 700 by 540 or more) it is a right-hand column; otherwise a header icon opens a drawer with an unread count, exactly as Bingo's chat does
(FR-047). In an AI room the screen does not mount the chat at all and the layout plan reclaims its column (FR-048). Game events appear only as on-table notices (flashes and banners).

**Rationale**: It repeats Bingo's proven arrangement with a different owner of the layout.

**Alternatives**: A second chat component inside the game (rejected: Principle IV); hiding chat on phones (rejected: the spec wants a drawer).

## R11. Layout and fit

**Decision**: The match screen has a header (leave, room code, invite on online rooms, sound, chat icon on narrow screens), a table region and a hand band, measured with
`useRegionSize`. One **seat placement table** serves every orientation (opponents in clockwise seat order from the viewer): 1 opponent top centre; 2 top left and top right; 3 middle-left,
top centre, middle-right; 4 middle-left, top left, top right, middle-right (FR-025). The **centre area** is the rectangle left between the top band, the side columns and the hand band. The
two piles are arranged along its longer axis (side by side when it is wider than tall, stacked with the Draw Pile above the Discard Pile when it is taller than wide) at the largest card size
that fits, and the direction arrows run on a rounded "track" that wraps the pair, so on tall phones the piles fill the centre instead of leaving it
empty (FR-027). The **hand** is an arc: card height
from the available band, visible slice per card `min(0.75 × card width, (width − card width) / (n − 1))`, rotation fanned up to ±18 degrees and a small vertical arc; when the slice would
drop below 28 px the hand scrolls sideways inside its own band (FR-024). The UNO! button sits just above the hand at the right end on landscape and centred on portrait; Catch buttons are
anchored to the opponent seat (at least 44 px tall). Budgets for the sizes in the spec and the exact formulas are in
[contracts/match-screen-layout.md](contracts/match-screen-layout.md); at 320 by 568 with four opponents the centre area is 200 by 319 px (55% of the height for the piles and track), the stacked piles are 94 by 136 px
and a 7-card hand has a 42 px slice.

**Rationale**: A single placement table keeps seat order readable and matches the spec's rules for 1 to 4 opponents; measuring regions (as Ludo, Housie and Bingo do) satisfies
Principle II without media-query guesswork.

**Alternatives**: Separate desktop and phone placement tables (rejected: the spec's even-distribution rule and the portrait rule give the same arrangement for 1 to 4 opponents);
a fixed-size table scaled with CSS `transform` (rejected: blurry text, awkward hit targets).

## R12. Motion design

**Decision**: Durations (shared in `shared/src/uno/timing.ts` so the server's settle times match the screens): throw 450 ms (arc height `min(120 px, 0.35 × distance)`, a slight
rotation and a 1.08 scale at the peak), draw flight 400 ms plus 110 ms per extra card, invalid-card bounce 320 ms (snap back with an overshoot) with a 240 ms table shake of ±3 px, reverse flare
600 ms, aura colour change 350 ms, "UNO!", "Caught!", "Skipped!" and "Your turn" banners 900 ms. The animator consumes events from a queue in order: it plays an event's motion, then commits that
event's `table` and `you` as the shown state; a hidden tab or a backlog of more than 6 events skips to the newest state (as Ludo does). Other players' plays fly from their seat to the
Discard Pile as a card back that flips to the face on landing; their draws fly from the Draw Pile to their seat. **Reduced motion** (`prefers-reduced-motion`): throws and draws become a 150 ms
fade and short slide with no arc, no shake, the arrows stop turning and show a "Clockwise" or "Counter-clockwise" badge with a direction glyph, flares become a 300 ms outline flash, banners
stay (FR-036, SC-019).

**Layering**: card-flight ghosts live on `document.body` at a high z-index so a throw is never clipped by the table. Banners, notices ("You draw 8", "Your turn") and seat flashes were first drawn inside
the table and verification V7 found them half hidden behind the Draw Pile during a draw flight, so they render through `TopLayer.tsx` (a portal to `document.body` above the ghosts) instead of a z-index
change inside the table, which cannot rise above a body-level layer.

**Rationale**: Motion reflects accepted server events only, in the same order on every screen (FR-035); a queue plus settle times prevents overlap.

**Alternatives**: Animating optimistically on tap (rejected: an illegal card would fly and then fly back, so the bounce plays instead and the throw starts when the acknowledgement arrives, typically under 100 ms).

## R13. Seat tag colours and avatars

**Decision**: UNO's seat colour tags are orange, purple, teal, pink and lime (in slot order), so a player's name tag, ring and chat colour are never mistaken for one of the four card colours.
Avatars come from the platform's existing set; bots use the platform's robot avatar and a "Bot" marker.

**Rationale**: The active-colour aura and the card colours carry the game's meaning; player rings must not compete with them.

**Alternatives**: Reusing red, yellow, green and blue tags as Ludo does (rejected: confusing next to cards).

## R14. Development-only controls and verification approach

**Decision**: Four optional variables read only outside production (production logs one warning naming any that are set and ignores them, as Bingo does): `UNO_DEV_DECK=<scenario>` fixes the
deal and the draw order, `UNO_DEV_BOT_MS=<ms>` fixes the bot pause, `UNO_DEV_TURN_MS=<ms>` shortens the countdown, `UNO_DEV_FORGET=always|never` makes bots always or never forget UNO!.
Scenarios: `wild` (the first seat holds a Wild, a Wild Draw 4 and playable colours), `reverse` (the first seat holds a matching Reverse), `uno` (the first seat holds exactly two matching
cards), `stack` (the first two seats each hold a Draw 2 and a Wild Draw 4 that can be stacked; the third holds none), `short-pile` (a nearly empty Draw Pile to force a reshuffle) and
`endgame` (the first seat holds one playable card). No client message can select or influence any of them. Evidence comes from browser play at the sizes in the spec plus scripted Socket.IO
clients (kept outside the repository, as before) for catch races, stacking chains, forfeit, reconnect and the **privacy audit**: with a fixed deal, record every `game:event` payload each client
receives and assert that no id from another seat's hand appears in it before that card is played.

**Rationale**: Principle III asks for reproducible checkpoints and recorded evidence without heavy suites; fixed deals are the only way to reproduce Wild, Reverse and catch scenarios quickly.

**Alternatives**: Random play until a scenario occurs (rejected: slow and unrepeatable); unit-test suites (rejected: policy).

## R15. Departures, away handling and forfeit

**Decision**: `onSeatReleased` marks the seat left, shuffles the player's cards into the Draw Pile, passes the turn on if it was theirs, cancels a penalty aimed at them, closes a catch window
against them and, when only one active seat remains, finishes the match with that player as the winner (FR-051, FR-052). A human who is merely disconnected keeps their seat and their
countdown runs; the platform releases the seat after the 60-second reconnect window. In a solo room the only human leaving closes the room (existing `ai_owner_left`); a solo player removed for
three missed turns sees the platform's inactive screen, as in Ludo. Host handover is the platform's.

**Rationale**: It reuses Ludo's proven release flow and the platform's room rules.

**Alternatives**: Replacing a departed human with a bot (rejected: out of scope).

## R16. Render, restart and limits

**Decision**: No new service, storage or required environment variable; `render.yaml` is unchanged. A match is a few kilobytes in memory. The existing `MAX_ROOMS`, `MAX_SOCKETS` and keepalive
apply unchanged, and the create limiter (burst 5, then 1 per 6 s per IP) applies to UNO rooms. On a restart or deploy the existing flow applies: clients show "reconnecting", then "room ended"
(the match is gone); V13 verifies on Render.

**Rationale**: The module is stateless across restarts like every other game, which the constitution requires to be documented, not hidden.

**Alternatives**: Persisting matches (rejected: out of scope, no storage).

## R17. Accessibility and input

**Decision**: Every hand card is a `<button>` named by its face ("Red 7", "Blue Skip", "Wild Draw Four") with `aria-disabled` (not `disabled`, so tapping an illegal card still triggers the
bounce and the reason); the hand uses a roving tab stop with arrow keys and Enter or Space to play. The UNO! and Catch buttons, the Draw Pile and Keep are real buttons with visible focus. The
colour wheel is a modal radio group with a focus trap, Escape to cancel and the number keys 1 to 4 (red, yellow, green, blue). A polite live region announces turn changes, plays and
"UNO!" and "Caught!". Pointer: a click or tap plays; dragging a card by more than 12 px and releasing over the table plays it, releasing anywhere else cancels. Touch follows the spec: a press
lifts and enlarges the card; releasing on the same card plays it; sliding sideways along the hand previews neighbours and releasing over the hand band cancels; dragging up onto the table and releasing plays.
Text is at least 11 px, tap targets at least 44 px for Catch, UNO!, Keep and the pile.

**Rationale**: The spec's two touch sentences ("dragging it onto the table" and "sliding off cancels") are reconciled by "cancel when released in the hand band, play when released on the table".

**Alternatives**: Tap-to-select then tap-again-to-play (rejected: the spec says a tap plays).

## R18. Hub tile and copy

**Decision**: `UnoArt` is a fan of three cards (red 7, a Wild pinwheel, a yellow Skip) over a purple glow with a gold "UNO!" burst; theme accent `#ffcf3d` and accent 2 `#ff4d6d`; tagline "Match colours,
play action cards, shout UNO! and catch anyone who forgets." The launch modal copy stays neutral ("Practice against the bots, or invite your friends to a private room.") and the opponent picker reads
"Pick the computer players you want to play against."

**Rationale**: It follows the existing tile pattern (`GameCard` ART map) with art original to myArena (spec Assumptions).

**Alternatives**: Using a trademarked logo or card artwork (rejected: spec Assumptions).

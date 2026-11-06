# Quickstart: Verifying the UNO Module

A run-and-check guide for the plan, not a test suite (constitution Principle III). Each scenario records **scenario, expected result, observed result** in `verification.md` during
implementation, with screenshots under `specs/006-uno-game-module/evidence/` (`uno-<scenario>-<width>x<height>.jpg`). Data shapes are in [data-model.md](data-model.md), messages in
[contracts/uno-protocol.md](contracts/uno-protocol.md), screens in [contracts/match-screen-layout.md](contracts/match-screen-layout.md).

## Prerequisites

- Node.js 22 and a modern browser (Chromium family or Firefox); a second browser profile or private window for the second player; a phone or device emulation for touch checks.
- Build once and after any `shared/` change:

```powershell
npm install
npm run build
```

- Start the built app (serves the client from the same port) with a controlled deal and quick bots. Run it asynchronously; stop and restart it when changing a variable:

```powershell
$env:PORT='10000'; $env:UNO_DEV_DECK='wild'; $env:UNO_DEV_BOT_MS='400'; $env:LOG_LEVEL='warn'; node server/dist/index.js
```

Open http://localhost:10000. Scenario names for `UNO_DEV_DECK`: `wild`, `reverse`, `uno`, `stack`, `short-pile`, `endgame` (data-model section 9). Remove `UNO_DEV_BOT_MS` to check the real 1.5 to
2 second pause. `UNO_DEV_TURN_MS=3000` shortens the countdown (V10); `UNO_DEV_FORGET=always|never` fixes whether bots forget UNO! (V8). `RECONNECT_WINDOW_MS=5000` shortens the reconnect window.
Room creation is limited to 5 at once, then 1 per 6 seconds per IP, so space out scripted creations. Scripted Socket.IO clients are kept outside the repository (for example in `%TEMP%`).

## Scenarios

| # | Scenario | Covers |
|---|----------|--------|
| V1 | Solo start | US1; FR-001 to FR-003, FR-005; SC-001; spec checkpoint 1 |
| V2 | Online lobby, join and Start | US2; FR-004, FR-006 to FR-008, FR-010; SC-002; checkpoints 2, 3 |
| V3 | Fill empty slots with AI | US2, US7; FR-009, FR-043; SC-009; checkpoint 4 |
| V4 | Legal and illegal moves, draw and keep | US3; FR-013 to FR-016, FR-030 to FR-032; SC-003; checkpoints 8, 9 |
| V5 | Wild and the colour wheel | US4; FR-023, FR-033; SC-005; checkpoint 5 |
| V6 | Skip, Reverse and the arrows | US4; FR-017, FR-034; SC-006; checkpoint 6 |
| V7 | Stacking and penalties | US4; FR-015, FR-017, FR-022; SC-020; checkpoint 14 |
| V8 | UNO! and catching | US5, US7; FR-037 to FR-041, FR-044; SC-007, SC-008; checkpoint 7 |
| V9 | Layouts, sizes and reduced motion | US6; FR-024 to FR-029, FR-036; SC-010 to SC-012, SC-018, SC-019 |
| V10 | Countdown, departures, forfeit and reconnect | US9; FR-022, FR-051 to FR-053; SC-016; checkpoint 12 |
| V11 | Privacy audit | FR-021; SC-015 |
| V12 | Chat, end of match, Play again and regression of other games | US8, US9; FR-046 to FR-050, FR-054; SC-013, SC-014; checkpoints 11, 13 |
| V13 | Render | FR-055; spec checkpoint 15 |

### V1. Solo start

1. On the Hub click the UNO tile; confirm the modal shows "Play with AI" and "Play Online" and no room exists. Close it with Escape: nothing is created.
2. Reopen, choose "Play with AI", pick 3 opponents (3 is preselected), confirm.
3. **Expect**: a running table within a second or two with 4 players, 7 cards in your hand, a first card face up, no invite link or Copy control, no chat panel or icon, the table filling the space; the
   first turn begins after the deal animation. Repeat with 1 and 4 opponents; the seat placement matches the table in the layout contract.
4. Run `npm run smoke` (with the added UNO assertion): the create acknowledgement shows `state: in_progress` and no other hand.

### V2. Online lobby, join and Start

1. UNO, "Play Online", the capacity step shows 2 to 5 with 4 preselected; choose 5.
2. **Expect**: the lobby shows five slots (you in Slot 1), the room code, the invite link and Copy, "Waiting for players", Start disabled with a reason, and "Fill 4 empty slots with AI" for the host only.
3. Open the invite link in a second profile, join with a name. **Expect**: the host's lobby shows the guest in Slot 2 within 2 seconds and Start enables; the guest sees no host controls.
4. Lower the capacity below the seated count: refused with a message. Press Start: the match runs with only those two players and a third window now gets "match already started".

### V3. Fill empty slots with AI

1. Repeat V2 up to the lobby with capacity 5 and one guest; press "Fill 3 empty slots with AI", then Cancel: nothing changes. Press it again and Confirm.
2. **Expect**: three bots take Slots 3 to 5, the match starts for both windows at once, bots show a "thinking" cue and wait 1.5 to 2 seconds (without `UNO_DEV_BOT_MS`) before each action; measure ten
   bot turns with a stopwatch or event timestamps (SC-009: 1.2 to 2.3 seconds from turn start).
3. With only the host seated and capacity 2, "Fill 1 empty slot with AI" works and starts a 2-player match.

### V4. Legal and illegal moves, draw and keep

1. Play a matching card: **expect** an arc throw, the new top card and the active colour in both windows within 1 second.
2. Tap a non-matching card: **expect** the card bounces back, the table shakes slightly, a one-line reason appears and nothing changes in either window. Try playing during the other player's turn: refused.
3. Tap the Draw Pile: a card flies into the hand. If it is playable, only that card glows and Keep appears; keep it and the turn passes; on another turn play it instead.
4. Double-tap a card quickly: it is played at most once. With the hand holding a playable card, drawing is still allowed.

### V5. Wild and the colour wheel

1. With `UNO_DEV_DECK=wild`, play the Wild: **expect** the wheel opens within 0.2 seconds, dismissing it returns the card, choosing a colour throws the card.
2. **Expect** the aura changes to the chosen colour in both windows within 1 second, the colour name and glyph show, and the next player can only play that colour or a Wild. Play the Wild Draw 4 while
   holding the active colour: accepted.

### V6. Skip, Reverse and the arrows

1. With `reverse` and 3 or more players: play the Reverse. **Expect** the arrows flip within 0.5 seconds with a flare in every window and play passes the other way. In a 2-player match the arrows still flip
   and you take the next turn. Play a Skip: "Skipped!" shows over the next player.
2. Emulate reduced motion: the arrows stop and a "Clockwise" or "Counter-clockwise" badge changes at the same moment.

### V7. Stacking and penalties

1. With `stack` (host and seat 1 each hold a Draw 2 and a Wild Draw 4): play a Draw 2. **Expect** "+2" in every window; the next player's Draw 2 glows and nothing else does; stack it, the badge shows "+4" and the
   following player (who has none) sees the cards taken for them after about 1 second and loses the turn.
2. Repeat with the Wild Draw 4 chain. Try a Draw 2 on a pending Wild Draw 4: refused. Tap the Draw Pile with a stack available: the whole total is drawn.
3. With `UNO_DEV_TURN_MS=3000`, let the countdown end with a penalty pending: the server draws the total and it counts as a missed turn.
4. With `short-pile`, draw until the pile is empty: a reshuffle happens and play continues.

### V8. UNO! and catching

1. With `uno` and a second window: window A presses UNO! at 2 cards then plays: "UNO!" flashes, no catch. Repeat without pressing: **expect** "Catch A!" flashes in window B within 0.5 seconds for 5 seconds;
   B presses it and A draws exactly 2 cards within 1 second with a "Caught!" flash.
2. Press UNO! late inside the window: the catch button disappears for everyone and a later catch is refused with "too late". Let the window pass untouched: it closes at 5 seconds.
3. With a scripted client pair, send two `catchPlayer` messages together: one penalty only. Press UNO! with 3 cards: "Not yet" and no penalty.
4. Solo: with `UNO_DEV_FORGET=always`, a bot reaching one card is catchable and the catch gives it 2 cards; with `never` bots always call; with a human forgetting, a bot catches only after 2.0 to 3.5 seconds.

### V9. Layouts, sizes and reduced motion

1. For each size in the layout contract budget table (and 360 x 640, 800 x 600, 2560 x 1440) with 4 opponents, play a few turns in both orientations (rotate or resize live). **Expect**: no page scroll, no
   overlap or clipping, every opponent, both piles, the arrows, UNO! and the whole hand visible; centre piles at least 35% of the height; a 7-card slice of at least 40 px at 320 px; re-fit within 0.5 seconds.
2. Measure with the browser: centre area, pile size, hand card size and slice against the budget table; capture screenshots for the evidence folder.
3. Draw many cards (a scripted game or repeated Draw 2 chains) to reach 25 or more cards: the fan tightens and scrolls sideways inside its band only; the page never scrolls.
4. Emulate reduced motion and a 4x CPU slowdown: information stays available; frames stay under about 20 ms for 95% of frames in the performance panel during a 5-player match (SC-018).

### V10. Countdown, departures, forfeit and reconnect

1. With `UNO_DEV_TURN_MS=3000`: a human who does nothing sees a countdown, the server draws one card and passes; after the second miss a warning shows; after the third the seat is released and the player sees the platform's
   inactive screen (solo rooms end).
2. Close a window mid-match: others continue, the leaver's cards go back into the pile, the seat shows "Left" and is skipped. With two humans and no bots, the remaining player wins at once.
3. Reload a window within the reconnect window (set `RECONNECT_WINDOW_MS=5000` for the timeout case): **expect** the same table, your own hand, the turn and the direction within 2 seconds and no animation replay;
   past the window the seat is released and the invite link answers "match in progress" or "room not found".
4. Remove the host from a lobby with two guests and from a match: host handover follows the platform rules; "Play again" then belongs to the new host.

### V11. Privacy audit

1. With a fixed deal (`UNO_DEV_DECK`), connect three scripted Socket.IO clients to one room and record every `game:event` and ack payload each receives for a full match, including a reload of one client.
2. **Expect**: no payload for a client contains a card id from another seat's hand (before it is played), no payload exposes the Draw Pile order, `draw` events to others carry `count` and no `cards`, and
   `table.players[].handCount` matches the server's real counts. Record the script and its output (the script itself stays outside the repository).

### V12. Chat, end of match, Play again and regression

1. Online match: type messages in both windows; **expect** only typed messages in the chat, none for plays, UNO!, catches or wins, and bots send none. Narrow screen: the header icon opens the sheet, the unread count
   appears while closed and clears when opened; solo: no chat anywhere and no empty column.
2. With `endgame`: play the last card. **Expect** the celebration, standings (winner first, then fewest cards, "Left" last) in every window, "Play again" for the host only; pressing it deals a fresh match to both windows at
   once with no lobby step, the start one seat clockwise, and the room still closed to joiners. With one participant left, "Play again" is unavailable with a reason.
3. Regression: Ludo "Play with AI" (1 to 3 bots, preselect 3, lobby then Start) and "Play Online" (creates at once), Housie and Bingo lobbies and matches, and `npm run smoke` all behave as before.

### V13. Render

After deploying to Render (free plan), on the live URL repeat V1, V2, V5, V7 and V8 with two real devices, then use Render's Manual Deploy while a client is connected to observe "reconnecting" and "room ended". Record
results in `verification.md`; if Render is not available, record these as **pending**, never as passed by local checks.

## Recording evidence

`verification.md` lists for every scenario: the date, the scenario, the expected result, the observed result, and the screenshot or script output reference. Screenshots for V9 cover each size in the budget table
(portrait and landscape where the device supports both), the colour wheel, the Reverse flare, the catch button and the results overlay.

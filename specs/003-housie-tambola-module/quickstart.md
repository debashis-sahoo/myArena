# Quickstart & Validation Guide: Housie (Tambola) Visual-First Game Module

Per the user's policy and constitution Principle III there are **no new automated test suites**. Verification is direct, browser-based
play recorded in `verification.md` (scenario, expected, observed, screenshots or measurements). The existing `npm run smoke` is re-run
once after the platform changes as a regression check. Commands describe the target project and become runnable after implementation.

Linked design: [data-model.md](data-model.md), [contracts/](contracts/), [research.md](research.md).

## Setup

```powershell
npm install
npm run build
# development-only controls (ignored in production); set before npm start:
$env:HOUSIE_DEV_DECK = "first-ticket"     # optional: first draws complete the first player's first ticket (row by row)
$env:HOUSIE_DEV_BALLS = "42,7,19"         # optional: fixed start of the call order
$env:HOUSIE_DEV_TICKET_AUDIT = "500"      # optional: log a ticket-validity audit at start-up
$env:HOUSIE_CLAIM_PACE_MS = "300"         # optional: shorter claim pace for quick manual checks
$env:HOUSIE_MAX_PLAYERS = "200"           # optional: room player ceiling (default 200)
npm start                                  # http://localhost:10000
```

You need a desktop browser, a second window (private window for a separate guest), device emulation for phone and tablet in both
orientations, and a helper Node script that joins N scripted guests to a room (as used for Ludo; kept in a temp folder, not committed).
Clear the variables for normal play.

## Scenarios

### H1. Host setup (US1; SC-001)

1. Open Housie from the Hub and choose Play Online. Confirm the lobby shows the setup column and defaults: ceiling 1, "I also play" on, manual
   calling, six combinations ticked (Early Five, Top, Middle, Bottom Line, Four Corners, Full House 1st).
2. Time the path from room creation to Start with defaults (SC-001: under 10 s) and with changes to every setting (under 60 s).
3. Open the combination chooser: 40 pictures in five groups, group toggles, "n of 40" counter. Untick everything and press Start: refused with
   "Pick at least one combination". With nobody else seated Start is refused with its reason.
4. Join a second window. With players seated, try to set the limit below the seated count: refused; lower the ceiling below a player's choice:
   their choice is clamped and they see the notice.
5. Set the limit to 200 with the preset: the field accepts 200, refuses 201 (clamped), and `HOUSIE_MAX_PLAYERS=50` makes the maximum 50.

### H2. Tickets (US2; SC-002, SC-003)

1. With ceiling 4, change a player's ticket count between 1 and 4: the host sees each change within 1 s.
2. Start the match and inspect the tickets in the console or the DOM: each ticket has 3 rows of 9 cells, 5 numbers per row, 15 total, columns in
   range and ascending, no repeats. With `HOUSIE_DEV_TICKET_AUDIT=500` the server log reports 500 of 500 valid and unique.
3. Compare tickets across two players and a player's own tickets: all different.
4. With 3 and 4 tickets at 1280 x 720 and 390 x 844: every ticket reachable (stack, 2 x 2 or tabs) and every cell at least 32 px (measure in the browser).

### H3. Manual dabbing (US3; SC-004)

1. Draw a ball that is on your ticket: the cell stays unmarked. Tap it: ink cross with stamp animation. Tap again: removed.
2. Tap a number that has not been called: the cross appears, nothing is said. Reload the page and rejoin: marks are still there (restored from the server).
3. Keyboard: Tab to a ticket, arrows between cells, Enter and Space toggle. Empty cells do nothing.

### H4. Caller and ball console (US4; SC-005 to SC-007)

1. Manual: press DRAW NEXT BALL several times; each ball rolls in on every screen within 1 s, the mini-grid fills newest first with
   "Called n of 90", the host's master board lights the same numbers.
2. Auto at 5, 8 and 10 s: measure ten intervals each (within 0.5 s); pause, resume, change interval, back to manual. Close the host tab: draws
   continue during the reconnect window.
3. Scripted: a host client sends `draw` 90 times (spaced out): each number appears exactly once; the 91st draw is refused; calling ends and
   the match finishes.
4. Reduced motion (OS setting or emulation): the ball fades in; all numbers stay readable.

### H5. Claims (US5; SC-008, SC-009)

1. With `HOUSIE_DEV_DECK=first-ticket`, as player 1: after the first five draws (top row) cross those five numbers and press CLAIM on Top
   Line with Ticket #1: the tile becomes "Claimed by [you]" on every screen with the celebration, and the chat shows one line "[you] won Top Line".
2. Bogus variants: claim Middle Line now (not called): private "Bogus Claim" on that tile only, other screens unchanged, chat unchanged.
   Claim Top Line again: already claimed (private notice). Called but not crossed: draw the middle row, do not cross, claim: bogus. Crossed but
   not called: cross a number not called, claim a pattern needing it: bogus.
3. Two windows claim the same open combination within the same moment (scripted): exactly one `claimed`, the other receives "Already claimed".
4. Press CLAIM repeatedly: evaluated at most once per 2 s (with the default pace); the rest answer "Wait a moment". Make three bogus claims in a row
   (waiting out the pace): the third starts a 1-minute lock with a "Claims paused" countdown on that player's tiles only; claims are refused until
   it ends; a valid claim before the third bogus one resets the count.
5. Full House: claim 2nd before 1st is claimed: disabled. Complete a ticket: claim 1st; then 2nd is enabled; the same ticket cannot win 2nd.
6. Tiles: click a tile body: popover with the pattern illustration, closes on outside tap, Esc and the close control; the CLAIM button inside
   does not open it; the popover never reveals progress.
7. Timing edge: send a claim for a pattern whose last number is the very next ball, just before it is drawn: the claim is bogus (only numbers
   called before the server received the claim count).

### H6. Host plays (US8; spec FR-006)

1. With "I also play" on, the host screen has `Board | My Tickets`. In My Tickets the host crosses numbers and claims like a player; the claim
   obeys the same rules. With "I also play" off the host has no tickets and no CLAIM buttons.
2. Host handover: close the host tab beyond the reconnect window: another person becomes host and gets the caller controls; the old host's
   tickets stop playing; their won combinations stay claimed.
3. Lobby handover: with "I also play" off, the host leaves in the lobby: the new host has no ticket stepper, receives no tickets at start and
   only calls; with it on, the new host plays with their chosen count.

### H7. Chat (US6; SC-010, SC-011)

1. Draw balls, make claims, join and leave during the match: the chat shows only typed messages and the accepted-win lines. In the lobby, join and
   leave lines still appear and stop the moment the match starts.
2. Minimize the chat, send a message from another window: the unread pill appears within 1 s and counts typed messages only (an accepted-win line does
   not add to it); restore: it clears and the draft text is intact.
3. Reload: the minimized state persists.
4. Type `<b>hi</b>` and a 600-character message: shown as plain text and limited; send quickly to see the platform rate limit.

### H8. Layout and visuals (US7; SC-012 to SC-015)

1. Landscape desktop 1920 x 1080 and 1366 x 768: two columns, ball console one third and chat two thirds on the right, no page scroll.
2. Tablet 1024 x 768 and 768 x 1024; phones 390 x 844, 844 x 390, 360 x 640 and 320 x 568 in both orientations: portrait restacks (ball
   row, tickets, tiles, chat drawer), no page scroll, cell size at least 32 px (measure).
3. With 9, 18 and 40 combinations chosen: tile density tiers apply, all tiles fit at the stated tap size (or the tile grid scrolls internally on
   the smallest screen) and the playing area uses at least 90 percent of the viewport apart from header and gaps (measure the regions).
4. Compare against the mockups; check contrast, hover/pressed/focus states, and that nothing animates in a quiet moment except the ambient
   glow and the ball glow.

### H9. Results and new round (US8)

1. Claim every combination (scripted/dev deck) or call all 90: calling stops and everyone sees the results list (winner per combination, "No
   winner" where none).
2. Host presses New round: everyone returns to the lobby with all settings back at their defaults (player limit unchanged) and ticket choices at 1; Leave returns a person to the Hub.

### H10. Reconnect and resilience (FR-040, FR-041)

1. Refresh a player mid-match: tickets, marks, call history, current ball and tile states return at once without replaying earlier balls.
2. Close a player's tab beyond 60 s: their tickets stop playing and they cannot rejoin the match; the rest continue.
3. Restart the server: clients show the existing reconnect then "room ended" flow (documented behaviour).

### H11. Large room (FR-001, research R7)

1. With the scripted guest tool join 50, then 200 guests: the lobby stays responsive, `room:state` bursts are coalesced (about 4 per second),
   and the logged message size is proportional to people present (record sizes).
2. Start a match with 200 players and 2 tickets each; draw balls: each ball reaches every screen within 1 s (measure on three real clients).
   Memory of the server process stays well under 512 MB (record RSS).
3. A 201st join is refused with "room is full". `MAX_SOCKETS=60` makes the 61st connection answer SERVER_BUSY, while a guest who already holds a
   seat (a reconnect) can still resume. Record SC-016 (95% of balls within 1 s, server under 512 MB).

### H12. Platform regression (constitution workflow)

1. Run `npm run smoke`: unchanged result. Play one Ludo match (create, start, a few turns): unchanged behaviour, colours, and system chat lines.
2. Confirm production mode ignores every development variable (start with `NODE_ENV=production` and a dev variable set).

### H13. Render deployment (constitution Principle I)

Deploy to Render, repeat H1, H4 and H5 on the live URL with two devices, and record the results, or mark deployment verification as
pending if it has not been done (local checks are never presented as deployment verification).

# Verification Evidence: Bingo (75-Ball) Visual-First Game Module

Recorded while implementing `specs/005-bingo-75-ball-module/` (constitution Principle III: scenario, expected, observed; no new automated suites).
Method and environment:

- **Scripted server checks**: throwaway Node Socket.IO scripts kept outside the repo (`%TEMP%\bingo-verify\`), run against the real built server
  (`node server/dist/index.js`) with `BINGO_DEV_DECK=first-card`, `BINGO_CLAIM_PACE_MS=300`, `BINGO_DEV_CARD_AUDIT=500`, `RECONNECT_WINDOW_MS=3000`.
  Final combined run: **184 checks, 183 PASS, 1 message-text deviation** (see V1); separate runs: V9 15 of 15 PASS, V10 5 of 5 PASS.
- **Browser play**: the real client (built bundle served by the server on `http://localhost:10000`) driven with Playwright in the integrated browser, with
  scripted guests (`%TEMP%\bingo-guest\guest.mjs`) as the second and third players. Viewports were set with `setViewportSize`; sizes below are DOM measurements.
  The screenshot tool crops landscape-phone viewports to 390 px, so those two sizes have measurements only, not images.
- **Regression**: `npm run build` and `npm run smoke` pass ("All checks passed"); one Ludo match vs 3 bots started and showed its dice turn, activity and the
  usual "The match has started" chat line; a Housie lobby opened with its 40 patterns and its own player limit; V11 adds a two-client Housie match.
- **Phase 12 real-browser runs (2026-11-05)**: a throwaway Node Playwright script outside the repo (Microsoft Edge, one browser context per person at the exact
  viewport size) drove the real built client against `node server/dist/index.js` with `BINGO_DEV_DECK=first-card` and `BINGO_CLAIM_PACE_MS=300`. The images it
  saved are in `evidence/`; the per-size numbers in V2, V7 and V11 are DOM measurements from those runs.
- Date: 2026-11-04 and 2026-11-05. Everything outside V13 ran locally. V13 is a scripted run against the live Render service; **the two-device browser run and the
  reconnect-after-replacement check are still pending (T079 stays open)** and **no physical device was used (T078 pending)**.

## Summary

| Scenario | Spec / tasks | Result |
|----------|--------------|--------|
| V1 Host setup | US1; T023 | PASS, one platform message differs from the engine text |
| V2 Cards, FREE, daubs | US2, US3; T033, T039 | PASS |
| V3 Caller and ball console | US4; T050 | PASS |
| V4 Claims | US5; T057 | PASS |
| V5 End and new round | US8; T072 | PASS |
| V6 Pure chat | US6; T060 | PASS |
| V7 Layout and visuals | US7; T065, T066 | PASS with the limits listed under "Known limits" |
| V8 Reconnect and handover | FR-042, FR-043; T072 | PASS |
| V9 Large room (SC-015) | T073 | PASS |
| V10 Regression and production safety | T015, T074 | PASS |
| V11 Convergence checks | T080 to T090 | PASS (SC-001 is script timing only; see V11) |
| V12 Second convergence checks | T091 to T093 | PASS for T091 and T093; T092 (human stopwatch) pending |
| V13 Render deployment | T079 | scripted live checks PASS; two-device run and replacement reconnect pending |
| V14 FREE marked by default | T094 to T104 (change request of 2026-11-05) | PASS locally; not yet deployed to Render |
| V15 27 patterns | T105 to T114 (change request of 2026-11-05) | PASS locally; not yet deployed to Render |

## V1. Host setup (US1; SC-001)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Hub card | Bingo shows as playable; launch modal offers Play Online only | "Active" badge; "Play Bingo" modal with Play Online | PASS |
| Lobby defaults | ceiling 1, host plays, Single Line + Four Corners + Blackout, manual, capacity 10 | exactly that, "3 of 9" at the time ("3 of 27" since the catalogue grew, V15) | PASS |
| `setCeiling` 3 / 4 / 0 / 2.5 | 3 ok; 4 refused "Choose 1 to 3 cards."; 0 and 2.5 rejected by schema | as expected; ceiling stayed 3 after refusals | PASS |
| `setPatterns` unknown, duplicate, `[]` | unknown and duplicate refused; `[]` allowed | as expected; Start then refused "Pick at least one pattern." | PASS |
| Start with nobody else | refused | `NOT_ENOUGH_PLAYERS`: "At least 2 players are needed to start." (the platform check runs before the engine's "Wait for at least one more person.") | PASS (message text differs; docs updated) |
| Second guest joins, `setCards` 2/3/1/2 | host sees each change < 1 s | 0.25 to 0.6 ms | PASS |
| `setCards` 4 or 0; above current ceiling | refused | `INVALID_PAYLOAD`; "Choose 1 to 2 cards." | PASS |
| Lower ceiling to 1 | guest choice 3 clamped to 1 | `choices[guest] = 1` | PASS |
| Host plays off | host cannot set cards; choice removed | "You are only calling this match." | PASS |
| Non-host lobby intents and Start | refused | "Only the host can do that." x4, `NOT_HOST` x2 | PASS |
| Capacity below seated; 1; 200; 201 | refused; out of range; ok; refused | `CAPACITY_BELOW_PLAYERS`; `CAPACITY_OUT_OF_RANGE`; ok; `CAPACITY_OUT_OF_RANGE` | PASS |
| `BINGO_MAX_PLAYERS=50` | Bingo max 50; Housie unaffected | 50 ok / 51 refused; Housie stays 200 (and `HOUSIE_MAX_PLAYERS=60` caps only Housie) | PASS |
| Card audit log | 500 of 500 valid and unique | "bingo card audit: 500 of 500 valid and unique" | PASS |
| Browser lobby | setup column, the pattern pictures in groups, group "All" toggles, "n of N", read-only summary for non-hosts, people list with card counts | seen with nine patterns in two groups; re-checked with 27 in four groups in V15; join lines appear in the lobby chat | PASS |
| SC-001 timing | under 10 s with defaults, under 60 s changing everything | script timing in V11: 0.50 s with defaults, 0.44 s changing every setting (a lower bound, no human reading time); 3 clicks with defaults, 10 changing everything | PASS (script); human timing stays with T078 |

## V2. Cards, FREE space and daubing (US2, US3; SC-002 to SC-004)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Snapshots | one private `snapshot` each; own cards only; counts match choices | 3, 2, 1 cards for host/Ann/Ben; no leaks (0 violations over all payloads, acks and resume views) | PASS |
| Card rules | B 1-15, I 16-30, N 31-45 (four + FREE at index 12 = 0), G 46-60, O 61-75, no repeats | 6 of 6 valid; 2000 cards generated in the engine check (all valid, all unique); 600 cards at 200 players x 3: 0 invalid, 600 distinct | PASS |
| Non-playing host | no cards, empty `you` | `{playing:false, cards:[], daubs:[]}` (the `freeTapped` field was removed on 2026-11-05, V14) | PASS |
| FREE is never a daub | a `daubs` change naming cell 12 is accepted and ignored; the mask never holds bit 12 | mask stays 0 after the change and after a reload (V14; the first design stored FREE and a `freeTapped` flag) | PASS |
| Foreign card, bad indexes | dropped / `INVALID_PAYLOAD` for cell 25, -1, card 3, empty, 31 changes, extra field, non-boolean | as expected; masks unchanged | PASS |
| Ball calls never daub | masks identical before and after 8 balls | identical | PASS |
| Uncalled number daubable | accepted silently | bit set while called = [] | PASS |
| Browser: new card | FREE is already stamped, nothing over it | stamped, marked, disabled, no callout on every card in view at 390 x 844 (touch) and 1366 x 768 (V14) | PASS |
| Browser: FREE tap | tapping, Enter and Space change nothing | nothing changed; a neighbouring number still toggles on and off | PASS |
| Browser: ball on my card | cell stays unmarked | unmarked until tapped; neon translucent dauber in the letter color, number readable | PASS |
| Keyboard | Space/Enter toggle number cells, arrows move, FREE ignores them | Space on, Enter off; ArrowRight moved from "B 15" to "I 25"; Enter and Space on FREE changed nothing (V14) | PASS |
| Reduced motion | no looping animation | 0 running animations (3 in normal mode: ambient background, BINGO! glow, ball breath; V14) | PASS |

Card fit with 2 and 3 cards (real app, measured cell width x height; re-measured after the tabs preference and the header chat button):

| Viewport | 2 cards | 3 cards |
|----------|---------|---------|
| 320 x 568 | 51 x 34 (tabs) | 51 x 34 (tabs) |
| 390 x 844 | 69 x 69 (tabs) | 69 x 69 (tabs) |
| 667 x 375 (short landscape) | 60 x 40 (tabs) | 60 x 40 (tabs) |
| 844 x 390 (short landscape) | 41 x 41 (row) | 64 x 43 (tabs) |
| 768 x 1024 | 145 x 108 (tabs) | 145 x 108 (tabs) |
| 1024 x 768 | 105 x 77 (tabs) | 105 x 77 (tabs) |
| 1366 x 768 | 64 x 64 (row) | 115 x 77 (tabs) |
| 1920 x 1080 | 96 x 96 (row) | 193 x 129 (tabs) |
| 2560 x 1440 | 133 x 133 (row) | 283 x 189 (tabs) |

Every width is at least 40 px (FR-035). Tabs now also win when their cell is at least 1.5 times taller than the best stack or row cell: before this change 3 cards
at 768 x 1024 gave 42 x 28 and at 1366 x 768 gave 73 x 49, which tabs beat easily. Tab labels were shortened ("Card 1" for unselected tabs) after three tabs clipped at 320 px.

## V3. Caller and ball console (US4; SC-005 to SC-007)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Non-host draw/auto/manual/pause/resume | refused | "Only the host can do that." x10; no ball drawn | PASS |
| Client cannot choose a ball | extra field rejected | `INVALID_PAYLOAD` | PASS |
| 75 draws | each of 1-75 once, same order on all clients, `seq` contiguous, letters match the ranges | distinct = 75; 3 identical sequences; no gaps; 0 letter mismatches | PASS |
| 76th draw | refused | "All balls have been called."; match finishes on the 75th with `finished` | PASS |
| Delivery latency | every ball < 1 s | 75 balls x 3 clients: max 1.25 ms, p95 1.19 ms | PASS |
| Auto 5 s / 8 s / 10 s (6 intervals each) | within 0.5 s of the interval | max deviation +15 ms, +11 ms, +15 ms | PASS |
| Pause, resume, manual, interval change | work; change reschedules | pass; 5009 ms after a change | PASS |
| Browser ball | letter above number, tinted by letter; history chips newest first; "Called n of 75" | "B 15" blue sphere, "Recent: G-52 N-34 I-22 B-15"; count correct | PASS |
| View all | opens the full board with called numbers lit; Esc closes | "Called 2 of 75", B 10 called, I 16 current; closed on Escape | PASS |
| Host master board | five letter columns of 15, lit in real time, current ball highlighted | seen at all sizes; fonts 12 to 28 px | PASS |
| Reduced motion | ball fades in | one 150 ms animation on the ball | PASS |

## V4. Claims (US5; SC-008, SC-009)

Scripted (47 checks) and in the browser:

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Valid claim | Single Line flips to Claimed with the winner's name on every screen; others stay Available | browser: "Claimed - Jolly Tiger" on the host and on a scripted guest; chat unchanged | PASS |
| Bogus (incomplete; called but not daubed; daubed but not called; centre pattern without FREE) | private `bogus` to the claimant only | only the claimant's counter moved; browser shows the "Bogus Bingo" alert on the button | PASS |
| Too late | only claimed patterns complete: private notice, no penalty, streak unchanged | browser "Too late - already claimed"; streak unchanged in the script | PASS |
| Multi-pattern | one claim awards every open pattern the card completes | browser: a full card claimed Single Line, Four Corners and Blackout in one press; the match then ended | PASS |
| Race (3 runs) | exactly one `claimed` includes the pattern; the loser gets `tooLate` | one `claimed` per run on all clients; the loser's `tooLate` counter 1 | PASS |
| Pace | second claim inside the pace refused | "Wait a moment." | PASS |
| Lock | third bogus in a row locks for 60 s; private `claimsPaused`; refused while locked; countdown decreases; restored on re-join; lifts by itself | untilMs 60000, 58388 after 1.5 s; `claimsLockedMs` on re-join; claims evaluated again after 60.5 s; only the claimant saw it | PASS |
| Valid claim resets the streak | no lock after 2 more bogus | no lock | PASS |
| Wrong card index (not owned) | error, not counted as bogus | "You do not have that card."; counters unchanged | PASS |
| Several cards | only the selected card is checked; the button names it | scripted: a pattern completed on one card and claimed with another is bogus, with the right card accepted; browser: "BINGO! - Card 2" with nothing daubed on card 2 gave "Bogus Bingo"; "BINGO!" with one card | PASS |
| No deadline; timing edge | claim after more balls accepted; a claim sent before the completing ball is bogus | pass | PASS |
| Non-playing host | no BINGO! button and no cards | browser: none; board, caller console and patterns only | PASS |
| Lobby intents during a match | "Not available during the match." | pass | PASS |

## V5. End and new round (US8; FR-030)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| All patterns claimed | calling stops; results list each pattern and winner | browser "Match over - Called 24 of 75 - Single Line / Four Corners / Blackout: Jolly Tiger"; Leave and New round (host) | PASS |
| 75 balls with an unclaimed pattern | results show no winner | `finished` with three results and no winner | PASS |
| Last card holder leaves (host only calling) | match ends at once | `playerLeft` then `finished` in 1 ms | PASS |
| New round | defaults restored: ceiling 1, default patterns, manual, host plays on, card counts 1; capacity kept | browser lobby: 1, "3 of 9" ("3 of 27" now), Manual, "I also play" on, players 10; non-host `room:reset` refused | PASS |

## V6. Pure chat (US6; SC-010)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| During a match: balls, bogus and valid claims, refused late join, leave, disconnect and seat release | no system line on any client | 0 system messages on 4 clients; claim outcomes never reached chat | PASS |
| Start itself | no "match started" line | none | PASS |
| Lobby before Start | usual join/leave lines | joined x4, left x1, capacity changed x1; browser lobby chat shows "joined" lines | PASS |
| History on re-join | no system line from after Start | 0 of 11 messages | PASS |
| Browser landscape | typed messages only | "No messages yet. Say hello!" after balls and claims | PASS |
| Browser narrow drawer | unread pill with count; opens with only typed text | pill "1"; drawer shows only Ben's message | PASS |

Markup and over-long text use the platform's plain-text rendering and limits (unchanged platform code); the browser runs of both are in V11.

## V7. Layout and visuals (US7; SC-011, SC-012)

No page scroll (`scrollWidth`/`scrollHeight` equal to the viewport) and no card cell outside the viewport at all of: 320x568, 390x844, 667x375, 844x390, 768x1024,
1024x768, 1366x768, 1920x1080, 2560x1440, for the player (2 and 3 cards), the host viewing the board, and the host viewing My Cards.

| Check | Observed |
|-------|----------|
| Layout classes | narrow at 320, 390 and 768 wide portrait; short landscape at 667x375 and 844x390; wide from 1024x768 up |
| BINGO! button | 44 px high and fully inside the viewport at every size |
| Pattern tiles | "Available" and names no longer clip at 390 and 320 (two tiles per row); only the tile grid scrolls when nine patterns are chosen on a phone |
| Host board | five letter columns; numbers at least 12 px (14 px at 320 and 667) |
| Contrast | 106 text elements sampled, 102 at or above 4.5:1 (3:1 large); the 4 flagged ("DRAW NEXT BALL", "Off", the lit board cell) sit on gold gradients that the sampler could not read; their text is dark brown on gold |
| Focus | keyboard focus shows a 3 px light-gold outline |
| Quiet moment | only `bz-ambient` (background) and `bz-ball-breathe` (ball glow) run |
| Reduced motion | 0 running animations; ball 150 ms fade |
| Chat | docked when wide; on narrow and short landscape a 40 px chat button in the header opens a sheet under the header (V11) |
| Screenshots | `evidence/` holds lobby (host and player), player, host board and host My Cards images at all nine sizes, taken at the exact viewport size (see V11) |

Defects found and fixed during this pass: square cells left half the width unused (21 px cells at 844x390, 2 px at 667x375, 31 px at 320x568); pattern tiles
clipped their badge and names on phones; three card tabs clipped at 320 px; a playing host's cards were 14 px high at 320x568. Fixes: rectangular cells, a short
landscape layout, wider tiles, shorter tab labels, a shorter caller console while the host views cards.

Found and fixed in the convergence pass (V11): the bottom chat bar kept a permanent 44 px strip, so on phones the panels covered only 81.7 to 90.6 percent of the
viewport below the header; the toggle moved into the header. The lobby overflowed its panel by about 20 px at 320 px wide (the setup rows had a 290 px minimum
column and the people chip ran past the edge); the rows now shrink with the panel and the chip drops the word "people" under 380 px.

## V8. Reconnect and host handover (FR-042, FR-043)

| Scenario | Observed | Result |
|----------|----------|--------|
| Re-join inside the window (same guest) | resumed the seat with cards, daubs and called numbers; a running lock still in force (58.7 s left) | PASS |
| Host disconnects and returns | resumed, still host | PASS |
| Draw while the host is disconnected inside the window | auto draw 5014 ms later; host unchanged | PASS |
| Away longer than the window | seat released, `playerLeft` seen by others, cannot rejoin | PASS |
| Host seat released | handover to another seat, exactly one host; auto calling continued (5009 ms) | PASS |
| Browser reload mid-match | rejoined to the same cards, daubs state, history and tile states | PASS |

## V9. Large room (SC-015)

| Check | Observed | Result |
|-------|----------|--------|
| Fill to 200 players, 3 cards each | 200 seated in 0.6 s; 600 cards, 0 invalid, 600 distinct | PASS |
| Snapshots | all 200 received 19 ms after Start; sampled clients saw no other player's card | PASS |
| 20 balls to 200 clients | 4000 samples, none missing, same order; p95 5.9 ms, max 6.5 ms (sender and receivers share one machine) | PASS |
| `room:state` coalescing | 4, 4, 4, 4, 3, 1 messages per second under about 100 changes per second; 0 during the draws | PASS |
| Payloads | ball event 40 bytes; three-card snapshot 637 bytes; `room:state` at 200 seats 37.7 KB | PASS |
| Memory | 85.8 MB at start, 113.2 MB after 20 draws (limit 512 MB) | PASS |
| Ceilings | default 200 / 201 refused; `BINGO_MAX_PLAYERS=50` caps Bingo only; `HOUSIE_MAX_PLAYERS=60` caps Housie only | PASS |

## V10. Regression and production safety

| Check | Observed | Result |
|-------|----------|--------|
| `npm run build` | shared, server and client build; no warnings | PASS |
| `npm run smoke` | "All checks passed" (the unavailable-game assertion now uses `snakes-and-ladders`) | PASS |
| Ludo | AI room created, match started, dice turn shown, chat has the usual "The match has started" line | PASS |
| Housie | lobby opens with its 40 patterns, "6 of 40" defaults; its player limit still comes from `HOUSIE_MAX_PLAYERS`; a two-client match (draws, cross, claim, resize, reload) also passes (V11) | PASS |
| `NODE_ENV=production` with dev variables set | startup warning naming `BINGO_DEV_DECK`, `BINGO_DEV_BALLS`, `BINGO_DEV_CARD_AUDIT`, `BINGO_CLAIM_PACE_MS`; first balls random, claim pace still 2000 ms | PASS |
| Search for `ctx.notice` in `server/src/games/bingo/` | no match | PASS |

## V11. Convergence checks (T080 to T090)

Real built client and server, one Edge browser context per person, exact viewport sizes (method above). Server: `BINGO_DEV_DECK=first-card`, `BINGO_CLAIM_PACE_MS=300`.

| Task | Check | Observed | Result |
|------|-------|----------|--------|
| T080 | Unrequested dev harness | `client/bz-harness.html` and `client/src/bz-harness.tsx` removed (they were a mock-data page for layout checks, never in the build); the client bundle hash did not change | PASS |
| T081 | Tabs preferred when much taller | `planCards` takes tabs when their cell is at least 1.5 times taller; 3 cards at 768 x 1024 became 120 x 108 (was 42 x 28), at 1366 x 768 115 x 77 (was 73 x 49), at 1920 x 1080 120 x 120 (was 60 x 60); all widths at least 40 (V2 holds the current values after T091) | PASS |
| T082 | SC-011 coverage, table below | 94.5 to 97.6 percent at all nine sizes after the change (81.7 to 92.9 percent on phones before it); no page scroll and every cell inside the viewport at the nine sizes for player (2 cards), host board and host My Cards | PASS |
| T083 | Housie match after the shared changes | two clients: match started, 4 balls drawn, a tap crossed a cell, an incomplete claim answered "BOGUS CLAIM", ticket cells 71 px at 1280 x 720, no page scroll after resizing to 800 x 600 and 390 x 844, the cross survived a reload, no page errors; Ludo vs 3 bots started and the roll button worked | PASS |
| T084 | Playing host's cards on small screens | My Cards cells 42 x 28 at 320 x 568 (was 40 x 23), 48 x 32 at 667 x 375 (was 40 x 25), 41 x 41 at 844 x 390; the freed strip came from the chat button moving into the header | PASS |
| T085 | Claims paused | three bogus claims by the host: button "Claims paused 1:00" and disabled; "0:57" after 3 s; the other player's button stayed "BINGO!" and their own bogus claim was still evaluated; button back to "BINGO!" and enabled after the lock (56 s after the last check, about 60 s in all); image `evidence/lock-claims-paused.jpg` | PASS |
| T086 | Chat plain text and limits (wide dock and narrow sheet) | `<b>hi</b>` arrived as the text `<b>hi</b>` (escaped in the DOM); typing 600 characters stops at 500 (counter "500/500"); a 600-character fill is cut to 500 by the field and arrives as 500; ten rapid sends: 5 delivered, then "You are sending messages too quickly. Try again in 1s." | PASS |
| T087 | Hover and pressed states | computed style changed on hover and on press for: unselected lobby pattern tile, segmented buttons (lobby and caller), DRAW NEXT BALL, Board / My Cards tab, BINGO!, card cell, unselected card tab, View all, Quit. A selected control (pattern tile, segment or tab) keeps its selected look on hover by design | PASS |
| T088 | Reload restores daubs and tooltip (superseded on 2026-11-05: FREE has no tooltip or state any more, see V14) | daubed cells 0, 1, 6 and FREE on card 1: tooltip gone on card 1 only; FREE lifted: tooltip stays gone; after a reload cells 0, 1, 6 still daubed, FREE still lifted, card 1 has no tooltip and card 2 (never tapped) still shows it | PASS at the time |
| T089 | Host setup time | script clock (a lower bound, no human reading time): 0.50 s from the hub click to the match screen with defaults (create 0.36 s, Start 0.14 s; the guest's join, 0.41 s, is not host time); 0.44 s changing the player limit (typed and a preset), max cards, my cards, calling and two patterns. Clicks: 3 with defaults, 10 changing every setting. A person with a stopwatch is part of the T078 sign-off | PASS (script) |
| T090 | Screenshots | `evidence/`: lobby (host and player), player, host board and host My Cards at 320x568, 390x844, 667x375, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080 and 2560x1440, plus the claims-paused, reload, chat and open-chat-sheet images | PASS |
| Extra | Header chat button (replaces the bottom bar) | 40 x 40 and inside the header; closed button names the unread count ("Open chat, 2 unread") and shows a pill of 2; opening shows the two messages and clears the pill; Escape closes; half-typed text survives closing; the open sheet sits below the header inside the viewport | PASS |

SC-011 coverage (panel area divided by the viewport area below the header; panels are the cards or board, the pattern dashboard, the ball or caller console and, when wide, the docked chat; the rest is gaps and padding):

| Viewport | Layout | After | Before | Cells (player 2 cards / host My Cards) |
|----------|--------|-------|--------|----------------------------------------|
| 320 x 568 | narrow | 94.5 | 86.3 | 51 x 34 / 42 x 28 |
| 390 x 844 | narrow | 96.0 | 90.6 | 69 x 69 / 69 x 60 |
| 667 x 375 | short | 94.7 | 81.7 | 60 x 40 / 48 x 32 |
| 844 x 390 | short | 95.4 | 82.7 | 41 x 41 / 41 x 41 |
| 768 x 1024 | narrow | 97.3 | 92.9 | 145 x 108 / 145 x 100 |
| 1024 x 768 | wide | 95.0 | 95.0 | 105 x 77 / 103 x 69 |
| 1366 x 768 | wide | 95.5 | 95.5 | 64 x 64 / 64 x 64 |
| 1920 x 1080 | wide | 96.8 | 96.8 | 96 x 96 / 96 x 96 |
| 2560 x 1440 | wide | 97.6 | 97.6 | 133 x 133 / 133 x 133 |

Reading of SC-011: the docked chat counts as part of the playing area on wide screens because the specified layout gives it two thirds of the right column. Counting
only the cards, ball console and pattern tiles, wide screens are at 68 to 70 percent by design. Card cells and the ball no longer have a fixed upper size (V12), so a
single card fills 96 to 100 percent of its panel at 1920 x 1080 and 2560 x 1440.

## V12. Second convergence checks (T091 to T093)

Same method as V11 (real built client and server, one Edge context per person, exact viewport sizes).

| Task | Check | Observed | Result |
|------|-------|----------|--------|
| T091 | Cards and ball scale with the region (Constitution II, FR-036) | The fixed caps are gone: card cells (was 120 px), the ball (was 220 px) and the history chips (was 34 px high) now grow with their region, cells still within 1.5 : 1. Tables below; no page scroll, every cell inside the viewport and every width at least 40 at all sizes and card counts; one-card images (player, host board, host My Cards) for all nine sizes added under `evidence/` (`*-1card.jpg`) | PASS |
| T092 | Person-timed SC-001 | needs a person with a stopwatch; see the procedure under "Known limits and pending items" | pending |
| T093 | Header chat button states | at 390 x 844 and 667 x 375: hover changes the brightness, pressing changes brightness and position, keyboard focus shows a 3 px light-gold outline (`:focus-visible`), the button is 40 x 40; nothing needed fixing | PASS |

Player view, cell width x height and the cards' share of the cards panel (cards' bounding box divided by the panel's inner area), before and after T091:

| Viewport | Cards | Before | After |
|----------|-------|--------|-------|
| 1366 x 768 | 1 | 120 x 83 (stack), 83% | 124 x 83 (stack), 86% |
| 1366 x 768 | 2 | 64 x 64 (row), 78% | unchanged |
| 1366 x 768 | 3 | 115 x 77 (tabs), 74% | unchanged |
| 1920 x 1080 | 1 | 120 x 120 (stack), 52% | 202 x 135 (stack), 96% |
| 1920 x 1080 | 2 | 96 x 96 (row), 72% | unchanged |
| 1920 x 1080 | 3 | 120 x 120 (tabs), 52% | 193 x 129 (tabs), 88% |
| 2560 x 1440 | 1 | 120 x 120 (stack), 27% | 283 x 195 (stack), 100% |
| 2560 x 1440 | 2 | 120 x 120 (row), 57% | 133 x 133 (row), 69% |
| 2560 x 1440 | 3 | 84 x 84 (row), 44% | 283 x 189 (tabs), 97% |

Ball console (the same console serves the player and the host): ball 125 px in 564 x 234 at 1366 x 768 (unchanged: the height limits it); 222 px in 796 x 338 (18% of
the console) became 230 px (20%) at 1920 x 1080; 222 px in 1065 x 458 (10%) became 344 px (24%) at 2560 x 1440, with history chips 66 x 41 instead of 54 x 34. A
playing host's My Cards view at 2560 x 1440 shows 280 x 187 cells for one card (99%) and at 1920 x 1080 190 x 127 (91%).

Smaller sizes: only widths that were held at 120 px grow (768 x 1024: 145 x 108 for 2 and 3 cards, 145 x 115 for 1 card, host My Cards 145 x 100). Everything else is
identical to the V2 table: 320 x 568 51 x 34, 390 x 844 69 x 69, 667 x 375 60 x 40, 844 x 390 41 x 41 and 64 x 43, 1024 x 768 105 x 77; one card gives 55 x 40, 69 x 69,
63 x 47, 73 x 49 and 105 x 83 at those five sizes. Panel coverage (V11) did not change.

## V13. Render deployment (T079), scripted part

Service `https://myarena-arp6.onrender.com` (Free plan, created from `render.yaml`), running commit `1b22692`. Checked on 2026-11-05 from a developer machine over HTTPS
and WSS by a Node script (outside the repo) that acted as three players, without any spoofed headers.

| Check | Observed | Result |
|-------|----------|--------|
| Startup and readiness | `GET /healthz` answered 200 `{"status":"ok","uptimeSec":35,...}` on the first request | PASS |
| Same client as the local build | the index page served `/assets/index-C8wV0H47.js` and `/assets/index-aMdPv4oX.css`, identical to the local `client/dist` | PASS |
| HTTPS and policy headers | `Strict-Transport-Security: max-age=31536000; includeSubDomains`; CSP with `connect-src 'self' wss:` | PASS |
| WebSocket connectivity | three clients connected over `wss` on the `websocket` transport (about 1.1 s each from here, including TLS) | PASS |
| V1 setup (scripted part) | room created, two guests joined by its code, max cards 2, a guest chose 2 cards, Start; each client received only its own cards (1, 2 and 1) | PASS |
| V3 balls | 6 draws: random order (50, 26, 17, 34, 38, 66, so `BINGO_DEV_DECK` is not applied in production), the same order on all three clients, every ball at every client within 287 ms of the draw request | PASS |
| V4 claims | an incomplete claim was judged bogus and only its owner saw it; a second claim 0.3 s later was refused ("Wait a moment.": the 2 s pace, so `BINGO_CLAIM_PACE_MS` is not applied); after 48 balls a correct Single Line claim was awarded and all three clients saw it | PASS |
| V6 chat | 0 system lines after Start on all three clients; a typed message containing `<b>x</b>` arrived unchanged | PASS |
| V8 reconnect | a reload (same guest id) returned to the same seat with the same daubs and called numbers; a socket closed without leaving showed as "disconnected" with the seat kept, and the guest resumed the same seat with the balls so far | PASS |
| Cleanup | after everyone left, the service's room count dropped back to the one room that was not part of this run | PASS |

Still pending for T079: the two-device browser run of V1, V3 and V4 on the live URL, and reconnect after a service replacement (a redeploy while a client is connected).

## V14. FREE marked by default (change request of 2026-11-05)

Playtest feedback on the live site: the "Tap to claim your FREE space!" callout looked like a button but passed taps through to the numbers under it (a tap on its left
part daubed "I 22" instead of FREE, measured at 390 x 844 and 1366 x 768). The owner chose to mark FREE by default. Code: `shared/src/bingo/evaluate.ts` (FREE always
satisfied), `types.ts` (no `freeTapped`), server `engine.ts`, `matchOps.ts`, `model.ts`, `claims.ts` (comments), client `bingoStore.ts`, `CardGrid.tsx`, `CardArea.tsx`,
`BingoScreen.tsx`, `bingo.css` (callout removed). Specs reworded: `spec.md` (Clarifications, US3, FR-012 to FR-015, FR-024, SC-004, SC-009, SC-013, assumptions,
appendices), `plan.md`, `research.md` R4, `data-model.md`, `contracts/bingo-protocol.md`, `contracts/match-screen-layout.md`, `quickstart.md`, `README.md`.

Local run of the rebuilt app, same method as V11; `BINGO_DEV_DECK=first-card`, `BINGO_CLAIM_PACE_MS=300`.

| Check | Observed | Result |
|-------|----------|--------|
| Snapshot shape | `you` holds `playing`, `cards`, `daubs` only (no `freeTapped`); the mask starts at 0 | PASS |
| A `daubs` change naming FREE | accepted without error, ignored; the mask is still 0 after a reload; the join ack has no `freeTapped` | PASS |
| 23 of the host card's 24 numbers called, all daubed, FREE never touched | a claim of Letter X and Blackout is judged bogus (private) | PASS |
| 24 of 24 called and daubed, FREE never touched | one claim awards Letter X and Blackout together; the other player sees it; the match finishes | PASS |
| Browser, 390 x 844 touch and 1366 x 768 mouse | FREE is stamped from the start on every visible card, `aria-pressed` true, `aria-disabled` true, default cursor, no callout element | PASS |
| Tap, click, Enter and Space on FREE | nothing changes (still marked, no other cell marked); a neighbouring number toggles on and off by tap or click | PASS |
| Reload | FREE is marked on every visible card and nothing else is | PASS |
| Running animations | 3 in normal mode (ambient background, BINGO! glow, ball breath; 4 before, with the callout pulse) and 0 with reduced motion | PASS |
| `npm run build` and `npm run smoke` | pass ("All checks passed") | PASS |
| Re-run after the change | quickstart-style checks from V10 to V12 that touch the match screen: no page scroll and every cell inside the viewport at the nine sizes, chat (plain text, 500 characters, rate limit), unread pill, claims paused and its end, all PASS | PASS |
| Evidence images | all `*-player`, `*-host-*`, `*-1card`, `chat-*` and `lock-claims-paused` images were retaken so none shows the old callout; `reload-restored.jpg` (about the old tooltip state) was removed | done |

The Render service still runs the previous build (the callout version) until this change is pushed and deployed; V13 describes that build.

## V15. 27 patterns (change request of 2026-11-05)

The catalogue grew from nine to 27 patterns (Letters T, H, Z, N, C, U, I, Y; Shapes Plus Sign, Picture Frame, Heart, Pyramid, Checkers, Railroad Tracks, Sandwich, Four
Stamps, Dice Five; Multi-line Two Lines) as a data change in `shared/src/bingo/patterns.ts`; the original "Custom/Thematic" group became "Shapes". No evaluator, server or
protocol code changed. Specs reworded: `spec.md` (Clarifications, User Story 1, FR-009, edge cases, assumptions, Appendix A), `plan.md` (decision 8), `research.md` R3 and R9,
`data-model.md`, `contracts/bingo-protocol.md`, `contracts/match-screen-layout.md`, `quickstart.md` (V1 step 3, V4 step 10), `README.md`.

Local run of the rebuilt app (`BINGO_DEV_DECK=first-card`, `BINGO_CLAIM_PACE_MS=300`), same method as V11.

| Check | Observed | Result |
|-------|----------|--------|
| Catalogue shape (independent script: each pattern re-derived from rows, columns and diagonals, not copied) | 27 unique ids; groups Standard 5, Letters 8, Shapes 13, Multi-line 1; every cell index 0 to 24; every pattern except Two Lines matches its derivation; Single Line is the 12 lines; no two patterns share the same cells | PASS |
| Two Lines | 66 distinct variants, each the union of two different lines (9 or 10 cells); top row + O column completes it, the top row alone does not | PASS |
| Evaluator, every single-shape pattern | completes with exactly its non-FREE cells daubed and called; fails when any one cell is not daubed or not called; FREE alone never completes anything | PASS |
| Server, all 27 chosen (`setPatterns` with 27 ids) | accepted; every claim awarded exactly what the independent model predicts: draw 5 Single Line; 7 Postage Stamp; 10 Two Lines; 18 Inner Square; 19 Railroad Tracks; 20 Kite; 22 Letter T, Letter Y, Diamond, Plus Sign, Heart; 24 the other 16 in one claim; 27 of 27 won across 8 claims, match finished with 27 result rows, the other player saw every award | PASS |
| Browser lobby at the nine sizes (host) | 27 tiles in four groups (STANDARD, LETTERS, SHAPES, MULTI-LINE), counter "3 of 27" with the three defaults pressed; the four "All" toggles give "27 of 27"; no page scroll and no clipped tile text; the chooser scrolls inside its panel (inside the lobby body on narrow screens) | PASS |
| Browser lobby (player) at the nine sizes | read-only summary shows all 27 chosen patterns; no page scroll, nothing clipped | PASS |
| Browser match with all 27 chosen at the nine sizes | 27 tiles on the dashboard for player and host; BINGO! inside the viewport; no page scroll; card cells at least 55 px (40 required); no clipped tile text; the tile grid scrolls inside its panel on phones and 1024 x 768 and needs no scrolling at 1366 x 768 and above | PASS |
| Results with 27 patterns (1366 x 768 and 390 x 844) | the host claimed once with the full card and won all 27; the overlay lists 27 rows, scrolls inside its panel, fits the viewport and keeps Leave and New round visible | PASS |
| Names that clipped | "Corners and Centre" (105 px needed, 90 available) and "Checkerboard" (84 of 80 px at 1920 x 1080) were clipped in dashboard tiles; renamed "Dice Five" and "Checkers", then no tile clipped at any size | fixed |
| Evidence | retaken: lobby images at the nine sizes now show the 27-pattern chooser; added `*-lobby-27-patterns*.jpg`, `*-match-27-patterns-player.jpg` and `*-results-27-patterns.jpg` at the sizes where they were taken | done |
| `npm run build` and `npm run smoke` | pass | PASS |

The Render service still runs the previous build until this change is pushed and deployed.

## Known limits and pending items

- **T092, a person-timed SC-001**: not run (it needs a person). Procedure: start the stopwatch on the hub's PLAY NOW for Bingo, stop when the match screen shows, once
  accepting every default (under 10 s; 3 clicks plus sharing the link) and once changing the player limit, max cards, my cards, calling and patterns (under 60 s); record
  both times here and add the run to the T078 sign-off.
- **Pattern dashboard on the smallest phones**: with many patterns chosen (nine or more), or a host who plays, at 320 x 568 the tile grid shows two rows and scrolls inside its panel
  (the page never scrolls); everything stays reachable.
- **SC-013 and SC-014** (smooth animation on a mid-range phone, a first-time player finishing a claim in 2 minutes, a stakeholder rating of 4 out
  of 5) and a **human stopwatch for SC-001** (T092): not measured; they need people and devices. **T078 stays open.**
- **Render deployment (T079)**: the scripted live checks passed (V13). Still pending: the two-device browser run on the live URL and reconnect after a service
  replacement. Only the V13 rows count as deployment verification.

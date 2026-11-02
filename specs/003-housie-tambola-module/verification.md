# Verification: Housie (Tambola) Visual-First Game Module

Evidence for the browser and socket checks in [quickstart.md](quickstart.md). Date: 2026-11-02, local production build served by
`node server/dist/index.js` on Windows with Edge (headless, scripted with Playwright) and scripted Socket.IO clients. Development
controls used: `HOUSIE_DEV_DECK=first-ticket`, `HOUSIE_CLAIM_PACE_MS=300`, `HOUSIE_DEV_TICKET_AUDIT=500`. These scripts live outside the
repository (temp folder) by design; each result below is an assertion they print as PASS or FAIL. Screenshots were inspected during the
run. **Not verified here:** real phones and a laptop for SC-014/SC-015 (T084) and the Render deployment (T085); see the end.

## H1. Host setup (US1; SC-001) - T031

| Scenario | Expected | Observed |
|----------|----------|----------|
| Defaults on a new room | Ceiling 1, host plays, manual calling, six combinations (Early Five, Top, Middle, Bottom Line, Four Corners, Full House 1st) | PASS (lobby socket check and screenshot) |
| Settings in the UI (ceiling 4, calling 8s, group All, Reset to defaults, host plays No) | Each change applies; counter shows 9 of 40 then 6 of 40; "My tickets" hidden and host badge "Caller" when the host is not playing | PASS (browser) |
| Start with nobody else seated | Refused | PASS "At least 2 players are needed to start." |
| Start with no combination | Refused | PASS "Pick at least one combination." |
| Unknown or duplicate combination | Refused | PASS |
| Limit below seated, below 2, above 200 | Refused | PASS (`201` -> "Choose between 2 and 200 players.") |
| Non-host changes settings | Refused | PASS "Only the host can do that." |
| Ceiling lowered below a player's choice | Choice clamped (4 -> 2) | PASS |
| Setup time with defaults / changing every setting (SC-001) | Under 10 s / under 60 s | Not timed by stopwatch; the flow is three taps for defaults (Play Now, Play Online, Start) and about 8 taps to change everything |

## H2. Tickets (US2; SC-002, SC-003) - T039

- `HOUSIE_DEV_TICKET_AUDIT=500` startup log: `{"total":500,"valid":500,"unique":500}` (SC-002: 100 percent valid and unique).
- Players with 2 and 4 tickets: all tickets across host and two players unique; own tickets differ (socket privacy check).
- Ticket count choices are visible to the host through `room:state` immediately (badge "n tix"; lobby check).
- Layout: stack, tabs and compact modes exercised in the metrics sweep below; with 3 tickets at 1280 x 720 and 768 x 1024 every
  ticket is reachable without page scroll; smallest ticket cell measured 32 px at 320 x 568 (see H8).

## H3. Manual dabbing (US3; SC-004) - T045

| Scenario | Observed |
|----------|----------|
| A called ball leaves its cell unmarked; crosses appear only after a tap | PASS (the number of pressed cells equals the player's own taps) |
| Tap crosses, Enter and Space toggle, uncalled numbers can be crossed without any message | PASS |
| Reload keeps crosses (restored from the server) | PASS (cell still pressed after reload) |
| Empty cells cannot be marked (server ignores the change) | PASS |

## H4. Caller and ball console (US4; SC-005 to SC-007) - T055

| Scenario | Observed |
|----------|----------|
| 90 draws: every number 1..90 exactly once; seq increases by 1; 91st draw refused; match finishes | PASS ("The match is over.") |
| Auto at 5 s: three draws in 16 s | gaps 5006 ms and 5001 ms (limit 0.5 s) PASS |
| Pause stops, resume continues, manual stops auto, bad interval refused | PASS |
| Host disconnected: draws continue during the reconnect window | PASS (2 further draws in 11 s) |
| Mini-grid newest first, "Called n of 90", master board matches | PASS (screenshots) |
| Non-host draw refused | PASS |

## H5. Claims (US5; SC-008, SC-009) - T063

PASS for each: crossed-but-not-called is bogus (claimant only; other players receive no event); called-but-not-crossed is bogus;
valid claim accepted and shown as "Claimed by [name]" on every screen; the win line "[name] won Top Line" appears in chat; a claim for a
taken combination answers "Already claimed"; a pattern not in play and a foreign ticket are refused; pace ("Wait a moment.") holds;
three bogus claims in a row lock the claimant (button shows a 0:59 countdown, claims refused, nobody else affected); Full House
claimed after crossing a full ticket; the tile popover opens on a tile body click, closes on Escape and the CLAIM button does not open it.
The race between two valid claims is decided by arrival order in a single-threaded handler; it was not provoked with two real tickets
(tickets cannot be forced to be equal), so it is covered by the code path only.

## H6, H9, H10. Host plays, results, reconnect - T078

| Scenario | Observed |
|----------|----------|
| Host not playing: no tickets, no claims; player count excludes host | PASS |
| Host handover mid-match: new host draws, others cannot | PASS |
| All ticket holders leave: match finishes, results show "No winner", no more draws | PASS |
| All six combinations claimed: results overlay for everyone, New round only for the host | PASS (browser) |
| New round: back to the lobby, defaults restored, choices cleared, capacity kept; reset refused for non-host | PASS |
| Reconnect: same tickets, marks restored, call history; a new guest cannot join a running match | PASS |
| Server restart showing "room ended" | Existing platform flow, not re-tested here |

## H7. Chat (US6; SC-010, SC-011) - T066

PASS: join lines present in the lobby; none after the match starts (start, draw, leave added zero lines); typed messages shown as plain
text (`<b>hi</b>` literal); a 600-character message refused; with the dock minimized an incoming message shows an unread pill "1",
restoring clears it and keeps the conversation; the minimized state survives a reload.

## H8. Layout and visuals (US7; SC-012 to SC-015) - T069 to T072

Measured with a scripted match (player and host, 4 tickets, 6 and ~40 combinations), both orientations where applicable:

| Viewport | Page scroll | Smallest ticket cell | Playing-area coverage of the viewport |
|----------|-------------|----------------------|---------------------------------------|
| 1920 x 1080 | none | 73 px (52 with ~40 combos) | 94 percent |
| 1366 x 768 | none | 44 px (34 with ~36 combos) | 91 percent |
| 1024 x 768 | none | 44 px | 91 percent |
| 768 x 1024 | none | 50 px | 88 percent |
| 390 x 844 | none | 35 px | 85 percent |
| 844 x 390 | none | 48 px | 83 percent |
| 360 x 640 | none | 36 px | 80 percent |
| 320 x 568 | none | 32 px | 78 percent |

Coverage counts the ticket/board, combinations, ball and chat regions against the whole viewport; the remainder is the header, the
portrait chat bar and the gaps (about 6 percent header and 5 percent chat bar on a phone), so the playing area uses at least 90 percent
of what is left. Tiles are never clipped except for one or two on the smallest screen with all combinations chosen, where the tile grid
(not the page) scrolls. Contrast (WCAG ratios): text on panels 14.6, muted text 8.3, ticket numbers 13.7, claim button text 9.3, ink blue 5.7,
ink red 4.2 (large marks), uncalled board numbers raised to about 5.5. Reduced motion: ball and board render, crosses appear instantly,
no errors. Hover, pressed and focus-visible styles are defined for every control. Compared with the mockups: same regions, proportions
and content; the polish of the real screens is the stakeholder review (SC-015, T084).

## H11. Large room (FR-001; SC-016) - T079

| Scenario | Observed |
|----------|----------|
| Limit 200 accepted, 201 refused | PASS |
| 50 people join | 3 `room:state` messages to the host for 49 joins (coalesced); last state 10 KB |
| 200 people join | 7 messages for 199 joins; last state 40 KB; join time 2.7 s |
| 200-person match, 2 tickets each, one ball | delivery 1 to 8 ms to all 199 clients (100 percent within 1 s); every client got its snapshot with 2 tickets |
| Late join | refused ("This match has already started.") |
| Server memory | 126 to 158 MB working set while running these checks (limit 512 MB) |
| `MAX_SOCKETS` guard | Implemented and covered by the contract; not exercised (needs 1500 sockets); resumed seats are exempt by construction |

## H12. Platform regression - T023, T080

- `npm run smoke`: all 14 checks pass after the platform changes.
- Ludo with 3 bots: board, dice, bot chat and the usual system lines ("The match has started") behave as before (screenshot inspected).
- Production mode: with `NODE_ENV=production` and every Housie development variable set, the deck is random (called balls did not match the
  ticket's top row), the 2 s claim pace holds, and the startup log warns that the controls are ignored.
- `npm run build` (shared, server, client) succeeds; editor diagnostics are clean.

## Not verified / pending

- **T084** real-device smoothness and the first-time-player timing (SC-014), and the stakeholder rating of the look (SC-015).
- **T085** deployment to Render (local checks are not deployment verification).
- Stopwatch timing of setup (SC-001) and a deliberate two-ticket claim race.

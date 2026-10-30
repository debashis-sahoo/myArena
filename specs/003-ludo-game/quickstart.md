# Quickstart: Ludo

A validation guide for proving this feature works end to end. It describes how to run and check
the feature once the tasks from `/speckit-tasks` are implemented. Nothing here claims the feature
is built or tested.

## Prerequisites

- Node.js 24 and npm; Playwright browsers installed for the e2e project (`npx playwright install`).
- The workspace scripts from 001 and 002 (`npm run dev`, `npm run build`, `npm start`, `npm test`,
  `npm run test:integration`, `npm run test:contract`, `npm run test:e2e`, `npm run lint`).
- For device acceptance: a real laptop, a real Android phone and a real iPhone reaching a Render
  deployment, plus at least 8 outside reviewers for the rating sessions.
- Test-only settings (names only, no secrets): `LUDO_TEST_DICE`, a comma-separated list of die
  values, for repeatable scenarios. It is refused whenever `NODE_ENV=production`. It is never set
  on the real service.

## Run locally

```powershell
npm run dev                          # builds shared packages, then server on :3000 and web on :5173
```

Open the web URL. Expect the Ludo tile with its picture, labelled Playable, with "Play against AI"
and "Create private room" once selected.

Repeatable scenario run (rules and dice):

```powershell
$env:LUDO_TEST_DICE = "6,6,3,4,6,2"  # repeats from the start when exhausted
npm run dev
Remove-Item Env:LUDO_TEST_DICE       # clear it afterward
```

## Automated validation

```powershell
npm test                    # engine, runner, reducer, solo, theme and budget unit tests
npm run test:integration    # real WebSocket matches: full game, reconnect, late join, leave
npm run test:contract       # game channel and Ludo messages against the shared schemas and contracts
npm run test:e2e            # landing tile, lobby settings, four-context match, solo, axe, keyboard
npm run lint
npm run build               # also runs the 3D-engine, lazy-size and picture-size checks
```

## Validation scenarios

| # | Scenario | Stories and requirements | Expected outcome |
|---|----------|--------------------------|------------------|
| 1 | Open `/` on a laptop and phones, light and dark, fast and slow connection | US9, FR-047 to FR-050, SC-016 | Ludo tile shows a sharp picture; text appears first; no layout shift; page stays within the 002 loading target |
| 2 | Block the picture request, then reload | US9 scenario 6, FR-050 | The tile shows the fallback icon art, never a broken image |
| 3 | Screen reader on the Ludo tile | FR-049 | Name, status and details announced as text; the picture is not announced |
| 4 | Select Ludo, create a private room | US1, FR-001, FR-002 | Only 2, 3 and 4 offered, default 4; lobby opens with Ludo selected and limit 4 |
| 5 | In the lobby as host, change theme and turn limit; as a player, view them | US5, FR-004, FR-023, FR-010 | Host sees pickers with previews; everyone sees the choice; players cannot edit; no 3D code loads in the lobby |
| 6 | Try to raise the limit above 4; try a fifth person | FR-002, Changes table | Refused with plain explanation; the fifth person gets the full-room message |
| 7 | Start with 2, 3 and 4 ready players | US1, FR-003 | Colours Red+Yellow, Red+Green+Yellow, all four; the first player is random and announced |
| 8 | Play the scripted rule scenarios with `LUDO_TEST_DICE` | US1, FR-005, SC-002 | Leave base on 6, extra roll, capture, protected squares, blocks (landing refused, passing allowed), exact finish, three 6s, winning all match the rules |
| 9 | Send a roll or move out of turn, an unknown action, or a client-supplied result | US1 scenario 10, FR-006, SC-002 | Refused with a plain explanation; the match is unchanged |
| 10 | Roll many times with 3 devices watching | US2, FR-013 to FR-016, SC-004 | Every roll looks different, settles within 3 s on the same face for everyone, and the text matches |
| 11 | Skip a roll on one device | US2 scenario 6 | Only that viewer sees the result at once |
| 12 | Try to move while the die rolls | US2 scenario 5 | Refused (`DIE_STILL_ROLLING`) |
| 13 | Run the fairness sample (6,000 or more rolls) | FR-007, SC-003 | Each face between 15% and 18.5% |
| 14 | Play a short match in every theme; switch angled and top-down views | US3, US5, FR-017 to FR-025 | Realistic look, step-by-step moves, capture return, home celebration; same rules and clarity in every theme; pawns, homes and protected squares distinguishable by shape and marks |
| 15 | Switch quality to Lite; disable WebGL; force a lost context | US7, FR-026, SC-011 | Same information and rules with the flat board; notice shown on fallback |
| 16 | Chat from every device during a match; open the sheets on a phone | US4, FR-027 to FR-030, SC-008 | Everyone sees messages within 1 s; unread counts; the board stays visible; the game log is separate; chat never changes the match |
| 17 | Drop a player's connection during their turn, during a roll, then return | US6, FR-035, SC-007 | Same board, turn, last roll and theme; no lost or doubled action |
| 18 | Let a turn time out; let 3 turns time out; then use "I'm back" | US6, FR-010 | The game plays for the player and says so; after 3 misses the player is away and played at once; "I'm back" ends it |
| 19 | Remove a player, let a seat expire, leave as host, leave until one player remains | US6, FR-011, FR-012 | Pawns leave; match continues; last player wins; new host controls only the room |
| 20 | Open the invitation after the match started | Edge cases, FR-002 | Told the match is in progress; can wait with chat; no board; cannot act |
| 21 | Solo: 1, 2 and 3 opponents at each difficulty | US8, FR-039 to FR-046, SC-013 to SC-015 | No room or account; computers follow every rule; turns within 3 s; easy plays clearly weaker than hard; end screen offers Play again and Back to games |
| 22 | Solo: refresh mid-match; wait 30 minutes (or advance the stored time) | FR-045 | Restored exactly on refresh; discarded after 30 minutes |
| 23 | Keyboard only, screen reader, reduced motion, colour-vision simulation, 320 px and 200% text, both orientations | US7, FR-031 to FR-034, SC-009, SC-010 | A full match is playable; announcements as in the UI contract; no motion under reduced motion; no overflow |
| 24 | Measure frame rate and start-up on the acceptance phones | SC-006 | At least 30 fps for 95% of a 4-player match at the automatic level; ready within 5 s for 95% of starts |
| 25 | Check the build output | Plan constraints | No 3D code in the initial bundle (200 KB gzipped); Ludo chunks at most 400 KB gzipped; picture at most 100 KB |
| 26 | Start the server with `LUDO_TEST_DICE` and `NODE_ENV=production` | R5 | Start-up is refused |
| 27 | Four-bot load run | R16, SC-004, SC-008 | Reports action latency at the platform's room capacity without errors |
| 28 | Real-device matrix as host and player in mixed-device rooms | FR-038, SC-012 | Every cell recorded with device, OS, browser, tester, date and result |
| 29 | Outside review sessions | SC-001, SC-005, SC-013, SC-015, SC-016 | Ratings and completion rates meet the targets |

## Evidence

Record results in `specs/003-ludo-game/acceptance/` using the acceptance template from feature 002
(`specs/002-games-landing-page/acceptance/TEMPLATE.md`), one row per
scenario and device. Automated results go in `automated-results.md`. Scenarios 24, 28 and 29 cannot
be satisfied by automation or emulation.

# Automated Results: Ludo

Recorded 2026-10-31 on the local workspace (Node 24 through `npx --package=node@24`). These are automated runs only.
They do not replace the real-device acceptance (FR-038, SC-006, SC-012) or the outside review sessions (SC-001, SC-005,
SC-013, SC-015, SC-016).

## Suite results

| Check | Result |
|-------|--------|
| `npm run build:shared` | Pass |
| `npm run lint` | Pass |
| `npm run format:check` | Fails on 334 files, most of them from before this feature (line-ending and style drift in the repository); the files were not rewritten because that would hide the real changes. Not part of the lint gate |
| `npm test` (all workspaces) | Pass: ludo 57, protocol 16, game-sdk and others as before, server 138 (20 files), web 205 (30 files), load 8 |
| `npm run test:integration` | Pass: 100 tests in 28 files |
| `npm run test:contract` | Pass: 57 tests in 8 files (001 contract merged with the 002 and 003 deltas) |
| `npm run build` | Pass (see budgets below) |
| Chromium e2e (`desktop-chromium`, alone) | Full run 1: 106 passed, 1 failed (a Ludo test read the flat board while the 3D board was in use; fixed by setting the flat quality in that test). Full run 2, after the fix: 106 passed, 1 failed: the 001 `a11y.spec.ts` light-theme test failed while closing its browser contexts ("Target page, context or browser has been closed"), which is a teardown timing problem; that spec passed 13 of 13 when run alone straight afterwards. So no single full run was fully green, and that flaky teardown is not fixed |

Not run: Firefox and WebKit projects (browsers are not installed here) and the emulated phone projects. Emulation never
counts as device evidence. Headless Chromium renders WebGL in software, so frame-rate figures from it mean nothing for SC-006.

## Build budgets (quickstart scenario 25)

From the final `npm run build` output (gzip sizes):

| Budget | Limit | Measured |
|--------|-------|----------|
| Initial JavaScript (all non-lazy chunks) | 200 KB | about 148.9 KB (`index-*.js` 146.69 KB plus 2.21 KB) |
| 3D engine in any initial chunk | none | None: Three.js is only in the lazy `LudoScene-*.js` chunk (147.53 KB) |
| Ludo lazy chunks together | 400 KB | about 162 KB (scene 147.53, theme picker and settings 9.18, solo 4.86 and the online match code) |
| Tile picture | 100 KB | 5.36 KB (`ludo-tile-*.svg`) |

The build fails if any of these is exceeded (`apps/web/build/budget.ts`, `budget.test.ts`).

## Clean clone (quickstart scenarios 25 and 26)

A copy of the working tree without ignored files was installed with `npm ci --include=dev` and built with `npm run build`
(both exit 0). Started in production mode with an HTTPS `ALLOWED_ORIGINS` and no `LUDO_TEST_DICE`: `GET /api/catalog`
returned Ludo as `PLAYABLE`, `art.image` `LUDO`, modes `SOLO_AI` and `ONLINE`, and `/` returned 200. Started with
`LUDO_TEST_DICE` set and `NODE_ENV=production`: the process exited with code 1 and the message "LUDO_TEST_DICE fixes the
die for tests and is not allowed in production." The Render settings themselves were not exercised (no deployment).

## Four-bot load run (quickstart scenario 27)

`tools/load/src/ludo-bots.ts` against a local server: 2 matches of 4 bots for 40 seconds (a full match takes many minutes
because the die takes 2.4 s to settle): 40 actions, no refused action, action answer p50 1.4 ms, p95 2.7 ms; broadcast to
all four bots p50 1.4 ms, p95 2.6 ms, 100% within one second. This is a short local run, not a capacity test of a deployed
service.

## Quickstart scenarios and automated evidence

| # | Scenario | Automated evidence | Gap |
|---|----------|--------------------|-----|
| 1 | Tile picture, light and dark | `ludo-tile.spec.ts` (picture, no layout shift, axe light and dark, 320 px), `art-image.test.tsx` | Fast and slow real connections, people |
| 2 | Picture blocked | `ludo-tile.spec.ts`, `art-image.test.tsx` | |
| 3 | Screen reader on the tile | `art-image.test.tsx`, `ludo-tile.spec.ts` (name has no picture text) | VoiceOver and TalkBack not run |
| 4 | Create a room for Ludo | `ludo-match.spec.ts`, `room-size-rule.test.ts` | |
| 5 | Theme and turn limit in the lobby | `ludo-themes.spec.ts`, `ludo-settings.test.tsx`, `ludo-settings.test.ts` (server) | |
| 6 | Limit above 4, fifth person | `room-size-rule.test.ts`, `ludo-match.test.ts` | |
| 7 | Colours and first player | `ludo-match.test.ts`, `ludo-runner.test.ts`, `seats.test.ts` | |
| 8 | Scripted rule scenarios | `engine-rules.test.ts` (including 2,000 seeded matches), `ludo-match.test.ts` | |
| 9 | Out-of-turn and invalid actions | `ludo-runner.test.ts`, `action-parser.test.ts`, `game-channel.test.ts` | |
| 10 | Same roll for everyone | `ludo-dice.spec.ts` (three contexts, same face within 1 s, settles in under 3 s), `dice-animation.test.ts` (10,000 seeds, every face) | Real devices |
| 11 | Skip on one device | `ludo-dice.spec.ts`, `ludo-roll-playback.test.tsx` | |
| 12 | Move while the die rolls | `ludo-runner-settle.test.ts`, `ludo-dice.spec.ts` | |
| 13 | Fairness | `ludo-runner.test.ts` (6,000 draws, every face between 15% and 18.5%) | |
| 14 | Every theme, angled and top-down | `themes.test.ts`, `ludo-board.spec.ts` (3D ready, camera toggle), `ludo-a11y.spec.ts` (axe with the 3D board in each theme); I looked at software-rendered screenshots of all five themes | How it feels on real hardware, people |
| 15 | Lite, no WebGL, lost context | `ludo-quality.spec.ts`, `ludo-board.spec.ts` (context lost and restored once, then fallback), `quality.test.ts` | |
| 16 | Chat during a match | `ludo-chat.spec.ts`, `ludo-chat.test.ts` (40 messages, every one within 1 s), `ludo-sheets.test.tsx` | Real phones |
| 17 | Drop and restore the connection | `ludo-recovery.test.ts` (integration), `ludo-recovery.spec.ts` (offline and refresh) | Real network drops |
| 18 | Timeout, away, "I'm back" | `ludo-runner-timers.test.ts`, `ludo-recovery.test.ts`, `ludo-recovery.spec.ts` (a real 30-second limit through to "I'm back") | |
| 19 | Seats leaving, last seat wins | `engine-seats.test.ts`, `ludo-runner-timers.test.ts`, `ludo-recovery.test.ts` | |
| 20 | Invitation after the start | `ludo-match.spec.ts`, `ludo-match.test.ts` | |
| 21 | Solo | `ludo-solo.spec.ts`, `ludo-solo-runner.test.ts`, `strategies.test.ts` (hard beats easy in at least 60% of 400 seeded matches) | Ratings from people (SC-013, SC-015) |
| 22 | Solo restore and expiry | `ludo-solo.spec.ts`, `ludo-solo-runner.test.ts` | |
| 23 | Keyboard, screen reader, reduced motion, 320 px, 200% text | `ludo-a11y.spec.ts` (axe in three themes, focus rules, reduced motion, overflow at 320 by 640 and 640 by 320 and at 200% text, 44 px targets), `a11y-describe.test.ts` | Screen readers, colour-vision simulation, real devices |
| 24 | Frame rate and start-up on phones | Not run | Needs the acceptance phones (T139) |
| 25 | Build output | Budgets above, `budget.test.ts` | |
| 26 | Production guard | Clean clone check above, `ludo-env.test.ts` | Render not deployed |
| 27 | Four-bot load run | Load run above | A long run at room capacity on a deployed service |
| 28 | Real-device matrix | Not run | Needs devices (T138) |
| 29 | Outside review sessions | Not run | Needs people (T140) |

## Findings fixed along the way

- Adaptive quality dropped the 3D board to flat within seconds in a software-rendered browser. A quality the player chose
  themselves is now never lowered automatically; only the automatic level steps down.
- The solo save held the visitor's display name; it now stores a generic name and shows the current one on restore.
- The status line used to state the rolled number as soon as the roll started; it now says the die is rolling until this
  viewer's die settles, so the number is not given away early.

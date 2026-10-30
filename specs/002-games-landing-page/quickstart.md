# Quickstart: Games Landing Page and Game-First Room Setup

A validation guide for proving this feature works end to end. It describes how to run and check
the feature once the tasks from `/speckit-tasks` are implemented. Nothing here claims the feature
is built or tested.

## Prerequisites

- Node.js 24 and npm; Playwright browsers installed for the e2e project (`npx playwright install`).
- The 001 workspace scripts (`npm run dev`, `npm run build`, `npm start`, `npm test`,
  `npm run test:integration`, `npm run test:contract`, `npm run test:e2e`, `npm run lint`).
- For device acceptance: a real laptop, a real Android phone, and a real iPhone reaching a Render
  preview deployment.
- Preview environment keys (names only, no secrets): `DEPLOY_TARGET=preview` and
  `TEST_GAME_SECONDS` set to a small number of seconds. Neither is set on the real service.

## Run locally with the test games

```powershell
$env:TEST_GAME_SECONDS = "10"     # registers the test games (allowed outside production)
npm run dev                        # server on :3000, web dev server with proxy
```

Open the web URL. Expect "Test match" and the online-only test game as Playable tiles labelled
"Test game", and the roadmap games as "Coming soon". Clear the variable afterward
(`Remove-Item Env:TEST_GAME_SECONDS`).

## Automated validation

```powershell
npm test                    # unit tests: catalog merge, env guard, room-setup rules, web components
npm run test:integration    # create with gameId and maxParticipants, full room at chosen count
npm run test:contract       # responses checked against 001 contract merged with the 002 delta
npm run test:e2e            # landing spec plus migrated 001 journeys, axe, overflow, touch targets
npm run lint
```

## Validation scenarios

| # | Scenario | Stories and requirements | Expected outcome |
|---|----------|--------------------------|------------------|
| 1 | Open `/` with no selection | US1, FR-001 to FR-004, FR-008, SC-002 | Name and tagline, value line, join section, both groups; no create controls, count control or solo action |
| 2 | Activate a Coming soon tile with mouse, keyboard and touch | US1, FR-006, SC-004 | Nothing starts; "not available yet" is announced |
| 3 | Select a game supporting both modes, then one supporting one | US2, FR-009, FR-010, SC-002 | Options match each game; a note explains the missing mode |
| 4 | Select a tile, enter name and count, select another tile, then dismiss | US2, FR-011 | Options and defaults replace; name kept; dismiss returns to the no-options state |
| 5 | Create a room for a 2 to 4 game; inspect the count control | US3, FR-013, FR-014 | Only 2, 3 and 4 are offered, with the default preselected and the range shown |
| 6 | Create a room for a 2 to 100 game | US3, FR-014 | Stepper with range shown; the 100-seat note appears where the cap applies |
| 7 | Create with count N, join with N-1 more, try one more | US3, FR-015, FR-016, SC-003 | Lobby opens with the game selected and the limit N; the extra person gets the full-room message |
| 8 | Submit an invalid name or out-of-range count; force an unavailable game | US3, FR-017 | Plain-language errors with a next step; entries kept; no room created |
| 9 | Drop the network during create, then retry | FR-017 | One room only (same idempotency key) |
| 10 | Join by code from the landing page (valid, invalid, closed) and open an invite link | US4, FR-018 | Joins; unusable codes give the same non-revealing message; invite link skips the landing page |
| 11 | Hold a seat, return to `/` | FR-019 | "Return to your room" banner appears only after the seat is confirmed |
| 12 | Play against AI on the test game | US2, FR-012 | Solo page opens without a room or invitation; exit returns to the same selection |
| 13 | Set name, effects and sound; refresh; clear site data | US6, FR-020, FR-021 | Values persist, then reset to first-visit behavior |
| 14 | Request reduced motion; keyboard-only; screen reader; 320 px and 200% text | US5, FR-023 to FR-026, SC-007 to SC-009 | No motion, no overflow, visible focus, tile name, status and selected state announced; axe clean in light, dark and system themes |
| 15 | Production configuration check: `NODE_ENV=production` with `TEST_GAME_SECONDS` but no `DEPLOY_TARGET` | Plan R5 | Startup is refused; with `DEPLOY_TARGET=preview` it starts and tiles are labelled "Test game" |
| 16 | Check the bundle budget in the build output | Plan constraints | Gzipped entry bundle at or below 200 KB; solo modules are separate chunks |
| 17 | First-time visitors create a room unaided | SC-001 | At least 90% finish within 60 seconds |
| 18 | Reviewers rate the page | SC-005 | At least 4 out of 5 for "attractive" and for "professional" from at least 5 outside reviewers |

## Real-device acceptance

Run scenarios 1, 3, 5, 7, 10, 12 and 14 on a real laptop, Android phone and iPhone in portrait
and landscape and in light and dark modes, as host and as player, in a mixed-device room.
Viewport emulation does not count.

Record each run in `specs/002-games-landing-page/acceptance/` with:

```text
Device | OS and version | Browser and version | Tester | Date | Role | Scenario | Outcome | Notes
```

## References

- Entities and state: [data-model.md](data-model.md)
- REST delta: [contracts/catalog-and-room-setup.openapi.yaml](contracts/catalog-and-room-setup.openapi.yaml)
- Game and solo contract: [contracts/game-module-contract.md](contracts/game-module-contract.md)
- UI contract: [contracts/ui-contract.md](contracts/ui-contract.md)
- Decisions: [research.md](research.md)
- Base platform: [../001-base-platform-experience/quickstart.md](../001-base-platform-experience/quickstart.md)

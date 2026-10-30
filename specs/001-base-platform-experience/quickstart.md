# Quickstart: Base Platform and Experience

A validation guide for proving this feature works end to end. The commands describe the
planned workspace scripts; they will exist once the tasks from `/speckit-tasks` are
implemented. Nothing here claims the feature is built or tested.

## Prerequisites

- Node.js 24 LTS and npm.
- Playwright browsers installed (`npx playwright install`).
- For device acceptance: a real laptop, a real Android phone, and a real iPhone on the same
  reachable network or a deployed Render preview.
- Render environment variables set from `render.yaml` key names (no secrets committed):
  `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`.

## Run locally

```powershell
npm install
npm run dev          # server on :3000 and web dev server with proxy to it
npm run build        # builds protocol, game-sdk, web, and server
npm start            # serves API, WebSocket, and built SPA from one origin
```

## Automated validation

```powershell
npm test                      # unit tests across workspaces
npm run test:integration      # server with real HTTP and WebSocket clients
npm run test:contract         # responses validated against specs/001-.../contracts
npm run test:e2e              # Playwright multi-context journeys and axe checks
npm run load -- --profile 2x100
npm run load -- --profile 20x10
```

## Validation scenarios

> Feature 002 replaced the entry screen with a games landing page: a room is now created by
> choosing a game tile, "Create private room", a player count and a display name. Scenarios below
> that say "create a room" start there; joining by code or link is unchanged. See the
> [002 quickstart](../002-games-landing-page/quickstart.md).

| # | Scenario | Stories and requirements | Expected outcome |
|---|----------|--------------------------|------------------|
| 1 | Host creates a room; a second browser joins with the code, then with the link | US1, FR-001, FR-002 | Both see the same lobby and member list; no account or install |
| 2 | Join with an invalid, revoked, and closed code | US1, FR-002, FR-017 | Same unavailable message for all; no room data disclosed; retry offered |
| 3 | Fill a room to its limit and attempt one more join | FR-019 | Clear full-room message |
| 4 | Players change readiness; host selects a game, edits settings, starts, then requests rematch | US2, FR-005, FR-006, FR-008, FR-009 | All members see the same state; blocked starts explain why |
| 5 | A player attempts host-only actions and to alter another member's readiness | US4, FR-004, FR-006, SC-005 | Rejected; no state change |
| 6 | A client sends forged user or host identifiers | US4, FR-004, FR-023 | Rejected; no state change |
| 7 | Disconnect a participant, reconnect inside 10 minutes | US3, FR-010, FR-011, SC-004 | Same seat, role, readiness; no duplicated action |
| 8 | Repeat the same intent after a dropped ack | US3, FR-011 | One effect only |
| 9 | Return after 10 minutes | US3, FR-025, SC-012 | Rejected with an explanation; nothing restored |
| 10 | Host hands off; host leaves; host disconnected beyond 10 minutes | US4, FR-013 | Exactly one host; no global admin; room closes if none eligible |
| 11 | Close a room, then request chat, state, and recovery | FR-024, SC-011 | Nothing available |
| 12 | Capacity and latency at 2 x 100 and 20 x 10 | FR-019, SC-009, SC-010 | State not lost; 95% of changes visible within 1 second |
| 13 | Keyboard-only and reduced-motion journeys; axe scan; screen reader (VoiceOver, TalkBack) | US5, FR-015, SC-007, SC-008 | All controls operable with visible focus; no required motion; errors and status changes announced |
| 14 | Inspect logs and another member's view | FR-018, FR-023 | No tokens, cookies, codes, or recovery data |
| 15 | Host removes an idle member | FR-005 | Seat and recovery data released immediately; removed member returns only as a new participant via a valid invitation |
| 16 | First-time participants create or join unaided | SC-001 | At least 90% finish within two minutes |

## Real-device acceptance

Run scenarios 1, 4, 5, 7, 9, 10, and 13 on each device class as both HOST and PLAYER, in
mixed-device rooms, with the host role rotated across laptop, Android, and iPhone. Also check
portrait and landscape, background and resume, and screen lock on the phones. Viewport
emulation does not count.

Record each run in `specs/001-base-platform-experience/acceptance/` with:

```text
Device | OS and version | Browser and version | Tester | Date | Role | Scenario | Outcome | Notes
```

## References

- Entities and policies: [data-model.md](data-model.md)
- REST contract: [contracts/rest-api.openapi.yaml](contracts/rest-api.openapi.yaml)
- WebSocket contract: [contracts/realtime-protocol.md](contracts/realtime-protocol.md)
- Decisions: [research.md](research.md)

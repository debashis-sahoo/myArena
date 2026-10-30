# Automated Results: Games Landing Page

Recorded 2026-10-30 on the local workspace (Node 24 through `npx --package=node@24`). These are
automated runs only. They do not replace the real-device acceptance in spec FR-030.

## Suite results

| Check | Result |
|-------|--------|
| `npm run lint` | Pass |
| `npm test` (all workspaces) | Pass: server 73, web 104, protocol 16, load 6 |
| `npm run test:integration` | Pass: 76 tests in 24 files |
| `npm run test:contract` | Pass: 50 tests in 6 files (001 contract merged with the 002 delta) |
| `npm run build` | Pass; entry JS 145.81 KB gzipped (budget 200 KB); the test solo module is a separate lazy chunk |
| Chromium e2e (`desktop-chromium`, alone) | Pass: 66 of 66 in the final full run |

Not run: Firefox and WebKit projects (browsers are not installed here) and the emulated phone
projects. Emulation never counts as device evidence.

## Quickstart scenarios and automated evidence

| # | Scenario | Automated evidence | Gap |
|---|----------|--------------------|-----|
| 1 | Open `/` with no selection | `landing.spec.ts` (browse), `landing.test.tsx` | Visual review by people |
| 2 | Coming-soon tile activation | `landing.spec.ts`, `keyboard.spec.ts`, `game-tile.test.tsx` | Touch on a real phone |
| 3 | Both-mode and single-mode games | `landing.spec.ts`, `play-options.test.tsx` | Real devices |
| 4 | Switch tiles, dismiss | `landing.spec.ts`, `hero-guidance.test.tsx` | |
| 5 | 2 to 4 game count control | `landing.spec.ts`, `player-count-field.test.tsx` | |
| 6 | 2 to 100 game, stepper | `landing.spec.ts`, `player-count-field.test.tsx` | |
| 7 | Chosen count and full room | `landing.spec.ts`, `room-setup.test.ts` (integration) | Mixed-device room |
| 8 | Invalid input, unavailable game | `create-room-panel.test.tsx`, `room-setup.contract.test.ts` | |
| 9 | Dropped network and retry | `landing.spec.ts`, `create-room-panel.test.tsx`, `room-setup.test.ts` (idempotency) | |
| 10 | Join by code, invite link | `landing-join.spec.ts` | Real devices |
| 11 | Return-to-room banner | `landing-join.spec.ts`, `return-to-room.test.tsx` | |
| 12 | Play against AI | `landing.spec.ts`, `solo-registry.test.tsx` | Real devices |
| 13 | Preferences | `landing-preferences.spec.ts`, `preferences.test.ts` | |
| 14 | Reduced motion, keyboard, screen reader, 320 px, 200% text | `landing-motion.spec.ts`, `keyboard.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts` (axe in light, dark and system themes) | Screen reader (VoiceOver, TalkBack) and real devices not run |
| 15 | Production guard | `env-guard.test.ts`; also checked directly against the built server: production with `TEST_GAME_SECONDS` and no preview target is refused, with `DEPLOY_TARGET=preview` it is accepted | Render preview not deployed |
| 16 | Bundle budget | Build output above; `budget.test.ts` | |
| 17 | First-time visitor timing (SC-001) | Not run | Needs people |
| 18 | Outside review ratings (SC-005) | Not run | Needs people |

## Findings fixed along the way

- The web build under `NODE_ENV=test` emitted development JSX calls against React's production
  runtime, so the app did not render under the Playwright server. `vite.config.ts` now sets
  `esbuild.jsxDev` to false for builds.
- axe `label-content-name-mismatch` on tiles: the accessible name now carries every visible word,
  with explicit spaces between inline pieces.
- Playwright treats `aria-disabled` as not enabled; the coming-soon e2e uses a forced click for
  the click a real user can make.

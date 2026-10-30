# Baseline before feature 002

Recorded 2026-10-30 on the local workspace (Node 24 through `npx --package=node@24`).

| Check | Result |
|-------|--------|
| `npm run lint` | Pass |
| `npm test` | Pass (server 48, protocol 16, load 6, web 39 before this feature's tests) |
| `npm run test:integration` | Pass, 70 tests in 23 files |
| `npm run test:contract` | Pass, 44 tests in 4 files |
| `npm run build` | Pass; entry JS 138.33 KB gzipped (budget 200 KB) |
| Chromium e2e (`desktop-chromium`) | Not recorded. The run started for this baseline was disturbed by source edits made while it ran (1 passed, the rest did not run), so it is not valid evidence. Re-run alone once US3 is complete; the last clean run was recorded under feature 001. |

Note: adding `DEPLOY_TARGET` and `TEST_GAME_SECONDS` to `render.yaml` required updating the
expected key list in `apps/server/tests/unit/setup.test.ts`.

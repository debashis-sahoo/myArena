# Baseline before Ludo (feature 003)

Recorded on 2026-10-31 from branch `003-ludo-game`, after adding the `@myarena/ludo` workspace package and the
`three` dependency but before any other change. Node 24 (through `npx --package=node@24`).

| Check | Result |
|-------|--------|
| `npm run build:shared` | Passed |
| `npm run lint` | Passed |
| `npm test` (unit, all workspaces) | Passed; the run's counts were not captured |
| `npm run test:integration` | 24 files, 76 tests passed |
| `npm run test:contract` | 6 files, 50 tests passed |
| `npm run build` | Passed; initial JavaScript `index-*.js` 468,800 bytes raw, 145,807 bytes (145.8 KB) gzipped; `TestSolo-*.js` 441 bytes gzipped (lazy) |
| `npm run test:e2e` | Not run for the baseline; the 002 e2e results are in `specs/002-games-landing-page/acceptance/automated-results.md` |

Notes:

- The initial bundle is 145.8 KB gzipped, so about 54 KB of headroom remains under the 200 KB budget.
- Counts after the Ludo platform and server work are recorded in `automated-results.md` once the feature is finished.

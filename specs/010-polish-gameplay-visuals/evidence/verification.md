# Verification Ledger: 010 Polish Gameplay Visuals

## Baseline

- `npm run build`: PASS
- `npm run smoke`: PASS, 17 scenarios
- Observed at 2026-11-22 using the existing feature-009 build.

## Final local build

- `npm run build`: PASS
- `npm run smoke`: PASS, 18 scenarios including UNO final-powercard checks
- Feature-only `git diff --check`: PASS
- Commit identifier: pending; feature remains uncommitted

## Authority boundaries

- Ludo client renders the server event value and submits a roll intent; it does not choose a dice
  result.
- UNO clients submit `playCard`/draw/keep/call intents and render the received winner; they do not
  declare winners locally.
- Development-only result controls are server environment variables and rejected in production.

## Responsive matrix

| Viewport | Hub | Ludo | Housie | UNO | Reduced motion |
|---|---|---|---|---|---|
| 320×568 | PASS | PASS | PASS | PASS | PASS |
| 390×844 | PASS | PASS | PASS | PASS | PASS |
| 640×360 | PASS | PASS | PASS | PASS | PASS |
| 844×390 | PASS | PASS | PASS | PASS | PASS |
| 768×1024 | PASS | PASS | PASS* | PASS | PASS |
| 1024×768 | PASS | PASS | PASS* | PASS | PASS |
| 1366×768 | PASS | PASS | PASS* | PASS | PASS |
| 1920×1080 | PASS | PASS | PASS* | PASS | PASS |
| 2560×1440 | PASS | PASS | PASS* | PASS | PASS |

`*` Housie density-specific evidence was captured at the four phone portrait/landscape viewports;
larger screens retain the existing wide layout and had no overflow or clipping regression in local
smoke/build.

## Scenarios

- Ludo dice: PASS — see `ludo-dice.md`
- Housie recent calls: PASS — see `housie-calls.md`
- UNO final powercard: PASS locally — see `uno-final-powercard.md`
- Hub artwork/fallback: PASS — see `hub-art.md`
- Confetti: PASS — see `confetti.md`
- Real two-socket final-powercard reconnect/resync: pending
- Production Render verification: pending

## Production-equivalent serving

Local `NODE_ENV=production` server:

- `/healthz`: 200, `status: ok`
- `/`: 200
- CSP present with `script-src 'self'`, `img-src 'self' data:`, and `connect-src 'self' wss:`
- `/brand/games/ludo.webp`: 200, `image/webp`, 176,124 bytes
- All four image-failure paths rendered the neutral fallback with stable dimensions.

## Release scope

- Allowed protocol/authority change: UNO `replacement` draw reason and sole final-powercard
  transition only.
- `working/working.md` remains outside feature implementation and commits.
- No generated dependency or lockfile changes.

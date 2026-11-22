# Verification: Secure Host Access and Room Entry

Verification follows the scenario, expected-result, and observed-result format required by the constitution.

## Baseline

| Item | Prerequisite | Expected Result | Observed Result | Status | Evidence |
|------|--------------|-----------------|-----------------|--------|----------|
| Build | Existing dependencies installed | `npm run build` completes for shared, server, and client | Completed successfully | PASS | `npm run build` |
| Smoke | Built workspaces | `npm run smoke` completes all existing room-engine scenarios | All 15 scenarios passed with zero host-invariant violations | PASS | `npm run smoke` |
| Final build | Feature implementation complete | `npm run build` completes for shared, server, and client | Shared/server TypeScript and production Vite build completed successfully | PASS | `npm run build` |
| Final smoke | Final feature build | Expanded smoke suite completes all authorization and room-entry scenarios | All 17 checks passed with zero host-invariant violations | PASS | `npm run smoke` |

## Feature Scenarios

| Scenario | Prerequisite | Expected Result | Observed Result | Status | Evidence |
|----------|--------------|-----------------|-----------------|--------|----------|
| V1 Host capability and route split | Fresh browser and running app | Player route cannot create; `/host` issues capability; authorized host can create | Smoke verifies unauthorized/authorized create; `/` and `/host` browser views show player/host controls respectively, and `/host` created online rooms | PASS | `server/scripts/smoke.ts`; `evidence/host-1024x768.png`; `evidence/player-1024x768.png` |
| V2 Six-character room code | Authorized host session | Codes are exactly six valid characters and normalize consistently | Smoke validates six-character format and normalized code-only join | PASS | `server/scripts/smoke.ts` |
| V3 Player Hub code join | Active online room and second browser | Code-only join resolves the authoritative game and joins | Smoke validates code-only resolution; a second browser joined active Ludo and UNO rooms by code without host controls | PASS | `server/scripts/smoke.ts` |
| V4 Shared URL player join | Active online room invite | Invite join remains a player and host actions are rejected | Smoke validates ordinary guest host-action refusal | PASS | `server/scripts/smoke.ts` |
| V5 Host eligibility and departure | Host plus ordinary and route-switch players | Host resume works; fresh joiners never inherit host; room closes after host release | Smoke validates host-cookie fresh join ineligibility, host reconnect, and host_left closure | PASS | `server/scripts/smoke.ts` |
| V6 Invalid/unavailable codes | Missing, full, started, expired/suspended references | Hub retains input and shows safe corrective errors | Browser retained `ZZZZZZ` and malformed `12` with inline corrective errors; smoke covers full/in-progress/unavailable/suspended room outcomes | PASS | `server/scripts/smoke.ts`; `evidence/player-1024x768.png` |
| V7 Invite code and URL | Generic/custom game invite surfaces | Code and URL copy separately and join the same room, including Ludo and UNO custom matches | Shared full and compact surfaces render on default, Ludo, Housie, Bingo, and UNO call sites; Ludo/UNO two-client browser joins passed, while independent clipboard permission checks remain pending | IN PROGRESS | `client/src/components/room/InviteBar.tsx`; `server/scripts/smoke.ts` |
| V8 Host/player atmosphere | Responsive browser matrix | Distinct host/player primary actions and coherent game energy without clipping | Desktop 1024x768 plus true mobile emulation 390x844 and tablet 768x1024 pass with no horizontal overflow; the full 320/landscape/ultrawide matrix and all four game screens remain pending | IN PROGRESS | `evidence/host-1024x768.png`; `evidence/player-1024x768.png`; `evidence/host-mobile-emulated-390x844.png`; `evidence/player-mobile-emulated-390x844.png`; `evidence/player-768x1024.png` |
| V9 Reduced motion/accessibility | Reduced-motion browser and keyboard/touch | Equivalent state clarity, visible focus, and operable controls | Reduced-motion media disables decorative animation while static role/action styling remains; keyboard and touch pass across all target sizes remains pending | IN PROGRESS | `evidence/player-reduced-motion-1024x768.png`; `client/src/styles/animations.css` |
| V10 Two-client/reconnect smoke | Updated smoke script | Authorization, code joining, host closure, reconnect, and direct forged actions pass | All 16 scenarios plus host invariant passed | PASS | `npm run smoke` |
| V11 Render verification | Feature deployed to Render | HTTPS Secure cookie, WSS, code/URL joining, restart invalidation pass or are explicitly pending | Pending | Pending | |

## Acceptance Evidence

Screenshots, metrics, and scripted observations belong under `specs/008-secure-host-room-entry/evidence/` and should be linked from the scenario rows above.

## Pending Manual Evidence

- Full V8 device matrix: 320x568, 640x360, 844x390, 1366x768, 1920x1080, and 2560x1440, plus Housie/Bingo/UNO/Ludo game-screen captures.
- V7 clipboard-permission and manual-copy fallback checks.
- V9 end-to-end keyboard and touch checks at the full matrix.
- V11 Render deployment, HTTPS `Secure` cookie, WSS, restart invalidation, and fresh capability issuance.
- Representative user review for primary-action recognition and energy rating.

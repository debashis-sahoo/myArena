# Verification: Premium Active-Game Hub

## Baseline

| Scenario | Prerequisite | Expected Result | Observed Result | Status | Evidence |
|----------|--------------|-----------------|-----------------|--------|----------|
| Build | Dependencies installed | `npm run build` completes for shared, server, and client | Shared, server, and client builds completed successfully | PASS | `npm run build` |
| Smoke | Built workspaces | Existing focused room-entry and gameplay smoke scenarios pass | All existing scenarios passed with zero host-invariant violations | PASS | `npm run smoke` |
| Final build and smoke | Feature implementation complete | Production build and all 17 smoke scenarios pass after visual changes | Final client/shared/server build passed and all 17 smoke scenarios passed with zero host-invariant violations | PASS | `npm run build && npm run smoke` |

## Preview Gate

| Scenario | Prerequisite | Expected Result | Observed Result | Status | Evidence |
|----------|--------------|-----------------|-----------------|--------|----------|
| Host desktop preview | Representative desktop preview created | Host role, active launch cards, border-free title, and natural Ludo art are reviewable | 1536x1024 preview explicitly approved with four active games, separate HOST ARENA text, and host launch actions | PASS | `previews/host-desktop.png` |
| Player desktop preview | Representative desktop preview created | Player role, room-code form, active showcases, and border-free title are reviewable | 1536x1024 preview explicitly approved with four active games, separate PLAYER HUB text, room-code form, and showcase guidance | PASS | `previews/player-desktop.png` |
| Host phone preview | Representative phone preview created | No clipping or overlap and host actions remain clear | 1024x1536 preview explicitly approved after revision to exactly four active games with complete host role and controls | PASS | `previews/host-phone.png` |
| Player phone preview | Representative phone preview created | No clipping or overlap and room-code entry remains primary | 1024x1536 preview explicitly approved after revision to exactly four active games with complete player role and room-code entry | PASS | `previews/player-phone.png` |
| Approval gate | Four previews reviewed | All four approval records are true before production code changes | All four host/player desktop/phone previews explicitly approved | PASS | `previews/approval.json` |

## Feature Verification

| Scenario | Prerequisite | Expected Result | Observed Result | Status | Evidence |
|----------|--------------|-----------------|-----------------|--------|----------|
| Live role subtitle | Host/player pages implemented | `HOST ARENA` / `PLAYER HUB` is fully visible as live text | All 18 host/player viewport checks showed the complete label fully visible and geometrically separated from the title | PASS | Browser responsive matrix; evidence screenshots |
| Active-only catalog | Catalog available | Only games marked active are rendered; no coming-soon cards | Player and host pages rendered exactly four cards: Ludo, Housie, Bingo, and UNO; Snakes & Ladders was absent | PASS | Browser inspection; `GameGrid.tsx` |
| Premium artwork | Approved assets implemented | All active cards use polished dimensional art | All four active cards loaded optimized WebP artwork; no broken images in normal path | PASS | `evidence/player-desktop.png`; `evidence/host-desktop.png` |
| Ludo die realism | Ludo art implemented | Natural beveled six-sided die with coherent pips | Ludo artwork shows a rounded/beveled cube, multiple visible faces, and coherent pips at phone and larger card sizes | PASS | `evidence/ludo-art-small.png`; `evidence/ludo-art-large.png` |
| Asset failure | Force card image error | Neutral fallback preserves size, label, action, and accessibility | Aborted Ludo image request showed the neutral fallback while name, reserved art size, and player guidance remained present | PASS | Browser failure checkpoint |
| Player room join | Active room and second client | Valid code joins; invalid code remains recoverable | `ZZZZZZ` retained the Hub with “We could not find that room.”; `3ZJV99` joined the Ludo room without host controls | PASS | Two-client localhost 10001 checkpoint |
| Host creation | Host capability | Active game launches existing room-creation flow | Host opened Ludo launch modal, created online room `3ZJV99`, retained host controls, and started the match | PASS | Two-client localhost 10001 checkpoint |
| Responsive matrix | Implementation ready | No clipping, overlap, overflow, or unreadable controls | All 18 host/player checks across 9 viewport sizes had four cards, zero horizontal overflow, visible role, separated role/title geometry, and zero broken images | PASS | `evidence/player-phone.png`; `evidence/host-phone.png`; `evidence/player-desktop.png`; `evidence/host-desktop.png` |
| Reduced motion | Emulated preference | Clear static role, action, and state equivalents | Role, atmosphere particles, and confetti animations resolved to `none`; role and controls remained visible | PASS | `evidence/player-desktop-reduced.png`; `evidence/host-desktop-reduced.png`; `evidence/player-phone-reduced.png`; `evidence/host-phone-reduced.png` |
| Reviewer sample | At least 5 host + 5 player reviewers | Required energy, premium, action recognition, and Ludo-art thresholds met | Pending | PENDING | |
| Performance | Cold cache, 4G throttle, 150 ms RTT | Hero and primary action usable within 2.5 seconds | Conservative uncompressed localhost cold-cache test reached DOM-ready/primary action at 4.63s; production-edge compression verification remains required | PENDING | Browser throttling checkpoint |
| Render readiness | Deployed branch | `/healthz` healthy and HTTPS/WSS connection succeeds | Pending | PENDING | |
| Render reconnect | Active production room | Disconnect/reconnect resynchronizes authoritative state | Pending | PENDING | |

# Quickstart: Validate Polish Gameplay Visuals

## Prerequisites

- Node.js 22+
- Installed repository dependencies
- Development-only controlled checkpoint support for UNO and Ludo
- Desktop browser plus phone-sized viewport/device emulation

## 1. Build and platform smoke

```powershell
npm run build
npm run smoke
```

Expected: shared, server, and client builds pass; existing health, room, authority, chat, reconnect,
and one-host checks pass.

## 2. Ludo controlled-value check

For values 1 through 6:

1. Trigger one development-only controlled roll.
2. Observe lift, tumble, multiple decaying impacts, tracked shadow, and settle.
3. Confirm pips and final face match the authoritative value.
4. Repeat under reduced motion.

Expected:

- 6/6 final faces correct.
- Pips remain visible at compact/full dice sizes.
- Shadow returns to baseline.
- Stale animation cannot change a later result.

Capture normal and reduced-motion evidence.

## 3. Housie phone density

Use a player match with at least 30 calls.

At 320×568 and 390×844:

1. Confirm the current ball remains visible.
2. Require at least 10 complete previous-call chips across at least two rows at 320 px.
3. Confirm newest-first order, whole digits, and no clipping.
4. Open “View all”, close it, and confirm focus returns.

At 640×360 and 844×390, resize/rotate and confirm layout recalculates without stale clipping.

Run the pure recent-call planner from `client/src/games/housie/useFit.ts` with the same four
viewports and 30 calls. Record the exact columns, rows, reserved history-control cells, and visible
chip counts alongside the visual observation.

Capture portrait and landscape evidence.

## 4. UNO final-powercard checkpoint

For Skip, Reverse, Draw Two, Wild, and Wild Draw Four:

1. Use a deterministic development-only deal with one legal sole powercard.
2. Play it in a two-client match.
3. Verify its normal effect.
4. Verify no `finished` event or winner.
5. Verify exactly one `replacement` draw.
6. Verify only the recipient sees the replacement card face.
7. Verify the normal next turn begins.

Repeat one powercard scenario with an empty draw pile and recyclable discard so the replacement is
proven to use the forced-reshuffle path exactly once.

Also run a corrupted development-only fixture where neither the draw pile nor recyclable discard can
supply a replacement. Confirm the play is safely rejected without hand, discard, turn, pending,
direction, or winner mutation; confirm one state-fault log entry; and confirm reconnect/resync restores
the unchanged authoritative snapshot.

Then play a legal numbered final card and verify one agreed winner.

Expected:

- 5/5 powercard classes do not finish immediately.
- 5/5 award exactly one replacement.
- Bots and humans use the same authoritative transition.
- Both clients agree on sequence and resulting state.

## 5. Hub artwork and resize

1. Open `/` and `/host`.
2. Confirm the Ludo thumbnail's board is square.
3. Check 320×568, 390×844, 640×360, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080,
   and 2560×1440.
4. Confirm title, badge, description, and action remain visible.
5. Fail the Ludo image request and verify the neutral fallback keeps dimensions.

Expected: no stretching, horizontal overflow, overlap, or collapsed media.

## 6. Confetti and reduced motion

Verify Hub, Ludo result, and UNO result:

1. At least 16 visible pieces on a 320 px phone and 24 on desktop.
2. Each surface exceeds its independently captured pre-feature baseline.
3. Winner text and actions remain legible.
4. All controls remain clickable through the decorative layer.
5. Reduced motion shows no falling pieces.
6. Navigating away leaves no particles over the next screen.

## 7. Production verification

After deployment:

1. GET `/healthz`.
2. Load player and `/host` through HTTPS.
3. Confirm all thumbnails load without CSP or 404 errors.
4. Start or observe a two-client UNO checkpoint and reconnect/resync once.
5. Confirm WSS connectivity and authoritative snapshots.

Record unavailable production or reviewer checks as pending; never present local-only evidence as
production verification.

## Evidence

Store evidence under `specs/010-polish-gameplay-visuals/evidence/` with scenario, viewport/client
state, expected result, observed result, reduced-motion state, and pass/fail.

# Ludo Dice Evidence

## Geometry and authority

- Six mounted faces contained exactly 1, 2, 3, 4, 5, and 6 dark pips.
- Rounded slab shell and recessed-pip styles compiled and rendered.
- Server-only `LUDO_DEV_DICE` remains the controlled-result mechanism; the client has no value
  selector.

## Normal motion

Live controlled room sample:

- During tumble: 1 cube animation, 2 throw-layer animations, 1 shadow animation, and 2 console
  impact animations.
- Mid-air shadow sampled at `scale(0.625, 0.572)` with `blur(4.678px)`.
- After settle: zero cube, throw, shadow, or impact animations remained.
- Final authoritative roll text and the server activity agreed.
- Six browser-helper executions resolved values 1–6 to the exact expected face transform.

## Reduced motion

- Cube and throw layer used only the short 200 ms fade/scale.
- Shadow animations: 0.
- Shake/console impact animations: 0.
- Remaining animations after settle: 0.
- Final face remained the server value (live observed 6).

## Responsive

| Viewport | Board | Die tray | Overflow |
|---|---:|---:|---:|
| 320×568 | 300×300 | 90×80 | 0 |
| 390×844 | 300×300 | 112×100 | 0 |
| 640×360 | 300×300 | 112×100 | 0 |
| 844×390 | 336×336 | 90×80 | 0 |
| 768×1024 | 686×686 | 118×106 | 0 |
| 1024×768 | 686×686 | 157×140 | 0 |
| 1366×768 | 706×706 | 168×154 | 0 |
| 1920×1080 | 706×706 | 208×190 | 0 |
| 2560×1440 | 706×706 | 277×253 | 0 |

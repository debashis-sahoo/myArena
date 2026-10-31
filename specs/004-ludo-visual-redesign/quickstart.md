# Quickstart: Validating the Ludo Visual Redesign

Prerequisites: Node 24 (run through `npx --yes --package=node@24 -- node ...` if your default is newer), `npm install`, `npm run build:shared`.

## 1. Automated checks

```powershell
npm run lint
npm run test:unit -w @myarena/web            # unit: hops, die transform, layout, highlight, themes
npm run build                                # budgets: initial 200 KB, Ludo lazy 150 KB gzipped
# from apps/web (the spec sets the laptop, phone portrait and phone landscape sizes itself):
npx playwright test ludo-visual --project=desktop-chromium
npx playwright test ludo-dice ludo-match ludo-solo ludo-a11y --project=desktop-chromium
```

Expected: all green; no `three` in `apps/web/package.json` or in `dist`.

## 2. Look at it (owner review, SC-001)

1. `npm run dev`, open the web address on a laptop and on a phone on the same network.
2. Start a solo match (1 human, 3 bots) in each theme.
3. Check against the reference images: bright flat board, white yards with four slots, white track, coloured lanes with arrows, centre triangles, outlined stars, pin pawns without numbers, name bars at the corners.

## 3. Behaviour scenarios

| Scenario | Expected |
| --- | --- |
| Roll five times | Each roll tumbles differently, bounces, settles in 3 s or less on the number announced. |
| Roll in a room with a second device | Both devices show the same motion and the same final number. |
| Skip animation | Die shows the number at once on this device only. |
| Move 4 squares | The pin hops four times, one square each, landing with a small squash. |
| Capture | The capturing pin lands, then the captured pin flies back to its yard slot. |
| Two movable pawns | Pointing at or focusing a move button highlights the matching pin. |
| Reduced motion on | Die and pins show the result at once. |
| Rotate phone | Board stays whole; the arrangement changes; nothing scrolls sideways. |
| Text at 200% | Nothing cut off or overlapping. |
| Open an old saved solo match | It opens with the new look. |

## 4. Not automated

Real-device frame rate and the device matrix (003 tasks T138 to T140) stay manual and are re-run on the acceptance phones.

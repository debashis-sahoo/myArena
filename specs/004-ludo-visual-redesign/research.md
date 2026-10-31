# Research: Ludo Visual Redesign

All unknowns from the plan are resolved here. Decisions refer to spec requirements (FR-xxx) and to the 003 research items they replace (R6 dice, R7 3D engine).

## D1. Board: keep the flat SVG board, restyle it (FR-001, FR-005, FR-006, FR-028)

- **Decision**: Draw the board as inline SVG on the existing 15 by 15 grid (`view/Board2D.tsx`, `view/placement.ts`). Corner frames are full-colour 6 by 6 blocks with a white rounded 4 by 4 yard inside and four round slots; track squares are white with thin grey lines; the start squares and home-lane squares are in the player's colour; the outermost lane square of each colour carries an entry arrow; the centre is four triangles; safe squares carry an outlined star.
- **Rationale**: The SVG board already exists, passes accessibility checks, needs no graphics hardware, scales to any size, and shares the grid maths with placement and the board description.
- **Alternatives**: Canvas (loses crisp scaling and per-pawn focus/hit areas); keep Three.js (rejected by the owner).

## D2. Pawns: pin shapes drawn in SVG, no numbers (FR-002 to FR-005, FR-007)

- **Decision**: One `Pin` SVG group per pawn: ground ring in the colour, tapered body, domed head with a white gloss highlight, and a white mark on the head (circle, triangle, square, diamond by colour). No number is drawn. The pawn number stays in the move-button text and the hidden board description (`a11y/describe.ts`, unchanged).
- **Linking buttons to pawns**: the board exposes a highlight state keyed by pawn index. Pointer-enter or focus on a move button in `Controls` sets it; the matching pin shows a strong ring and lifts slightly. Movable pins always show a pulsing ring (already present) and stay pressable.
- **Rationale**: Without numbers, the button-to-pawn link is the one thing players lose, so it is solved explicitly (SC-005).

## D3. Hop animation: planned path, driven by the move events (FR-009 to FR-012)

- **Decision**: A pure `hopPath(color, pawn, from, to)` returns the squares visited, one per step (yard to start is one hop; into home ends in the centre). A small `useHops` hook compares the new view with what is shown, reads `MOVED` events (the same events the 3D scene used), and animates each pin along its path with `requestAnimationFrame`, writing the SVG `transform` attribute (not the style attribute, so the Content Security Policy is unaffected). Each hop is 0.2 s (shorter for very long paths so a move never exceeds 1.5 s), with an arc of about 0.42 square and a small squash on landing. A capture knocks the captured pin back to its yard slot after the capturing pin lands (0.5 s arc).
- **Rules kept from 003**: a new live move finishes the one in progress at once; reduced motion, effects off, a hidden page and snapshots place pins directly with no replay.
- **Rationale**: Reuses the timings and the rules that already passed review; the only new thing is drawing them in SVG.
- **Alternatives**: CSS keyframes per pawn (cannot express an arbitrary multi-square path with arcs without generated CSS); Web Animations API (fine, but a manual `requestAnimationFrame` loop is easier to finish at once and to unit test with a fake clock).

## D4. Die: CSS 3D cube driven by the existing seeded throw (FR-013 to FR-018)

- **Decision**: Replace `Die2D` with a `Die3D` component: a `div` cube with six faces (rounded, glossy white, black pips as small round elements) inside a perspective stage with a soft elliptical shadow. The throw is `buildThrow(seed, face, durationMs)` from `packages/ludo` (already shared by all viewers). Each animation frame, `sample(t)` gives a position and an orientation quaternion; a pure `dieTransform(sample)` converts it to a CSS `matrix3d` written through the element's style property from script (allowed under the Content Security Policy; only style attributes in markup are blocked). The shadow's size and opacity follow the die's height.
- **Face mapping**: the pips on each CSS face are placed to match `FACE_NORMALS` (1 up, 6 down, 2 front, 5 back, 3 right, 4 left), so the face that ends up is exactly the decided number. A unit test checks that for every face and many seeds the final matrix puts the decided face toward the viewer's "up".
- **Camera tilt**: the stage is tilted by a fixed angle (about 55 degrees) so the tray reads as a floor and the bounces read as height. The die stays within the tray (`TRAY_LIMIT`), so the stage is a fixed size: 6 rem on a laptop, 5 rem on a phone.
- **Skip and reduced motion**: the existing `RollPlayback` class is reused unchanged (it already decides when a roll starts, settles, is skipped, or is shown at once). When it reports no active throw, `Die3D` shows the settled face with the final pose for that number.
- **Rationale**: The throw maths was already built and tested for the 3D scene; only the drawing changes. CSS 3D needs no libraries and no graphics hardware beyond what any browser has.
- **Alternatives**: a 2D sprite swap (does not give the natural 3D tumble the owner asked for); keep Three.js just for the die (loses the size win and the graphics-support dependency).

## D5. Layout: one component, three arrangements (FR-019 to FR-024)

- **Decision**: Rework `match/MatchLayout.tsx` and `match/MatchView.tsx` with a `match-stage` grid:
  - Wide (from 900 px): two columns; the board left (fixed square), the right column holds the current-turn card (name with colour dot and the countdown), the die, Roll (and the move buttons when choosing), the game log, then the chat.
  - Phone portrait: the turn card and die in one row above the board, then the board at full width, then Roll and the move buttons, then the Game log and Chat sheet buttons (sheets stay as in 003).
  - Phone landscape (`orientation: landscape` and height under 520 px): the board takes the full height on the left; a slim right column holds the turn card, die and Roll; Game log and Chat remain buttons that open sheets.
- Player name bars are drawn as part of the board SVG at the four corners (text uses the existing display names and a clipped length), so they scale with the board.
- Board size uses the smaller of the available width and height (`min()` with `dvh`), always a square, so there is never sideways scrolling.
- **Rationale**: Matches the approved layout proposal and keeps the sheets, focus handling, announcements, countdown and away banner from 003.

## D6. Themes (FR-025)

- **Decision**: Keep `themes.ts` and `ludo-themes.css` (palette + board tints). Add per-theme decoration drawn as a few SVG shapes outside the 15 by 15 board area inside a slightly larger viewBox (for example pumpkins and bats, diyas, snowflakes, stars), plus a frame colour. Remove the 3D-only fields (`pawn`, `die`, `props`, `celebration`) from `ThemeRecord`. Update `ThemePreview` to mirror the new board with a pin.
- **Rationale**: Themes remain data plus a little decoration; no new assets are downloaded.

## D7. What is removed (FR-026)

- Delete `features/ludo/scene/**`, `features/ludo/quality/**`, `view/BoardView3D.tsx`, `view/ViewToggle.tsx`, `view/QualityControl.tsx`, the quality and 3D parts of `BoardView.tsx`, their styles and tests, and the `three` and `@types/three` dependencies.
- The old storage keys `myarena-ludo-quality` and `myarena-ludo-view` are no longer read; a small one-time cleanup removes them (or they are simply ignored). No error is possible either way.
- The Three.js rules in `build/budget.ts` stay (they guard against 3D code in the initial bundle); the Ludo lazy budget drops from 400 KB to 150 KB gzipped, which the redesign must meet.
- **Superseded 003 items**: R6 (dice drawing; the seeded throw stays), R7 (Three.js), UI contract sections 3 (board and die presentation), 6 (motion detail for the 3D scene), 7 (visual quality), and the 3D parts of 9 (themes).

## D8. Testing and delivery (lean)

- **Unit (Vitest)**: `hopPath` and hop timing, `dieTransform` for every face, placement unchanged, theme colours equal CSS, layout class selection, no pawn number text in the board, button-to-pawn highlight.
- **End to end (Playwright, Chromium)**: three viewport projects through one spec (laptop, phone portrait, phone landscape): board fully visible and no sideways scroll, die and name visible, one roll and one move end to end, the axe check, and a reduced-motion check. Existing 003 specs that touch the board DOM are adjusted, the 3D-only specs are deleted.
- **Not repeated**: full 4-bot load test and the clean-clone check run once at the end only if the server or build setup changes (they should not).
- **Speed**: tasks that touch different files are marked parallel; the long real-timer e2e test stays but runs only when asked; the new e2e spec uses the existing test-dice hook so no waiting for timers.
- **Review**: the owner reviews screenshots on a phone and a laptop (SC-001); real-device checks remain people tasks as in 003.

# Results: Ludo Visual Redesign (004)

Automated evidence from this machine (Windows, Node 24, headless Chromium). Real devices are not covered; see the last section.

| Check | Result |
| --- | --- |
| `eslint .` | Clean |
| TypeScript (`tsc -p apps/web`) | Clean |
| Unit tests (`apps/web`, 33 files) | All pass: hops, hop playback, die maths, board, layout, themes, budget, controls, sheets, timers |
| Production build | Pass |
| Ludo end-to-end specs (`ludo-*`, Chromium, 57 tests) | All pass: visual (4 screen sizes), dice, match, solo, a11y, themes, chat, recovery, tile |

## Build sizes (gzipped)

| Budget | Limit | 003 (3D) | 004 |
| --- | --- | --- | --- |
| Initial JavaScript | 200 KB | about 148.9 KB | about 148.9 KB |
| Ludo lazy chunks together | 150 KB (was 400 KB) | about 162 KB | about 16.6 KB (`ThemePicker` 11.57 with the online match code, `LudoSolo` 5.03) |
| Three.js in the build | none up front | lazy chunk of 147.53 KB | not present (dependency removed) |
| Tile picture | 100 KB | 5.36 KB | 5.36 KB |

## Requirement and criteria coverage

| Item | Evidence |
| --- | --- |
| FR-001 to FR-008 (board, pins, no numbers, highlight, name bars) | `ludo-board.test.tsx`, `themes.test.ts`, `ludo-visual.spec.ts` (no pawn text, tap areas of at least 44 px) |
| FR-009 to FR-012, SC-003 (hops) | `hops.test.ts`, `hops-playback.test.tsx`; frames of a live move reviewed by eye |
| FR-013 to FR-018, SC-002 (die) | `die-math.test.ts` (final face up for 6 faces by 200 seeds), `ludo-dice.spec.ts` (three viewers, same number within 1 s, settles within 3 s, skip is local), `ludo-visual.spec.ts` (reduced motion) |
| FR-019 to FR-024, SC-004 (layout) | `ludo-layout.test.tsx`, `ludo-visual.spec.ts` at 1280x800, 390x844, 320x640, 844x390 (board whole, no sideways scroll, also at 200% text, arrangement per size, axe) |
| FR-025 (themes) | `themes.test.ts`, `ludo-themes.spec.ts`, `ludo-a11y.spec.ts` (axe in every theme) |
| FR-026 to FR-028 (removal, compatibility) | No `three`, `scene` or `quality` code left; `ludo-layout.test.tsx` (old saved choices ignored); solo, recovery and chat specs unchanged and passing |
| SC-006 (smaller, no graphics dependency) | Table above; the board and die use only SVG and CSS |

## Known limits

- On a phone on its side the page header sits above the board, so the page can scroll a little vertically; the board itself is never cropped.
- Not measured here: frame rate on the acceptance phones (SC-008), the real-device matrix, and the owner or new-player checks (SC-001, SC-005). These stay manual.
- Review screenshots are in `screenshots/` (laptop, phone portrait, narrow phone and phone landscape, Classic and Halloween).

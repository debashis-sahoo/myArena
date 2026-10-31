# UI Contract: Ludo Visual Redesign

Replaces 003 `ui-contract.md` sections 3 (presentation parts), 6, 7 and the 3D parts of 9. Everything else in 003's contract (settings in the lobby, solo screens, announcements, storage of other keys) stays.

## 1. Board (all layouts)

- One flat board, square, never cropped, never scrolled sideways; 320 px up to very wide.
- Elements: four corner frames with white yards and four slots each; white track with grid lines; coloured start squares and home lanes; entry arrow on the edge square in front of each colour's home lane (thin, in the colour, pointing in); four centre triangles; outlined stars on safe squares; each player's name in the thick outer edge of their corner block (the label of the player whose turn it is is white); the board fills its square edge to edge with rounded corners; theme decoration on the outer edges of the corner blocks (none in Classic).
- Pawns: pins with a ring in the player's colour and a head mark (circle, triangle, square, diamond). No number is drawn. Pawns sharing a square are spread and scaled as in 003.
- Movable pawns (viewer's own, die settled) have a pulsing ring and a tap area of at least 44 by 44 CSS pixels; pressing one equals pressing its move button.
- Test hooks: board `data-theme`, `data-die-face` (empty while rolling), each pawn `data-pawn="seat:pawn"`, name bars `data-seat`, the active bar `data-active="true"`.

## 2. Move buttons and the link to pawns

- Buttons keep the 003 text (they name the pawn number, the start and the effect).
- Pointer-enter, focus and touch-hold on a button add `data-highlight` to the matching pawn and lift it; leaving or blurring removes it. Nothing else changes.

## 3. Die

- A glossy white rounded cube with black pips, shown on a tilted tray with a soft shadow.
- Rolling: tumbles and bounces from the shared seeded throw, settles within 3 s, shadow follows height.
- Settled: shows the decided face; `data-die-face` set; result announced once on settling (003 behaviour).
- Reduced motion or effects off: settled face at once. "Skip animation" shows it at once for that viewer only. No pawn can be chosen while rolling.
- The die is decorative (`aria-hidden`); the number is in the status line and the announcements.

## 4. Match layout

| Mode | Arrangement |
| --- | --- |
| Wide (from 900 px) | Left: board. Right: turn card (name, colour dot, time left), die, Roll (and move buttons), game log, chat. |
| Phone portrait | Top: turn card and die in one row. Then the board at full width. Then Roll and move buttons. Then Game log and Chat buttons (sheets as in 003). |
| Phone landscape (under 520 px high) | Left: board at full height. Right: slim column with turn card, die, Roll; Game log and Chat buttons open sheets. |

- Focus, announcements, countdown, away banner, result panel and error line keep their 003 behaviour in every mode.
- Every control is at least 44 by 44 CSS pixels; text at 200% never overlaps or scrolls sideways.

## 5. Settings and storage

- No visual quality or view controls anywhere (lobby, solo set-up, match).
- Keys `myarena-ludo-quality` and `myarena-ludo-view` are never read; stored values do not cause errors.
- Theme choice and everything else in 003 section 8 is unchanged.

## 6. Themes

Same five themes and ids. Each defines the four player colours, board tints (`surface`, `cell`, `line`, `ink`), a frame colour and its decoration. The four player colours must stay clearly different from each other and from the board.

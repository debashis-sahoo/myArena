# Contract: Ludo UI

> **Superseded by feature 004 (Ludo visual redesign):** sections 3 (board and die presentation), 6 (3D motion detail), 7 (visual quality) and the 3D parts of 9 (themes) are replaced by `specs/004-ludo-visual-redesign/contracts/ui-contract.md`.

States, semantics and storage for the screens this feature adds or changes. Visual design (exact
colours, materials, art) is decided during implementation and judged by the review in spec SC-005
and SC-016; this contract fixes only what tests and assistive technology rely on.

## 1. Games page: Ludo tile and options header

- The Ludo tile shows the picture named by `art.image = LUDO` in a banner area at the top of
  the tile. The area has a fixed aspect ratio, so the tile does not change size when the picture
  loads (FR-050).
- The picture is an `<img>` with an empty `alt`, because the tile's name, status and details are
  its accessible name (002 tile rules are unchanged: `aria-labelledby` over title, status and
  details). A picture never carries information that is not also text (FR-049).
- If the image fails to load (`error` event) the banner is replaced by the 002 icon art for the
  same entry. No broken-image icon is ever visible.
- The options header of the selected game uses the same picture at the small `mini` size.
- The text and details are rendered in the first paint; the picture is decoded asynchronously.
- The picture is a single file shipped by the web app, 100 KB or less, scales as a vector, and
  works on both light and dark surfaces (it paints its own rounded card background).
- Entries with no `art.image` look exactly as in 002.

## 2. Lobby: Ludo settings

Shown instead of the generic settings list when the selected game is Ludo (online game module).

- **Host and editable (lobby)**: a theme picker as a radio group named "Theme", one option per
  theme with a preview and a short name; a "Turn time limit" radio group (30 seconds, 60 seconds
  default, 90 seconds, No limit); the existing "Maximum participants" control bounded to 2 to 4.
  Changes use the existing `settings.update` intent.
- **Everyone else, or during a match**: read-only lines "Theme: Diwali" and "Turn limit: 60
  seconds".
- Previews are small static pictures drawn from theme data; no 3D code is loaded in the lobby
  (FR-020).
- Radio groups follow native semantics, arrow keys move between options, and the selected value
  is announced. Errors from the server appear in a `role="alert"` below the group.

## 3. Match screen (online)

Layout, wide screens (at least 900 px): a two-column grid. Left, the match area: status bar, the
board, the controls. Right, a column with the game log above the chat. The member list stays in
the room page above or beside as in 001.

Layout, phones and narrow screens: the board fills the width, the controls sit directly below
it, and the game log and the chat open from two buttons ("Game log", "Chat") that show an unread
count while closed. Opening one never hides the whole board (it opens as a bottom sheet limited
to about half the height).

Regions, in tab order: status bar, board and controls, view and quality buttons, game log,
chat, then the existing member list and match controls.

### Status bar

A `role="status"` line states the phase in plain words, for example "Your turn: roll the die",
"Sam is rolling", "Choose a pawn to move", "Sam rolled a 4", the countdown when a limit applies,
and the away notice. It is polite live and is the main screen reader announcement.

### Controls

| Control | Semantics | Behavior |
|---------|-----------|----------|
| Roll | `<button>` "Roll the die" | Enabled only on the sender's turn in phase `ROLL`; sends `roll` |
| Pawn chooser | A group "Choose a pawn" of `<button>`s, one per legal pawn, at least 44 by 44 px | Each name says the pawn, where it is and what the move does, for example "Pawn 2, 14 steps from start, move 4 to a protected star square" or "Pawn 3, move 4 and capture Alex's pawn"; sends `move` |
| Board pointer | Pressing a highlighted pawn on the board | Same as its chooser button; the hit area is at least 44 by 44 px on screen |
| Skip animation | `<button>` "Skip animation" | Shown only while a roll is animating; this viewer only |
| View | Toggle button "Top-down view" (pressed state) | Switches the angled and flat camera; remembered |
| Visual quality | Menu or radio group: Automatic, High, Standard, Lite | Applies at once; remembered |
| I'm back | `<button>` | Shown only when the viewer's seat is away; sends `resume` |

Keyboard: the Roll button and the chooser buttons are ordinary tab stops with a visible focus
ring. When the phase changes to the viewer's `MOVE`, focus moves to the first chooser button;
when it changes to the viewer's `ROLL`, focus moves to the Roll button; otherwise focus is never
moved by the game. No action needs a pointer or a gesture.

### Board

- 3D renderer (quality high or standard): a `<canvas>` with `role="img"` and an accessible name
  such as "Ludo board, angled view", plus a visually hidden **board description** (section 5).
- Lite renderer: an SVG board, flat, with the same hidden description. Pawns and squares are
  drawn with colour, a distinct shape mark per colour, the pawn number, and star and start
  markers, so colour is never the only cue (FR-025).
- Both renderers expose `data-render-state` on the wrapper (`loading`, `ready`, `fallback`) and
  `data-die-face` (the settled number, or empty while rolling) so tests can read them without
  pixel inspection.
- The wrapper never overflows its parent; the canvas resizes with its parent (down to 320 px
  wide) and re-lays out on rotation.
- Loading: a placeholder with `role="status"` ("Preparing the board") shows until the scene is
  ready; the match is playable through the chooser buttons while it loads.
- Failure (no WebGL, lost context twice, or the engine fails to load): the lite renderer takes
  over with a one-time notice "Switched to the simpler board so you can keep playing".

### Result

When `winner` is set: a panel with the winner, the pawns home for each seat, and for online
matches the room's existing rematch and back-to-lobby buttons. Announced politely and focus
moves to the panel heading.

### Waiting member

A member whose view is `WAITING` sees "A Ludo match is in progress. You will be able to join the
next one." and the chat. No board is rendered.

## 4. Solo screens

Route `/play/ludo/solo` (the 002 solo registry entry for `ludo`).

1. **Setup**: "Opponents" radio group (1, 2, 3), "Difficulty" radio group (Easy, Normal default,
   Hard), "Theme" picker (same component as the lobby), a primary "Start game" button and a
   "Back to games" link. The last choices are remembered.
2. **Match**: the same status bar, board, controls and log as online, with no chat, no turn
   countdown and no away behavior. The computer's turn shows "Computer 2 is choosing" for a
   short pause, then its roll and move play. "Resume" is not shown.
3. **End**: the result panel with "Play again" (same settings) and "Back to games".
4. **Restore**: reopening the page within 30 minutes of the last move restores the match exactly;
   after that it is discarded and setup is shown. A visible "Leave match" action discards it at
   once.

## 5. Board description and announcements

The hidden description is a list, in turn order, of each seat: "Red, Alex (you), 2 pawns in base,
1 pawn 14 steps from start, 1 pawn home", with away and left marks, followed by the current
phase. It updates whenever `state` changes.

Announcements (polite live region, never more than one per state change, queued in order):
turn changes, each roll result, each move ("Alex moved pawn 2 from 14 to 18 steps and captured
Sam's pawn"), automatic plays, away and return, a seat leaving, and the result. Roll results are
announced when the die settles, not at the start of the animation.

## 6. Motion and effects

- With reduced motion requested, or platform effects off: no tumbling, no camera movement, no
  pawn travel and no celebration. A roll shows the result face immediately and the status line
  says it. A move shows the pawn at its destination. Nothing relies on motion to be understood.
- The lite quality uses the same still presentation by default and a simple fade otherwise.
- Skipping a roll ends its animation at once and shows the settled face for that viewer only.
- Pausing: when the page is hidden, rendering stops; when it is visible again the current
  `state` is drawn without replaying past events.

## 7. Visual quality

| Level | What it does |
|-------|--------------|
| High | Soft shadows, reflections from a built-in studio environment, clearcoat and detailed pawns, device pixel ratio up to 2, theme props and celebration |
| Standard | Smaller shadow map, fewer reflections, device pixel ratio up to 1.5, simpler props |
| Lite | The SVG board, no 3D at all, flat die and a still reveal |

Automatic picks a level from the device (memory, cores, pixel ratio, touch) at the start of a
match, and moves down one level when the measured frame time stays above the budget for about
two seconds of animation. It never moves up by itself. A manual choice always wins.

## 8. Storage (browser, this device only)

| Key | Value | Notes |
|-----|-------|-------|
| `myarena-ludo-quality` | `auto`, `high`, `standard`, `lite` | Default `auto` |
| `myarena-ludo-view` | `angled`, `top` | Default `angled` |
| `myarena-ludo-solo-setup` | `{ opponents, difficulty, theme }` | The last solo choices |
| `myarena-ludo-solo` | `{ savedAt, settings, state }` | The solo match, discarded 30 minutes after `savedAt` and when the match ends or is left |

No display name, room code, token or other person's data is stored. The 002 keys are unchanged.

## 9. Themes

Five themes, each defined as data (id, name, short description, palette, material settings,
board and pawn styles, die style, scene props, celebration) separate from the code that draws
them, so adding or retiring one does not touch the rules (FR-024).

| Id | Name | Direction |
|----|------|-----------|
| `classic` | Classic | Polished wood board, glass and brass pawns, warm studio light |
| `super-heroes` | Super Heroes | Original heroic look: steel and bold primaries, shield-and-star style emblems, comic-style highlights; no names, logos or likenesses of any film or comic characters |
| `halloween` | Halloween | Dark slate and candle light, pumpkin and bat props, glowing pawns |
| `diwali` | Diwali | Deep festive colours, brass, diyas and rangoli patterns, warm lamp light and sparkles |
| `winter` | Winter Holidays | Frosted wood and ice, snow and pine props, soft cool light |

A theme never changes the path, the protected squares, the pawn count, or the information shown.
Every theme keeps the shape marks, pawn numbers and star and start markers of section 3.

# Phase 0 Research: Responsive Ludo Game Module

All unknowns are resolved here. No `NEEDS CLARIFICATION` items remain. Platform facts come from the existing Platform Core
([specs/001-platform-hub-rooms](../001-platform-hub-rooms/plan.md)) and its code.

## R1. How to render "3D" pawns and dice

- **Decision**: Keep the board a 2D DOM/CSS grid and render pawns and the die with **CSS 3D transforms and layered SVG/CSS lighting**
  (no WebGL, no 3D library). The die is a real six-faced CSS cube (`transform-style: preserve-3d`) with pips on each face; pawns are
  inline SVG (sphere head, tapered body, base ring) with radial-gradient gloss, plus a separate shadow ellipse. Motion uses the Web
  Animations API (`element.animate`).
- **Rationale**: The constitution calls for a polished 2D board and the spec says 3D "look" is enough ("a true 3D scene is not
  required"). CSS transforms are GPU-accelerated on phones, add no bundle weight on the free plan, and allow genuine face-accurate
  die rotation. The previous project history shows a heavyweight 3D scene was later removed in favour of flat board + CSS 3D die,
  which supports this choice.
- **Alternatives considered**: three.js or a canvas engine (large bundle, harder responsive text and accessibility, more battery use);
  pre-rendered sprite sheets (not resolution independent, poor for per-colour variants); animated GIF/Lottie (not physical, not
  interactive).

## R2. Board geometry (the authoritative layout)

Coordinates are `[row, col]` on the 15 x 15 grid, zero-indexed from the top-left. Pawns move **clockwise**.

- **Corner bases** (6 x 6 each): Yellow top-left (rows 0-5, cols 0-5), Green top-right (rows 0-5, cols 9-14), Red bottom-left
  (rows 9-14, cols 0-5), Blue bottom-right (rows 9-14, cols 9-14). Each base has an inner white square and four pawn spots.
- **HOME**: the central 3 x 3 (rows 6-8, cols 6-8), drawn as four triangles in the four colours.
- **Shared ring (52 squares)**, indexed 0 to 51 clockwise starting at Yellow's start square:

  | Index | Squares |
  |-------|---------|
  | 0-4 | (6,1) (6,2) (6,3) (6,4) (6,5) |
  | 5-10 | (5,6) (4,6) (3,6) (2,6) (1,6) (0,6) |
  | 11-12 | (0,7) (0,8) |
  | 13-17 | (1,8) (2,8) (3,8) (4,8) (5,8) |
  | 18-23 | (6,9) (6,10) (6,11) (6,12) (6,13) (6,14) |
  | 24-25 | (7,14) (8,14) |
  | 26-30 | (8,13) (8,12) (8,11) (8,10) (8,9) |
  | 31-36 | (9,8) (10,8) (11,8) (12,8) (13,8) (14,8) |
  | 37-38 | (14,7) (14,6) |
  | 39-43 | (13,6) (12,6) (11,6) (10,6) (9,6) |
  | 44-49 | (8,5) (8,4) (8,3) (8,2) (8,1) (8,0) |
  | 50-51 | (7,0) (6,0) |

- **Start squares** (ring index): Yellow 0 at (6,1), Green 13 at (1,8), Blue 26 at (8,13), Red 39 at (13,6). They are 13 apart.
- **Safe squares** (8): the four start squares plus the star square 8 squares after each start: indexes 8 (2,6), 21 (6,12), 34 (12,8),
  47 (8,2).
- **Home lanes** (5 squares each, last square adjacent to HOME): Yellow (7,1) to (7,5); Green (1,7) to (5,7); Blue (7,13) to (7,9);
  Red (13,7) to (9,7).
- **Pawn progress** is the number of squares a pawn has advanced from its start square, which makes every colour identical:
  `-1` in the base; `0` to `50` on the ring (ring index = `(startIndex + progress) mod 52`; progress 50 is the square just before the
  lane entrance); `51` to `55` the five home-lane squares; `56` HOME. A pawn needs exactly `56` to finish, so moving a pawn from
  progress `p` by a roll `N` visits `N` squares and is legal only if `p + N <= 56`. Leaving the base needs a 6 and puts the pawn on
  progress `0`.
- **Why 56**: from the start square the pawn goes 50 squares around the ring to the square beside its own lane entrance, then into the
  five lane squares and HOME. The ring square just before the start square is skipped by that colour (it is only used by others).
- **Capture**: only landing on a ring square (progress 0 to 50) can capture. If that ring square is not safe, **all** pawns of other
  colours standing there are sent to their bases. Passing over a pawn never captures.
- **Pawn spots in the bases** (grid-line coordinates `[x, y]` = [column, row] centres): Yellow (2,2) (4,2) (2,4) (4,4); Green
  (11,2) (13,2) (11,4) (13,4); Red (2,11) (4,11) (2,13) (4,13); Blue (11,11) (13,11) (11,13) (13,13).

The geometry lives in one shared module so server rules and client drawing cannot disagree.

## R3. Authority, pacing, and how clients stay in sync

- **Decision**: The server runs one **match state machine** per room and is the only source of dice results, turn changes, and move
  validity. After every step it broadcasts a `game:event` that carries (a) what happened, with the exact hop path, and (b) the complete
  resulting `LudoState` snapshot. Clients keep an **animation queue**: they animate an event from the state they currently display to the
  state in the event, then show the event's state. If more than three events are queued (tab was hidden, slow device) or the client has
  just joined or reconnected, it **skips animations and shows the latest snapshot**.
- **Pacing**: the server uses the same fixed durations as the client (`shared/src/ludo/timing.ts`), so it never starts the next step
  before clients have finished showing the previous one: tumble 1.4 s, hop 0.34 s per square, capture bounce 0.9 s, bot pause 1.5 s.
  The 15 s countdown for each action starts only after the preceding animation is due to finish; its remaining time is sent as a
  duration (`remainingMs`), not a clock time, so client clock differences do not matter.
- **Alternatives considered**: client-side simulation with server verification (invites divergence and cheating, violates the
  constitution); sending only snapshots and diffing on the client (cannot reconstruct the hop path or the captured pawns reliably);
  server waiting for client "animation done" acknowledgements (one slow or hidden tab would stall the table).

## R4. Turn timer, missed turns, and "away" removal

- **Decision**: One server timer per match. Phase `roll` and phase `choose` each get 15 s. On expiry the server plays the action
  (roll; or choose the best eligible pawn by the same priority list the bots use) and marks the turn **missed** for that player. A
  manual action sets that player's missed count to 0. At missed `2` the state flags `warning` (shown on that player's screen and
  announced in the activity log); at missed `3` the engine asks the platform to release the seat (`ctx.releaseSeat`), which removes
  the pawns, announces it, and removes the player's seat like a leave.
- **Rationale**: Directly implements the clarified rule; per-match, in-memory, one `setTimeout` at a time, so it is cheap on the free
  plan and cleared when the room closes.

## R5. Bots

- **Decision**: A bot is a seat with `kind: 'bot'`. The engine treats a bot turn as: wait 1.5 s, roll (server dice), wait about 0.7 s
  after the tumble, choose a pawn by priority, move. Priority (first match wins): finish a pawn (reach HOME); capture; leave the base on
  a 6; move a pawn that is in danger (a non-safe ring square with an opponent 1 to 6 squares behind it); land on a safe square;
  otherwise advance the pawn with the greatest progress (closest to HOME). The timer's auto-play uses the same list. Bots post commentary through a new platform call that speaks as that
  bot (`ctx.say`).
- **Rationale**: Matches the spec's "realistic human pacing" and keeps bots under exactly the same validation as humans (they call the
  same internal `roll` and `move` functions). A small phrase pool per event (6 variants) avoids robotic repetition.

## R6. Platform changes required (Platform Core)

The Ludo spec needs five things the placeholder contract does not offer. They are small, game-agnostic, and keep the room engine
reusable (constitution Principle IV).

1. **Game context**: `GameEngine.createMatch(seats, ctx)` where `ctx` offers `schedule(ms, fn)` (timers cleared on close), `emit(event)`
   (broadcast a game event with a snapshot), `say(playerId, text)` (chat as a bot), `releaseSeat(playerId, reason)`, and `log` for
   structured logs.
2. **Colour assignment at start**: `GameEngine.assignColors(seated)` returns `playerId -> colour` and the room applies it before
   `createMatch` (needed because 2 players are Yellow and Blue). The room recolours seats so the lobby list, chat tags, and panels all
   agree after the start; earlier chat messages keep their original colour snapshots.
3. **Action pipeline**: the reserved `game:action` event becomes real: schema-validated, rate limited, routed to
   `engine.onAction(match, playerId, action)`; the playerId always comes from the socket's room membership, never from the payload.
4. **State delivery**: `game:event` (broadcast) and `game:state` (full snapshot, sent in the join/resume acknowledgement and on demand).
5. **Server-initiated release**: `ctx.releaseSeat` removes a still-connected player (for the 3 missed turns rule) and tells that player
   with `player:removed` carrying `reason: 'inactive'` so the client shows the right screen.
6. **Match screen hook**: the client registry may provide a full-screen `MatchScreen` for a game; the room shell uses it while the match is
   in progress, and otherwise keeps the generic stage. Ludo supplies one; the shared chat, lobby, and invite components are reused.

Also: Ludo's `seatColors` become `yellow, green, blue, red` in `shared/src/games.ts`.

## R7. Responsive layout and "always maximised" board

- **Decision**: Two layouts chosen by orientation, with a third rule for short screens.
  - **Landscape (two columns)**: `[ board | dice + player bubbles + chat dock ]` as a CSS grid under a fixed-height header. The page is
    `100dvh`, nothing scrolls. The board wrapper is `min-width: 0; min-height: 0` and a `ResizeObserver` measures it; the board is
    `side = floor(min(width, height))` pixels, set as a CSS variable so every size inside (pawns, hop height, fonts) scales from it.
    The right column (width `clamp(336px, 28vw, 430px)`) stacks the dice console, a row of circular player bubbles, and the chat dock,
    which takes the remaining height and has a Minimize / Open bar; its open state persists in `localStorage`. The earlier
    three-column design (chat left, resizable) was replaced because chat under the dice keeps everything the player needs in one place
    and gives the board the former chat width.
  - **Portrait (stacked)**: header, board (`side = min(containerWidth, 85dvh)`), dice section (die left, turn info right), player bubbles
    row; chat and activity live in a bottom "peek" drawer (collapsed handle about 56 px, expanded about 58% of the height) like the
    platform's chat drawer.
  - **Short screens** (landscape height <= 520 px, portrait height < 700 px): the dice console uses the single-row form with a 64 to 72 px
    die, and the bubbles shrink; the landscape chat dock starts minimized.
- **CSS**: the board is `display: grid; grid-template: repeat(15, 1fr) / repeat(15, 1fr); aspect-ratio: 1 / 1; width: var(--board);` so
  it is always square; pawns live on an overlay layer positioned in percentages of the board.
- **Rationale**: Measured pixel sizing (rather than only `vmin`) is exact for a layout where the right column and chat dock change the
  space left for the board, and a
  JS-free fallback (`width: min(100%, 85dvh)` in portrait, `min(100%, 100%)` heights in landscape) keeps the first paint correct.
- **Success checks**: SC-001 to SC-003 are verified by measuring the board rectangle against the available rectangle in the browser.

## R8. Dice: making the roll feel physical

- **Decision**: A CSS 3D cube in a tray. Each face is three stacked rounded slabs (the pip slab plus two smaller slabs set deeper), which
  bevels the edges and corners into a rounded die. A roll is a precomputed keyframe animation (WAAPI) of about 1.4 s:
  1. **Throw** (0 to 0.2 s): scale up slightly, lift, begin spinning, mainly about the vertical axis in the travel direction.
  2. **Tumble and bounce** (0.2 to 1.1 s): three decaying bounces (heights about 100%, 45%, 18% of the tray height) with rotation
     speed decaying; the die travels about 30% of the tray width from a random side and slows to a stop (direction and forward-tumble
     sign are random per roll); the shadow ellipse shrinks and fades as the die rises and returns on each landing.
  3. **Settle** (1.1 to 1.4 s): final small roll onto the target face; the cube's end rotation is the exact orientation for the server
     result, so the shown face is always correct.
  - Motion blur: a CSS `filter: blur()` that eases from 0 to 3 px during fast spin and back to 0. Camera shake: the console wrapper
    translates a few pixels with decay at each landing. The die never decides the result; the animation takes the result as input.
  - Face orientations (rotateX, rotateY) for 1 to 6 are a fixed lookup so the end state matches the pips.
- **Reduced motion**: skip the tumble; fade to the result face with a 200 ms scale pulse, no blur, no shake.
- **Sizes**: die edge is `clamp(96px, 11vmin, 168px)` on desktop, `clamp(80px, 11vw, 112px)` in portrait, 72 to 112 px on phones and 64 px
  in the compact tiers, so the 96 and 64 px minimums hold.
- **Rolling inputs**: the die button, the ROLL DICE button, and the spacebar (only when no text field is focused) all call the same
  `roll()` that sends one `game:action`; further inputs are ignored while a roll is pending.

## R9. Pawn hop animation

- **Decision**: Each move event carries `path`: the ordered list of squares entered (one per hop). The client animates the pawn with a
  chain of WAAPI animations, one per hop (about 340 ms each):
  - Outer element: linear translation to the next square centre.
  - Inner element: a parabolic arc (`translateY` up to about 0.9 cell height, ease-out then ease-in) with **squash-and-stretch**
    (`scaleY`/`scaleX`) on take-off and landing; the shadow element shrinks while airborne.
  - On each landing: a dust puff (a small radial ring and 3 to 5 particles, 450 ms, removed from the DOM after) and the landed square is
    briefly lit.
  - The route is highlighted ahead of the pawn (the remaining path squares glow) from the moment the move starts until it lands.
  - Capture: the captured pawn lifts, spins, and bounces along an arc back to its base spot (about 0.9 s) with a burst; the capture is
    announced.
- **Hit areas**: every pawn gets an invisible hit area of at least 40 px (centred on the pawn) so phone taps are reliable even when a
  square is about 24 px; eligible pawns win hit tests over non-eligible ones. When two of my eligible pawns share a square, they are
  equivalent moves, so the first one moves; no chooser is needed.
- **Stacking**: pawns on one square are laid out in a small grid with an offset and a reduced scale so they stay distinct.
- **Reduced motion**: pawns step square to square with a 120 ms linear move and a landing highlight; no arc, puff, squash, or bounce
  (capture shows a quick fade to base).

## R10. Controlled dice and scenarios for development

- **Decision**: Three development-only variables, read only when `NODE_ENV` is not `production` and ignored (with a startup warning if
  set) in production, so no client or environment can influence real results:
  - `LUDO_DEV_DICE` (for example `6,6,4,6,3,2,6`): die values used in order across all rolls (humans and bots), then random dice resume.
  - `LUDO_DEV_SCENARIO=endgame`: at match start each player has three pawns on HOME and one pawn at progress 50 (so an exact 6 finishes
    it, smaller rolls walk into the lane), for quick checks of exact finish, the home celebration, and the winner screen.
  - `LUDO_TURN_MS` (for example `3000`): replaces the 15 s countdown, for quick checks of auto-play, the warning, and removal.
- **Rationale**: Visual verification of captures, safe squares, the three-sixes rule, exact finishes, wins, and timeouts needs repeatable
  situations; waiting for random dice or 15 s timers would make browser-based verification slow and unreliable.

## R11. Chat and activity UI

- **Decision**: Reuse the platform `ChatPanel` for chat (a game must not rebuild chat). Add a game-owned `ActivityLog` and a two-tab
  container (Chat | Activity) used both by the landscape chat dock (under the dice and player bubbles, with a Minimize / Open bar) and by the
  portrait peek drawer, with an unread count on the minimized bar or collapsed handle for chat. Activity entries come from `LudoState.activity` (last 100) plus each event's new entry.
- **Bot commentary** is real chat (kind `player`, sender = the bot, in its colour) so it appears in the Chat tab and in history.

## R12. Reconnection and late joiners

- **Decision**: The join/resume acknowledgement now includes the current `game` snapshot when a match is running; the client renders it
  at once with no replay. Everything else (timer remaining, whose turn) is inside the snapshot. If a socket drops during a tumble or
  hop, on return the client discards its queue and shows the latest state.
- **Why safe**: the server keeps no per-client animation state, so any client can arrive at any time.

## R13. Performance on phones and the free plan

- 16 pawns, one die, one overlay: animations use transforms and opacity only (compositor friendly); particles are limited to 5 per
  puff and removed after use; `will-change` is applied only while animating. Bundle growth is expected to be small (no new
  dependencies). Server cost is one timer per match and a few small JSON events per move (well under 2 KB), negligible for 50 rooms.
- Smoothness target (SC-014): no long main-thread tasks during hops; verified by watching a 4-player match on a throttled mid-range
  profile in the browser.

## R14. Accessibility, input, and reduced motion

- Die and pawns are real `button` elements (pawns only focusable when eligible) with labels ("Yellow pawn 2, 7 squares from home");
  a polite live region announces turn changes, rolls, captures, and wins; focus rings reuse the platform control styles; the spacebar
  roll handler ignores key events from inputs and when a modal is open. `prefers-reduced-motion` is honoured as described in R8 and R9,
  and all state remains visible without animation.

## R15. Testing approach (user policy + constitution)

- **Decision**: No automated unit or integration suites for this feature. Verification is direct, browser-based play recorded in
  `verification.md` using development dice for repeatable situations, plus a regression run of the existing `npm run smoke` after the
  platform changes (an existing check, not a new suite). Visual checks follow the constitution's device matrix.

## R16. Render and operations

- No new services or storage. Match state is in memory like rooms; a restart ends matches with the existing "room ended" screen. The
  Socket.IO heartbeat plus per-turn timers keep traffic flowing on the free plan. Structured logs gain match events at info level
  (match started, turn timeouts, seat released for inactivity, match finished).

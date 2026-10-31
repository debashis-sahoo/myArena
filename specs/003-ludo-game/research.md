# Research: Ludo

> **Superseded by feature 004 (Ludo visual redesign):** R6 (how the die is drawn; the seeded throw stays), R7 (Three.js) and R8 (visual quality, the lite renderer) no longer apply. See `specs/004-ludo-visual-redesign/research.md`.

Decisions that settle the open questions in the plan's Technical Context. There are no unresolved
`NEEDS CLARIFICATION` items. Where a decision departs from a statement in an earlier feature, that
is called out.

## R1. How a game talks to its room: a generic game channel

- **Finding**: The platform today has no path for game traffic. `MatchManager.submitAction` and
  `RoomService.submitGameAction` exist, but no WebSocket intent reaches them, the room snapshot
  carries only the lobby, and `MatchContext` offers no way to send state. A server-authoritative
  Ludo (Principle IV) cannot work without one.
- **Decision**: Add a generic channel to the existing WebSocket: one client intent `game.action`
  and one server message `game` (plus an optional `game` field on `snapshot`). The SDK gains
  `publish`, `viewFor`, `onParticipantLeft` and `releaseMatch`. Details in
  [contracts/game-channel.md](contracts/game-channel.md).
- **Rationale**: Reuses authentication, origin checks, idempotency (`clientActionId`), rate limits
  and reconnection already proven in 001. The platform stays free of Ludo rules (Principle VIII),
  and Snakes & Ladders and Tambola can use the same channel later.
- **Alternatives considered**: A Ludo-specific endpoint or second socket (duplicates
  authentication and recovery, and breaks reconnection as one unit). Encoding game state in room
  events and `version` (every roll would bump the room version, and snapshots would need a game
  schema in the platform). Polling (slow, wasteful, and loses the live feel).

## R2. Full state per update, events only for animation

- **Decision**: Every `game` message carries the recipient's complete `state` plus a short
  `events` list. State is authoritative; events only drive animation and announcements.
  Messages carry `matchId` and `seq`; a client keeps the highest `seq` of the current `matchId`.
- **Rationale**: The Ludo view is a few KB, so full replacement is cheap and removes whole
  classes of bugs (missed or reordered messages, reconnect gaps, a joiner during a roll). It
  delivers spec FR-015 and FR-035: whoever returns sees the settled state, never a stale die.
- **Alternatives considered**: Deltas with contiguous versions (needs resync logic and gap
  handling for little saving at this size). Events only (a reconnecting client would have to
  replay history).

## R3. One pure rules engine shared by server and solo

- **Decision**: A new workspace package `packages/ludo` holds the board geometry, the rules, the
  auto-play preference and the computer strategies as pure functions. Dice values and seeds are
  arguments. The server's match runner and the web's solo runner both call it; the web
  renderers import only its types and geometry.
- **Rationale**: Principle IV allows solo to run locally, and Principle VIII says a game owns its
  rules and solo mode. One engine means online and solo cannot disagree, and it can be tested
  exhaustively without sockets or timers. SC-002 and SC-014 are then property and scenario tests
  on one module.
- **Alternatives considered**: Rules inside the server game module with solo calling the server
  (needs a server session per solo match, contradicting "no room, no account" and local play).
  Duplicating the rules in the web app (two copies, drift).

## R4. Rule and timing defaults the spec left open

The spec fixes the classic rules; these remaining details are decided here, and each is testable.

| Topic | Decision | Reason |
|-------|----------|--------|
| First player | Random, from the server's generator (solo: the visitor's) | Clarified answer; fair and uninfluenced |
| Path encoding | Steps: -1 base, 0 start, 1 to 50 ring, 51 to 55 lane, 56 home | One number per pawn; renderers and tests share it |
| Blocks | Two or more same-seat pawns on an unprotected ring square; opponents may pass but not land | Clarified answers |
| Captures | Exactly one opponent pawn, on an unprotected ring square | Follows from blocks |
| Extra roll | A 6, or a capture; not for reaching home | The spec lists only these |
| Decision timer | One timer per decision (roll, then move), restarted at each | Simple, fair, and predictable for the countdown |
| Missed turn | One timeout of a decision counts once; any manual action resets the count | "Misses three turns in a row" needs one clear counting rule |
| Leaving "away" | An explicit "I'm back" action (`resume`), or any manual roll or move | With immediate auto-play a person otherwise never has a moment to act |
| Seat leaves | Pawns removed, turn passes, last seat standing wins | Spec FR-011 |
| No limit and a disconnected player | The match waits; the platform's 10-minute recovery window ends it by releasing the seat | No new rule; stated so testers expect it |
| Computer thinking time | 700 to 1500 ms, within a 3 s total | Spec FR-043 |

## R5. Randomness and testability

- **Decision**: Server dice, animation seeds and the first player come from `node:crypto`
  (`randomInt`). Solo uses `crypto.getRandomValues` in the browser. The die source is an
  interface; tests inject a scripted or seeded source. A scripted sequence can be enabled for
  e2e through an environment setting that start-up refuses whenever `NODE_ENV=production`
  (including on preview deployments), so it can never weaken real play.
- **Rationale**: Principle IV and spec FR-007. Rejection of the setting in production follows the
  existing guard pattern (`TEST_GAME_SECONDS`) but is stricter, because rolls decide wins.
- **Fairness evidence**: A unit test draws at least 6,000 values and asserts every face is
  between 15% and 18.5% (SC-003), and a second test checks that first-player choice is spread
  across seats.

## R6. Dice roll that looks natural and always ends on the decided face

- **Decision**: Do not simulate physics at run time. Each client builds the throw
  deterministically from the event's `seed`: it first fixes the final resting orientation (the
  decided face up, with a seeded turn about the vertical axis), then builds the path backward as
  a ballistic arc with two to four bounces off the tray floor and walls with damped heights,
  while a seeded spin about a slowly changing axis decays to zero at the end of the last bounce.
  The orientation at time `t` is the final orientation composed with that decaying spin.
- **Rationale**: Guarantees the exact face with no correction jump (spec FR-014), identical
  motion on every device from one seed (FR-015), natural variation from roll to roll (FR-013),
  no physics library to download (smaller, CSP-safe, no WebAssembly), and a hard bound on
  duration (SC-004). Bounce sounds are out of scope (no audio).
- **Alternatives considered**: Real-time rigid-body physics on each client (different results on
  different devices, needs a correction step, large dependency). Server-run physics streamed to
  clients (bandwidth and latency for no gain). Pre-recorded clips per face (repetitive).
- **Reduced motion and skip**: The same seed path is skipped: the final orientation is drawn
  directly, and the status line states the number.

## R7. 3D engine: Three.js, loaded only when a match starts

- **Departure from 001**: 001 expected Babylon.js to be lazy-loaded by game features and wrote
  that expectation into the build budget check. This feature chooses Three.js instead.
- **Decision**: Use Three.js (tree-shaken imports only) in a separate lazily loaded chunk that is
  requested when a Ludo match screen mounts. The build budget check is generalized: no 3D engine
  (Three.js or Babylon.js) may appear in a non-lazy chunk, the combined Ludo lazy chunks must stay
  within 400 KB gzipped, and the initial 200 KB limit is unchanged.
- **Rationale**: Realism needs physically based materials, image-based reflections and soft
  shadows, which Three.js supplies (`MeshPhysicalMaterial` with clearcoat, a built-in studio
  environment, soft shadow maps, rounded boxes, lathe geometry for pawns). It is considerably
  smaller to download than Babylon.js for this scope, which matters for SC-006 (ready within 5 s
  on mobile) and for low-powered phones.
- **Content approach**: Everything is procedural: canvas-generated wood, marble, brass and cloth
  textures, lathe-turned pawns, built-in studio lighting, and generated props. No model, texture
  or HDR file is downloaded, which keeps the CSP (`img-src 'self' data:`, self-only scripts,
  no inline styles) unchanged and avoids third-party licensing. The canvas size is set through
  the renderer without writing `style` attributes in markup.
- **Risk and escape hatch**: Procedural art may not reach the SC-005 rating of 4 out of 5. If the
  review falls short, the plan allows self-hosted compressed model files for the board and pawns
  under the same CSP and the same lazy budget; that change is recorded as an amendment, not
  assumed now.
- **Alternatives considered**: Babylon.js (heavier, matches the old note). CSS 3D transforms
  (cannot give realistic lighting or shadows). Raw WebGL (far more work for the same result).
  Pre-rendered videos (cannot follow the game state).

## R8. Visual quality, adaptive downgrade and the lite renderer

- **Decision**: Three levels (high, standard, lite) as in the UI contract. Lite is a flat SVG
  board with no 3D code, so it also serves browsers without WebGL and the case where the 3D chunk
  fails or WebGL context is lost twice. Automatic selection uses device hints (memory, cores,
  pixel ratio, touch) and then watches frame time during animation and drops one level when it
  stays over budget for about two seconds. It never upgrades by itself. The 3D scene renders only
  when something changes (animation, camera move, state change) and stops when the page is hidden.
- **Rationale**: FR-026, SC-006, SC-011 and Principle XI: rich visuals must never exclude a
  device. Render-on-demand saves battery on phones.
- **Context loss**: Mobile Safari can discard the WebGL context in the background; the renderer
  restores it once and otherwise falls back to lite with the notice from the UI contract.

## R9. Themes as data

- **Decision**: A theme is a data record plus a small set of generator functions selected by id.
  The settings carry only the id. Five themes ship: Classic, Super Heroes, Halloween, Diwali and
  Winter Holidays. Lobby previews are small static pictures drawn from the theme's palette and a
  pawn silhouette, so the lobby loads no 3D code.
- **Super Heroes**: Original visuals inspired by a team of superheroes (steel, bold primaries,
  shield and star style shapes, comic highlights). No Marvel names, logos, characters or likenesses
  are used, as the spec requires.
- **Rationale**: FR-021 to FR-025. Because rules never read theme data, adding or retiring a theme
  cannot change a rule (FR-024), and a unit test fails if any theme lacks the shape marks, pawn
  numbers or protected-square markers that keep colour from being the only cue.

## R10. Accessibility model

- **Decision**: The board is never the only way to play. Every action has a native control
  (Roll, a chooser button per legal pawn with a descriptive name, I'm back, view and quality
  controls), the board has a hidden text description that tracks the state, and one polite live
  region announces each change once. Focus moves only when the viewer's own decision starts.
  Colour is paired with a per-colour shape mark, the pawn number, and star and start markers.
  Pawn hit areas on the board and the chooser buttons are at least 44 by 44 px.
- **Rationale**: FR-031 to FR-034, Principle VII. It also makes e2e tests reliable, because tests
  drive the same controls a keyboard user does.
- **Reduced motion**: Honors `prefers-reduced-motion` and the platform effects preference by
  turning events into instant state changes (see the UI contract section 6).

## R11. Layout with chat and log

- **Decision**: Reuse the 001 `ChatPanel` and `useRoom` unchanged. A wide screen shows the board
  beside a column of log over chat; a phone shows the board and controls with two bottom sheets
  (Game log, Chat) that show unread counts and take about half the height. The member list and
  match controls remain where 001 puts them.
- **Rationale**: FR-027 to FR-030 and the Changes table row for the room screen. Chat is not
  touched, so FR-028 (platform chat rules) holds by construction, and sending chat cannot change
  the game because it never reaches the game channel.

## R12. Solo play against the computer

- **Decision**: `LudoSolo` is registered in the 002 solo registry under `ludo` and loaded lazily.
  It runs the shared engine locally, with a small runner that drives roll, pause, move and the
  computer strategies, saves the state to local storage after each change, and uses the same view
  components as online. There is no chat, turn limit or away behavior. The saved match is
  discarded 30 minutes after the last move. Dice use the browser's cryptographic generator.
- **Rationale**: FR-039 to FR-046, Principle IV (solo may run locally). A local save is device
  only, so nothing about a solo match is shared (FR-045).
- **Strategies**: easy, normal and hard as defined in the data model. An automated test plays
  hundreds of seeded one-on-one matches and requires hard to beat easy clearly, which backs the
  human review in SC-015.

## R13. Late joiners and who sees what

- **Decision**: The match's seats are fixed at start from the room's participants. A person who
  joins later is a room member with no seat; the module's `viewFor` returns `WAITING` for them
  (no board), their `game.action` is rejected with `NOT_PLAYING`, and they keep chat. The next
  match (after return to the lobby) includes them.
- **Rationale**: Clarified answer; keeps seat and colour assignment stable and honors "no
  spectators" (Principle III only has host and player roles). Sending no board is the minimum
  information the role permits (Principle V).

## R14. The picture on the games page

- **Decision**: One original SVG illustration (four-colour board, pawns and a die) shipped with
  the web app, named by `art.image = LUDO` on the catalog entry. The web app maps the name to its
  own file, so the server never sends a URL. The tile renders it as an `<img>` with an empty `alt`
  in a fixed-aspect banner. An image `error` swaps in the existing icon art. A build check fails
  if the file exceeds 100 KB.
- **Rationale**: FR-047 to FR-050. SVG is sharp on every density, tiny, works in both colour
  modes with its own card background, needs no raster tooling, and passes the existing CSP
  (`img-src 'self'`). A fixed aspect ratio prevents layout shift, and the text renders first
  because the picture is decoded asynchronously.
- **Departure from 002**: 002 drew all tile art in code from icon and palette enums with no image
  files. That remains the default and the fallback; a game may now name one shipped picture. The
  fixed list of names keeps the contract narrow.
- **Alternatives considered**: A raster file (larger and blurry on dense screens). Inline SVG
  drawn by React (bigger initial bundle for one tile). A server-provided image URL (CSP and
  injection surface for no gain).

## R15. Room size follows the game

- **Finding**: 001 lets the host set the limit from 1 to 100 regardless of the game, and
  `game.select` does not touch it.
- **Decision**: The platform bounds `settings.update` by the selected game's maximum and lowers
  the limit on `game.select` when needed (see the game channel contract). The landing page
  already creates rooms inside the game's range (002).
- **Rationale**: Spec FR-002 and the Changes table: a Ludo room's limit is 2 to 4. This is a
  generic platform rule, not Ludo knowledge.

## R16. Observability and privacy

- **Decision**: Log match start and end with the seat count and duration. Never log names, roll
  values, board state, chat or tokens (the 001 redaction list stays). The runner counts timeouts
  and auto-plays as aggregate numbers only. The load harness gains a four-bot Ludo scenario that
  plays full matches through the engine and reports action latency.
- **Rationale**: Principle V, and SC-004 and SC-008 evidence.

## R17. Test strategy

| Layer | What it proves |
|-------|----------------|
| `packages/ludo` unit | Every rule scenario in SC-002, geometry table, seat and colour assignment, auto choice, away and resume, seat release, win by last seat, strategies, hard-beats-easy |
| Server unit | Runner with a fake clock: timers, settle window, timeouts, away, no move during rolling, view projection, `WAITING`, settings schema, fairness sample, first-player spread, test-dice guard |
| Server integration | Real WebSocket clients play a full match with a scripted die; reconnect during a roll; late join; leave; rate limit; client-supplied results refused |
| Contract | `game` messages and the `GAME_ACTION_REJECTED` ack validate against the shared schemas and this feature's documents; the catalog delta validates |
| Web unit | Room reducer for `game`, event queue and reduced motion, solo save and 30-minute expiry, quality selection, theme completeness, board description text |
| E2E (Playwright) | Landing tile picture and fallback, lobby theme and limit, a four-context match in the lite renderer, chat during a match, keyboard-only and axe in three themes, solo flow, one test that the 3D canvas reaches `data-render-state="ready"` |
| Real devices | The full matrix of FR-038 on laptop, Android and iPhone; the review sessions behind SC-001, SC-005, SC-013, SC-015 and SC-016 |

## R18. Build, deploy and compatibility

- **Decision**: Add `packages/ludo` to the `build:shared` script before the apps. The web build
  gains the 3D budget check and the picture size check. `render.yaml` needs no new variables.
  Existing e2e specs that treat Ludo as "Coming soon" move to Tambola.
- **Rationale**: The service builds with `npm ci --include=dev && npm run build`, which already
  builds workspaces in order; the new package fits that command unchanged.
- **Risk**: Adding a dependency (`three`) changes the lock file; the Render build must keep using
  `npm ci`, which fails loudly if the lock file is out of date.

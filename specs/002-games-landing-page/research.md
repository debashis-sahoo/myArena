# Research: Games Landing Page and Game-First Room Setup

All Technical Context items are resolved; there are no open NEEDS CLARIFICATION items. The four
owner decisions are recorded in the spec's Clarifications section.

## R1. Catalog source and endpoint

- **Decision**: Add `GET /api/catalog` returning `{ entries: CatalogEntry[] }`. The server builds
  it by mapping each registered playable game's descriptor to an entry with status `PLAYABLE`,
  then appending static roadmap entries with status `COMING_SOON`, skipping any roadmap id that a
  registered game already uses. `GET /api/games` is unchanged.
- **Rationale**: Planned games have no lifecycle, so they cannot live in the game registry. A
  separate read model keeps the lobby list limited to games that can really start (spec FR-005).
  The merge rule lets a game feature "take over" its tile by registering the same id.
- **Alternatives**: Extend `/api/games` with a status flag (rejected: the lobby would have to
  filter, and an old client could offer an unplayable game). Static JSON in the web app
  (rejected: game knowledge in the page, Principle VIII, and no contract test).

## R2. Game-supplied presentation

- **Decision**: Extend the SDK `GameDescriptor` with `description`, `category`, `durationMinutes`
  (`{ min, max }`), `modes` (subset of `SOLO_AI`, `ONLINE`), optional `defaultParticipants`, `art`
  (`{ icon, palette }` from fixed enums) and optional `test` flag. The registry validates them:
  non-empty `modes`, `min >= 1`, `max <= 100`, default inside the range, valid art values.
- **Rationale**: Satisfies spec FR-007 and FR-028 while games keep ownership of what they show.
  Fixed enums keep artwork safe and consistent without images.
- **Alternatives**: Let games ship SVG or images (rejected: CSP and bundle cost, plus a security
  review burden). Free-form colors (rejected: contrast cannot be guaranteed in two themes).

## R3. Artwork

- **Decision**: Tiles draw art from an `icon` enum (`TARGET`, `SNAKE`, `TICKET`, `PALETTE`,
  `CROWN`, `DICE`, `DISCS`, `FLASK`) and a `palette` enum (`CRIMSON`, `EMERALD`, `AMBER`,
  `VIOLET`, `INDIGO`, `ROSE`, `TEAL`, `SLATE`). The web maps icon names to library icons and
  palettes to CSS classes such as `art--violet` that set gradient custom properties.
- **Rationale**: No binaries, no inline style (CSP is self-only), no layout shift, and tile text
  is placed on a surface with guaranteed contrast rather than on top of the art.
- **Alternatives**: Generated images (rejected: no assets to supply, per the owner). Emoji
  (rejected: renders differently per device and fails the "professional" goal).

## R4. Room creation API

- **Decision**: `POST /api/rooms` accepts `{ displayName, gameId?, maxParticipants? }`.
  `maxParticipants` requires `gameId`. Valid range is `max(2, game.min)` to
  `min(100, game.max)`; the default is `game.defaultParticipants`, else `min(game.max, 100)`.
  Unknown or non-online game: 409 `GAME_UNAVAILABLE`. Bad count: 400 `VALIDATION_FAILED` with a
  field error. The room is created with `selectedGameId` set, `settings.maxParticipants` applied
  and `gameSettings` defaults from the game's schema (same as lobby selection). The idempotency
  fingerprint becomes `displayName|gameId|maxParticipants`.
- **Rationale**: Backward compatible for existing clients and tests; the server stays
  authoritative (Principle IV); creation is atomic so no half-created room is possible.
- **Alternatives**: Create then select via the realtime channel (rejected: two steps, a window
  with a gameless room, and a failure mode the spec forbids in FR-017).

## R5. Preview-only test game

- **Decision**: New env `DEPLOY_TARGET` (`production` default, or `preview`). In production mode
  `TEST_GAME_SECONDS` is still rejected unless `DEPLOY_TARGET=preview`. Both keys are added to
  `render.yaml` without values. Test games carry `test: true` and the catalog shows a "Test game"
  label. A second online-only test game (2 to 6 players, no solo) is registered alongside the
  existing one (2 to 100 players, solo and online) so tests cover both mode cases and ranges.
- **Rationale**: Real-device acceptance needs something playable before real games exist, while
  the live service must never show a test game.
- **Alternatives**: Remove the production guard (rejected: unsafe default). Separate preview
  build (rejected: two artifacts and drift).

## R6. Tile interaction and accessibility

- **Decision**: Tiles are `<button>` elements with `aria-pressed` for the selected state. Coming
  soon tiles use `aria-disabled="true"`, stay focusable, and announce "not available yet" through
  a polite live region when activated. Status is text, not color alone. Selection writes
  `?game=<id>` to the URL (replace, not push); an unknown or coming-soon id in the URL is ignored.
  The options panel renders directly below the Playable grid with a mini-tile header. Focus moves
  to the panel heading on selection; scrolling is smooth only when motion is not reduced.
  A dismiss control returns to the no-selection state and focus to the tile.
- **Rationale**: Native buttons give keyboard and touch behavior for free. Keeping the panel next
  to the grid satisfies "selected game and options stay in view together" (FR-023).
- **Alternatives**: Radio group (rejected: coming-soon tiles and dismissal fit toggles better).
  Modal dialog for options (rejected: hides tiles, spec scenario US2.1).

## R7. Player-count control

- **Decision**: A segmented radio group when the range has 8 or fewer values; otherwise a numeric
  stepper input with minus and plus buttons. Both show the allowed range and a note when the
  100-seat cap applies. The default is preselected. Out-of-range or empty input shows an inline
  error tied to the field.
- **Rationale**: Small ranges (2 to 4, 2 to 6) are fastest with one tap; large ranges need a
  compact stepper that works on phones.
- **Alternatives**: Slider (rejected: imprecise on touch and poor for assistive technology).

## R8. Visual system

- **Decision**: Retint the existing token files (`tokens`, `themes`, `components`) to a royal
  purple and gold identity for both themes; keep three theme states (system, light, dark).
  Dark: deep indigo background, raised violet surfaces, gold accent for primary highlights and
  focus ring. Light: soft lavender background, white surfaces, deep purple for primary actions
  and text, gold used for decoration only. Display headings use a serif stack from system fonts.
  A `data-effects` attribute on the root turns glows, shimmer and tile lift on or off; reduced
  motion removes animation regardless of the setting.
- **Rationale**: One token layer means the lobby, dialogs and recovery screens pick up the
  identity automatically (owner decision: whole app). Contrast is verified by axe in three themes
  plus a token contrast unit test, not assumed.
- **Alternatives**: Page-only styling (rejected by the owner). Web fonts (rejected: CSP, weight
  and load time).

## R9. Preferences and return to room

- **Decision**: Keys `myarena-name`, `myarena-effects` (`on` or `off`), `myarena-sound` (`on` or
  `off`) and `myarena-last-room` (a room id). The name is validated with the existing display
  name schema on read. Effects default to off when reduced motion is requested and on otherwise.
  The last-room id is written on room entry and cleared on leave or when the `/session` probe
  reports the seat is gone. The banner appears only after the probe confirms a seat.
- **Rationale**: Matches FR-019 to FR-021 and FR-029 with minimal state. A room id alone grants
  nothing without the member cookie.
- **Alternatives**: Server-side profiles (rejected: accounts are out of scope, Principle I).

## R10. Solo launch

- **Decision**: Web `features/solo/registry.ts` maps a game id to a lazy `import()` of that
  game's solo module; `/play/:gameId/solo` renders it inside a shell with a back control. A
  contract in `game-module-contract.md` defines the module props (display name, sound
  preference, effects flag, exit callback). This feature ships only a test solo module.
  An id without a module shows a clear "not available" page.
- **Rationale**: Keeps game code out of the entry bundle (FR-027) and keeps the AI and rules in
  the game (FR-012).
- **Alternatives**: Static imports (rejected: bundle). A server-run solo mode (rejected:
  principle IV allows local solo and a server would add cost for no benefit).

## R11. Landing shortcuts and join

- **Decision**: Hero "Create Private Room" and "Play Solo vs AI" move focus to the Playable grid
  with a prompt to choose a game, or jump to the matching option if a game is already selected.
  "Join with Room Code" always opens the join section, which needs no game. Invite links
  (`/join/:code`) bypass the landing page and ignore any `?game=`.
- **Rationale**: Direct consequence of spec FR-008 and FR-018.

## R12. Test strategy and e2e migration

- **Decision**: Rewrite `apps/web/tests/e2e/helpers.ts` `createRoom` and `joinByCode` to go
  through the landing flow with the test game selected, then update the specs that look for the
  old "Create a room" region (entry, a11y, keyboard, responsive, lobby, host, recovery). Add a
  landing spec for tile semantics, options appearance, count bounds, full room, and the
  no-selection state. Keep axe in three themes, 320 px and 200% text overflow checks, touch
  target checks, and the bundle budget.
- **Rationale**: Contract: every 001 flow still works through the new front door.
- **Alternatives**: Keep a hidden legacy entry route for tests (rejected: untested real path).

## R13. Contract test strategy

- **Decision**: The contract test helper loads the 001 OpenAPI file and merges the 002 delta
  file over it (paths and component schemas replaced by name), so there is one source of truth
  per operation and no duplicated edits in 001.
- **Alternatives**: Edit 001 in place (rejected: the 001 contract would silently change under a
  closed feature).

## R14. Product name

- **Decision**: "myArena Hub" with the tagline "Your Friends. Your Arena." (owner decision).

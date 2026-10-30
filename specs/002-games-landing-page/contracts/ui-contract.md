# Contract: Landing Page UI

Observable behavior the tests and acceptance checks rely on. Visual styling is not specified here
beyond what accessibility and the spec require.

## Routes

| Path | Behavior |
|------|----------|
| `/` | Games landing page. `?game=<id>` preselects a playable game; unknown or coming-soon ids are ignored. |
| `/join/:code` | Invite link; goes straight to joining and ignores `?game=` (unchanged from 001). |
| `/room/:roomId` | Lobby (unchanged). |
| `/play/:gameId/solo` | Solo launch for a game with a registered module. |

## Page structure (top to bottom)

1. Header: product name "myArena Hub", sound preference toggle, effects toggle, theme switch, and
   a name chip that opens a dialog to view or change the display name.
2. Hero: tagline "Your Friends. Your Arena.", one line that no account is needed and rooms work on
   phones and desktops, and three actions: Create Private Room, Join with Room Code, Play Solo vs AI.
3. Return banner (only when a held seat is confirmed): "Return to your room".
4. "Playable Games" grid. When none exist, an explanatory empty state replaces the grid.
5. Options panel (only when a game is selected), directly below the Playable grid.
6. "Future Arena Catalog" grid of coming-soon tiles.
7. "Join with Room Code" section (code and display name).

## Tiles

- A playable tile is a `button` with `aria-pressed` true or false. Its accessible name contains the
  game name, "Playable", and, for a test game, "Test game". Its visible content shows description,
  artwork, player range ("2 to 4 players"), duration ("10 to 20 min"), and ways to play
  ("Solo vs AI & Online").
- A coming-soon tile is a `button` with `aria-disabled="true"` and the visible text "Coming soon".
  Activating it starts nothing and sets a polite live message "<name> is not available yet."
- Status is always text; colors only reinforce it.
- Artwork is decorative (`aria-hidden`); information is never only in the art.

## Hero shortcuts

- No game selected: Create Private Room and Play Solo vs AI move focus to the Playable grid and
  announce "Choose a game first."
- Game selected: they move focus to the matching option, or announce that the mode is not
  available for this game.
- Join with Room Code moves focus to the join section; it never needs a game.

## Options panel

- Appears only for a selected playable game; removed when dismissed or when the selection
  changes to none. Focus moves to its heading on appearance; the appearance is announced.
- Header shows a mini tile (name, art, status) and a dismiss button ("Choose a different game").
- Offers "Play against AI" if `modes` has `SOLO_AI`, and "Create private room" if it has `ONLINE`.
  With one mode, a note reads "<other mode> is not available for this game."
- Selecting a different tile replaces the panel, resets the mode and player count, keeps the name.

### Create private room controls

- Display name (prefilled from preferences), number of players, Create button.
- Number of players: radio group for 8 or fewer allowed values, otherwise a stepper input. Shows
  "<lo> to <hi> players" and, when capped by the platform, "Rooms hold at most 100 players."
- Errors are inline, tied to the field, announced, and state a safe next step. Entries are kept
  after any error. Retries reuse the same idempotency key while inputs are unchanged.
- On success: navigate to `/room/:roomId` with the game selected and the limit applied.

## Preferences

- Storage keys: `myarena-name`, `myarena-effects`, `myarena-sound`, `myarena-last-room`
  (see data-model.md). Reads tolerate missing or invalid values.
- Effects toggle sets `data-effects="on|off"` on the root element. When reduced motion is
  requested, animation is off regardless, and the default is off.

## Failure states

- Catalog request fails: an inline error with Retry; Join with Room Code stays usable.
- Zero playable games: a message that games are on the way; Join with Room Code stays usable.
- Creation errors map: 400 with `fieldErrors` to field messages, 409 `GAME_UNAVAILABLE` to a
  message and a refresh of the catalog, 429 and 503 to the 001 messages with Retry.

## Accessibility and device requirements

- All controls reachable by keyboard in reading order, with a visible focus indicator and touch
  targets of at least 44 by 44 CSS pixels.
- No horizontal scroll at 320 px width or at 200% text size, in portrait or landscape.
- AA contrast in light, dark and system themes; verified by axe in three themes.
- With reduced motion: no scroll animation, no shimmer, no tile lift.

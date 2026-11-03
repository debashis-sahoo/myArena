# Contract: Housie Combination Tile Titles

Scope: the display of a combination's name inside a tile, for player and host views. Ticket sizing is outside this contract and MUST NOT
change.

## Rules

1. **Order of fallbacks** (first that fits wins): full name at the tier's base size on up to 2 lines, then smaller in 0.5 px steps down to
   10 px; then the short name from base size down to 10 px; last resort: short name at 10 px with ellipsis (a safety net that must not
   trigger on any verified screen). For 12 or fewer combinations on a phone the full name is shown whenever it fits in two lines at 10 px.
2. **No bad cuts**: a word is never split; a title is never reduced to a few letters plus an ellipsis while a smaller size or the short name
   would fit.
3. **Lines**: at most 2; the CLAIM button (or "Claimed by", "Open", countdown) always stays visible; the button's hit area is at least
   40 px tall (visual height may stay 22 to 34 px in dense tiers; the hit area is extended with padding or a transparent `::after`, and
   the tile itself is at least 40 px tall).
4. **Claimed**: the title stays visible together with "Claimed by [name]" (the player's name may ellipsize, the title may not).
5. **Floor**: 10 px for titles only; everything else keeps its current floor (11 px).
6. **Popover and `title` attribute** always carry the full name and the picture.
7. **Tickets**: tile planning (`planTiles` in `useFit.ts`) never feeds back into ticket sizing: the tiles panel gets its size from the screen
   layout, so ticket cells stay at or above the 003 baseline (`verification.md` baseline table) and at least 32 px. `planTiles` itself was
   changed for readability (rule 8) and this was verified to leave every ticket cell identical to the baseline.
8. **Readable tile width and scrolling**: a tile is never narrower than 70 px for up to 18 combinations or 54 px for 19 or more. When the
   columns the height asks for would go below that, the column count is capped and the list scrolls inside its own panel (never the
   page) with fixed tile heights of 62 px (up to 9 combinations), 58 px (10 to 18) and 56 px (19 or more).
9. **Tile layouts**: tiles under 78 px tall are `snug` (smaller padding and buttons); the fit then picks, per tile set, the layout that
   leaves the fewest cut or short titles: `stack` (name above the button), `row` (name beside the button) or `tight` (22 px button, 1 px
   gap). The geometry constants in `CombinationTiles.tsx` mirror `CombinationTiles.css` and must be kept in step.
10. **Tile frame**: the tile border is drawn as an inset box-shadow (not a CSS border) so padding maths used by the fit is exact.

## Short names

Table keyed by pattern id in `client/src/games/housie/shortNames.ts`: 40 entries, at most 9 characters, recognizable, unique among the
catalogue. Examples: Early Five = "Early 5", Four Corners = "4 Cnrs", Top and Middle = "Top+Mid", Middle and Bottom = "Mid+Bot",
Full House 1st = "House 1st".

## Verification surface

Each name element exposes `data-form` (`full` or `short`). Per tile the harness checks: `scrollWidth <= clientWidth`, no ellipsis text
overflow, computed font size at least 10 px, at most 2 lines, `data-form="full"` whenever the full name fits at 10 px in two lines.

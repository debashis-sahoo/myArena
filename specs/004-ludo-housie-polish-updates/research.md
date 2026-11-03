# Phase 0 Research: Ludo Pawn Sync, Glossy Dice, Housie Phone Readability and Share Text

Each entry: **Decision**, **Rationale**, **Alternatives considered**. No `NEEDS CLARIFICATION` items remain after `/speckit-clarify`.
Facts about the code come from reading the shipped modules (001 to 003).

## R1. Ludo stuck pawn: root-cause analysis and fix design

**What the code does today** (client only; the server sends one event per change with a full `LudoState` snapshot and a contiguous
`seq`, `matchRev = seq`):

- `roomStore` queues events in order; `useLudo` plays one event at a time and commits the event's snapshot when the animation ends.
- `Pawns` renders each pawn at the position from the *committed* snapshot (React inline `transform`), and during a `moved` event runs
  `hopAlong` (Web Animations API, `fill: 'forwards'` on the pawn's outer element) square by square, then `bounceHome` for captures.
- When a snapshot with a new `matchRev` commits, `Pawns` cancels all animations in the pawn layer so React's position wins again.

**Defects found (hypotheses to be reproduced first, then fixed; FR-006)**:

| # | Defect | Effect on one screen | Trigger |
|---|--------|----------------------|---------|
| H1 | `hopAlong` is not abortable. The effect's `cancelled` flag stops only the `onLand` callback; the loop keeps calling `animate(..., fill:'forwards')` for the remaining squares after the state was committed and animations were cancelled | A pawn is pinned to a mid-path square (a stale animation overrides the correct React transform) until the next `matchRev` change; it looks "stuck on a box" while other screens show it at its destination | A move being animated is cut short: tab hidden/shown, backlog skip (more than 3 queued events), reconnect snapshot, rapid bot moves |
| H2 | Fill-forwards animations hold pixel translations computed for the old cell size | After a resize or rotation during or just after a move, the pawn stays at the old pixel position | Resize, rotate, browser zoom, mobile address-bar collapse |
| H3 | The pawn element is a `<button>` when eligible and a `<div>` otherwise, so React remounts it when eligibility flips; the `elements` map and a running hop then refer to a removed node | The moving pawn's animation plays on a detached element (nothing visible), then the commit repositions it; a pawn can sit still then jump, or stay where a fill left it | Eligibility changes while a hop is running (own pawn on the mover's screen) |
| H4 | No safety net: a screen that missed an event, or whose animation promise never resolves in a throttled tab, is corrected only by the next reconnect | Persisting difference longer than 2 s (FR-002) | Dropped event, throttled or frozen tab, slow device |
| H5 | The cancel effect depends only on `state.matchRev`; a settled board whose animations were created after the last commit is never reconciled | Same stale hold as H1, with no later event to clear it | Last move of a turn followed by a pause (waiting for the next roll) |

H1 and H5 together explain "1 of 4 pawns stuck on a square, others fine": only the pawn whose hop sequence was cut short holds a stale
fill. They are consistent with the unremembered trigger (FR-006): any of backlog skip, hidden tab, quick bot follow-up or a mid-move
resize can cut a sequence short.

**Decision** (all client side, Ludo module plus one platform store hook):

1. **Abortable animations**: `hopAlong` and `bounceHome` take an `AbortSignal`; every loop iteration checks it, aborting cancels the
   animations they created and resolves. `Pawns`' effect cleanup aborts instead of only setting a flag.
2. **React layout is the single source of truth when settled**: whenever nothing is animating and the queue is empty (and when the cell
   size changes), a layout effect cancels every animation in the pawn layer. A fill-forwards animation can then never outlive its
   sequence. The `matchRev`-based cancel stays for commits during play.
3. **Stable pawn element**: render one element type for every pawn (a `div` that gets `role="button"`, `tabIndex`, the click handler and
   an Enter/Space key handler only when eligible), so eligibility changes never remount a pawn and keyboard moves keep working.
4. **Sequence-gap jump (platform slice)**: if a game event arrives with `seq > lastSeq + 1`, the store drops the queue and shows that event's
   own snapshot at once (every event carries the full state, so no round trip is needed). Combined with `pageshow`, `online` and
   `visibilitychange` handling in `useLudo` (show the newest state at once; `focus` is deliberately not used because it also fires
   during normal play and would cut legitimate hops), and aborting a move when a newer snapshot replaces the board, this covers FR-003.
5. **Catch-up rule instead of a watchdog**: every animation already ends at its expected duration through the commit timer, so a stuck
   animation cannot persist; a screen that is still busy 1.5 s after the next event arrived has fallen behind (slow device, throttled
   tab), so it aborts and jumps to the newest snapshot, keeping it within about 2 s of the server (FR-002).
6. **Verification hooks (not behaviour)**: each pawn element carries `data-sq` (its square key from the committed snapshot) so the
   harness can compare what every screen displays with the server's state, and `getBoundingClientRect` can confirm the pixel position.

**Rationale**: Fixes the whole class (stale holds, remounts, missed events) rather than one trigger, adds no server change (principle V
keeps authority on the server and the client only shows its snapshots), and keeps the animation speed and rules untouched (FR-007).
Because the cause was not reproduced by the user, the implementation starts by reproducing H1 to H5 with the harness (R2), records which
ones show a difference in `verification.md`, and then proves each fix against them.

**Alternatives considered**: Removing `fill: 'forwards'` entirely (rejected as the only fix: pawns would flicker back to the start square
between hops; the settle reconciliation gives the same safety without that). Periodic full-state polling (rejected: wasteful and slower
than the existing event stream; the gap and watchdog rules cover the failure modes). Server-side per-client acknowledgements (rejected:
a protocol change for a display-only problem).

## R2. How the pawn fix is proven (reproduction harness)

**Decision**: A scripted two-screen run, same style as 003: a real browser page for the host (Playwright, Edge), a second browser page
for the guest, and a socket client as the authoritative reference. The development-only `LUDO_DEV_DICE` sequence from 002 gives controlled dice.
Scenarios (each run with the fix off to confirm a difference, then on):

1. Rapid consecutive moves (six then bonus roll; bot moves right after a capture).
2. Capture, home-lane entry, HOME arrival.
3. Stacked pawns where one leaves.
4. Guest page hidden (`visibilityState` switch) during a move, then shown.
5. Guest reconnect (offline then online) in the middle of a sequence.
6. Slow guest (CPU throttling through the DevTools protocol) with queued bot moves.
7. Resize/rotate during and after a move.

After each settle, the harness reads `data-sq` and bounding boxes of all pawns on every page, and compares them with the layout derived
from the server snapshot. **Pass** = identical after every move within 1 s of the move finishing, never different for more than 2 s.

**Rationale**: Directly encodes FR-001 to FR-006 and the constitution's two-client checkpoint rule; the tooling stays outside the repo
(no new suites, Principle III).

**Alternatives**: A unit test of `hopAlong` (rejected: would not catch the real-browser animation and visibility behaviour).

## R3. Housie combination titles: fit strategy

**Decision**: Add a pure, cached **title fit** next to `planTiles`:

1. Inputs per tile: the usable width and height for the name (tile width minus padding, minus the CLAIM button in the side-by-side
   layout; tile height minus button and gaps when stacked), the full name, the short name, the density tier's base font size.
2. Measure text with an offscreen canvas 2D context using the tile's real font (read once from computed style), caching widths per
   (font, text). Greedy word wrap into at most two lines.
3. Try the full name from the tier's base size down to the 10 px floor in 0.5 px steps; take the largest size that fits in two lines
   and the available height without breaking a word.
4. If it still does not fit at 10 px, repeat with the short name (from base size down to 10 px); if even that does not fit, keep the
   short name at 10 px and allow ellipsis as the last resort (no tested screen reaches this).
5. The result `{ text, form: 'full' | 'short', fontPx, lines }` is applied as inline `font-size`, `-webkit-line-clamp`-free
   two-line wrapping (`white-space: normal; overflow-wrap: normal; text-wrap: balance`), and `data-form` for verification. The tile's
   `title` attribute and the popover keep the full name.
6. `useRegionSize` already re-renders on resize and rotation; the fit recomputes then, or when the tile set changes.
7. **Tile plan adjusted for readability**: `planTiles` keeps its no-scroll column rule but never makes tiles narrower than 70 px (up to 18
   combinations) or 54 px (19 or more); beyond that the list scrolls inside its own panel with fixed tile heights (62, 58, 56 px by
   tier). Short tiles (under 78 px) use `snug` padding and the fit chooses between `stack`, `row` and `tight` layouts per tile set,
   using geometry constants that mirror `CombinationTiles.css`; the tile border became an inset shadow so the padding maths is exact.
   This was found necessary during implementation (with the original column rule 13 or more tiles on a 360 px phone were about 20 px
   wide). Ticket planning is untouched and every ticket cell was verified identical to the baseline.

**Rationale**: Matches the clarified rule (wrap to two lines and shrink to 10 px first, short names only then). Deterministic per
tile, no layout thrash from DOM measuring loops, and ticket planning is not touched, so ticket cells cannot shrink (FR-015).

**Alternatives considered**: CSS-only `clamp()`/container units (rejected: cannot guarantee fit for the longest title in the narrowest
tile, nor choose the short name); measuring by repeatedly resizing the DOM node (rejected: layout thrash with 40 tiles); shortening
every title always (rejected: the clarified rule wants full titles when they fit).

**Short names**: a small client lookup `shortNames.ts` covering all 40 pattern ids, each at most 9 characters and recognizable
(for example Early Five becomes "Early 5", Four Corners becomes "4 Cnrs", Top and Middle becomes "Top+Mid", Full House 1st becomes
"House 1st"). It is display-only; the server catalogue is unchanged. Unknown ids fall back to the full name.

## R4. Glossy white rounder die (CSS only)

**Decision**: Keep the three-slab face structure and the cube markup. Change only `ludo.css`:

- Palette: slab fills move from cream to bright white with cool grey shading (`#ffffff` to `#e6ebf3`, deeper slabs `#dfe5ef` and
  `#c9d1df`) so the die reads white under the dark felt tray.
- Gloss: a soft specular highlight on each face's top slab as an extra `radial-gradient` layer (upper-left, white to transparent) plus a
  faint inner rim light, no new DOM nodes and no animation.
- Roundness: raise slab radii (24%, 30%, 38% to about 32%, 40%, 48%) and the depth steps slightly so the bevel reads as a soft, circular
  corner at rest and while tumbling; the face footprint and `--die` size stay the same.
- Pips: unchanged dark glossy pips, with slightly stronger inner shadow for contrast on white.
- Disabled and hover states keep their current dimming and glow; reduced motion uses the same static look.

**Rationale**: The faces are already real 3D rounded slabs, so a restyle plus larger radii delivers the look at zero runtime cost, and the
tumble animation, timing, face transforms and result are untouched (FR-010).

**Alternatives**: A WebGL or SVG die (rejected: unnecessary weight, same look achievable in CSS); a single rounded-box face (rejected:
the three-slab bevel is what makes the corners read round in 3D during the tumble).

## R5. Share description and previews

**Decision**: Edit the one static `client/index.html` (used for the Hub and every `/room/{gameId}/{roomId}` link because the server
returns it for all client routes): `meta description` and Open Graph / Twitter tags carry "Play interactive games with your Friends and
Family"; the title stays "myArena Hub"; add `og:site_name`, `og:type=website`, `twitter:card=summary`.

**Rationale**: Link-preview crawlers read the served HTML without running scripts, so static tags are what the preview shows; one file
serves both link kinds (FR-019 to FR-021). No absolute URL or image is added, because the Render hostname is deployment-specific and the
spec asks only for text.

**Alternatives**: Server-side per-room tag injection (rejected: no need, same text for all links; more code on the Express route);
`og:image` (out of scope; can be a later feature).

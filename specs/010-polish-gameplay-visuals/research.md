# Research: Polish Gameplay Visuals

## 1. Ludo die rendering and motion

- **Decision**: Improve the existing CSS 3D cube and Web Animations keyframes; do not introduce a
  rendering library.
- **Rationale**: The existing cube already preserves the server result, exposes six physical faces,
  and supports cleanup and reduced motion. Refining slab depth, rounded corners, recessed pips,
  impact overshoot, and the coordinated shadow reaches the requested realism without WebGL or
  additional bundle weight.
- **Alternatives considered**: Three.js/WebGL, raster transition sprites, and an animation library.
  Rejected because a dependency is disproportionate, raster frames are inflexible on resize, and
  the current cube already owns the required behavior.

## 2. Shadow and interruption behavior

- **Decision**: Drive shadow offset, scale, opacity, and blur from the same timeline as die travel;
  cancel temporary animations and restore the authoritative result when stale or complete.
- **Rationale**: One coordinated timeline prevents drift while a throw lifts or bounces. Cleanup
  protects against tab changes, resize, and overlapping server events.
- **Alternatives considered**: Independent CSS animation and a static softened shadow. Rejected
  because independent timing can desynchronize and a static shadow cannot communicate height.

## 3. Housie recent-call density

- **Decision**: Extend the existing measured-region planner to compute complete rows and columns for
  recent chips, prioritizing newest calls and reserving a stable “View all” control.
- **Rationale**: `BallConsole` already measures available dimensions. Calculating complete capacity
  avoids clipping and lets portrait and landscape consume available space efficiently.
- **Alternatives considered**: Fixed two-line count, horizontal scrolling, and text truncation.
  Rejected because fixed counts waste space, scrolling hides useful information at rest, and
  truncation violates whole-number readability.

## 4. UNO replacement event semantics

- **Decision**: Add `replacement` to the existing UNO draw reason. A legal sole final powercard is
  played with its real effect, exactly one card is awarded through the standard receive/reshuffle
  path, a private-aware draw event is published, and normal handoff continues.
- **Rationale**: This preserves the chosen card effect, keeps all card movement server-authoritative,
  and distinguishes automatic continuation from turn, penalty, timeout, catch, and initial draws.
- **Alternatives considered**: Rejecting the play, permitting zero cards until the next turn,
  silently inserting a card, or labeling it as a normal turn draw. Rejected because the user chose
  normal play plus replacement, silent mutation obscures state, and a normal-turn label is inaccurate.

## 5. UNO final action versus winner declaration

- **Decision**: Branch winner detection on shared card classification. A numbered final card
  finishes; a sole final powercard resolves and replaces, but cannot finish.
- **Rationale**: The shared model explicitly classifies `number` versus Skip, Reverse, Draw Two,
  Wild, and Wild Draw Four. Humans and bots already use the same server `playCard` path.
- **Alternatives considered**: UI-disabling final powercards and client winner validation. Rejected
  because UI checks are bypassable and clients cannot own authoritative legality or winner state.

## 6. Ludo Hub artwork

- **Decision**: Correct the internal board framing in the existing 768×768 Ludo WebP and preserve
  the current optimized image contract for all cards.
- **Rationale**: The defect is limited to the Ludo image's visible board shape; all other active
  thumbnails and the asset format are already approved.
- **Alternatives considered**: Recreate every game image, use vector rendering, or crop the board to
  an arbitrary card shape. Rejected because broad artwork changes increase scope and cropping can
  remove recognisable board edges.

## 7. Responsive thumbnail fitting

- **Decision**: Allocate the largest stable art region after title, description, badge, and action
  minimums; preserve source proportions with no stretching.
- **Rationale**: Existing grid and container layouts can adapt if the art slot remains ratio-aware.
  Stable intrinsic dimensions prevent collapse and layout shift while assets load.
- **Alternatives considered**: Fixed pixel artwork and aggressive fill cropping. Rejected because
  fixed media wastes space and cropping can hide the Ludo board silhouette.

## 8. Confetti density and performance

- **Decision**: Increase count only on the Hub atmosphere and Ludo/UNO result surfaces, with desktop
  and phone caps, CSS transforms, deterministic generation, and pointer pass-through.
- **Rationale**: Existing confetti is already isolated and decorative. More pieces satisfy the visual
  goal without a canvas/physics dependency. Caps protect small-device readability and performance.
- **Alternatives considered**: Canvas confetti, runtime randomized particles, and confetti on every
  game event. Rejected because canvas adds lifecycle complexity, randomization complicates evidence,
  and routine-event confetti would distract from play.

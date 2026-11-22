# Research: Premium Active-Game Hub

## R1. Active-game visibility

- **Decision**: Filter the existing shared game catalog by its active status before rendering Hub cards.
- **Rationale**: A single authoritative catalog prevents drift, automatically includes future active games, and removes inactive/coming-soon entries without parallel lists.
- **Alternatives considered**: Maintain a separate client allowlist; rejected because it can become stale and conflicts with the approved dynamic-active rule.

## R2. Artwork technology

- **Decision**: Use optimized, same-origin raster artwork for polished dimensional game thumbnails, with SVG retained where it already provides the required fidelity.
- **Rationale**: Marketing-style 3D/isometric art is best represented as pre-rendered assets; React/Vite already supports it without a framework migration or runtime 3D dependency.
- **Alternatives considered**: Runtime Three.js/WebGL; rejected as unnecessary weight and complexity for static landing cards.

## R3. Title and role text

- **Decision**: Keep the approved title as an image and render PLAYER HUB / HOST ARENA as separate live text beneath it.
- **Rationale**: The title retains exact approved lighting and bevel detail, while the role remains accessible, crisp, and independently responsive.
- **Alternatives considered**: Role text baked into both raster assets; rejected because scaling caused the live subtitle to be clipped or unreadable.

The title artwork itself must be role-neutral. Existing host/player rasters that embed role text must be regenerated or no longer used as Hub title sources so duplicate role labels cannot occur.

## R4. Preview approval

- **Decision**: Require four approved previews—host desktop, player desktop, host phone, and player phone—before production Hub implementation begins.
- **Rationale**: This covers both action modes and the two most important layout risks with the minimum useful review set.
- **Alternatives considered**: One desktop preview; rejected because it does not expose player/host action differences or phone clipping.

## R5. Asset loading and failure

- **Decision**: Reserve a fixed art region, eagerly load the hero and first visible card row, lazily load remaining art, and use a neutral fallback on failure.
- **Rationale**: This protects layout stability and primary actions while supporting premium imagery.
- **Alternatives considered**: Client-only generated artwork fallback from another game; rejected because it can misidentify the game.

For future games, approved game-specific artwork is an activation prerequisite. The neutral fallback is only a temporary failure state, not an acceptable permanent replacement for active-game artwork.

## R6. Ludo die depiction

- **Decision**: Correct the marketing die as a pre-rendered natural cube with bevels, visible faces, shadows, and coherent pips, independent of gameplay state.
- **Rationale**: The issue is visual realism, while dice authority belongs to the server and must remain untouched.
- **Alternatives considered**: Rebuild the die from the gameplay animation; rejected because it would couple promotional art to authoritative state and could imply control.

## R7. Active-card behavior

- **Decision**: Keep host cards interactive and player cards non-interactive, with room-code entry remaining the player’s primary task.
- **Rationale**: This preserves the existing permissions and avoids exposing host behavior through visual redesign.
- **Alternatives considered**: Make cards visually interactive for players; rejected because it could imply an unsupported launch action.

## R8. Verification strategy

- **Decision**: Use preview approval, browser inspection, focused smoke, build, and Render asset checks.
- **Rationale**: It directly covers the requested visual outcome and preserved room behavior without a new test framework.
- **Alternatives considered**: Snapshot-heavy UI tests; rejected for early iteration because small intentional visual changes would create noisy failures.

Production verification also follows the constitution’s deployment gate: readiness, secure WebSocket connectivity, and authoritative reconnect/resynchronization must be observed separately from static asset loading.

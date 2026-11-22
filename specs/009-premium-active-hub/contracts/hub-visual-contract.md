# Contract: Hub Visual and Interaction Surfaces

## Mode contract

| Surface | Host Hub | Player Hub |
|---------|----------|------------|
| Route | `/host` | `/` and player fallback routes |
| Role label | `HOST ARENA` | `PLAYER HUB` |
| Title asset | Role-neutral approved title | Role-neutral approved title |
| Primary action | Launch an active game | Join by room code |
| Active game card | Interactive launch card | Non-interactive showcase |
| Inactive game card | Not rendered | Not rendered |

## Title contract

- Title artwork keeps the approved crown, cosmic glitter, metallic color palette, and no rectangular/oval border.
- Title artwork is role-neutral and contains no PLAYER HUB or HOST ARENA text.
- The role label is separate live text directly below the artwork.
- The label remains visible at all supported sizes and is included in accessible page heading context.
- Title and role spacing is reserved before image load.

## Active-card contract

- Input: one active game from the shared catalog.
- Visibility: the card exists only when the game status is active.
- Host action: preserves the current launch callback and existing modal/room creation flow.
- Player action: no launch callback; card displays host/join guidance.
- Failure: artwork failure changes only the card’s visual region; title, description, status, and mode behavior remain available.
- Fallback: neutral branded artwork sized to the same art region; never another game’s artwork.
- A catalog entry must have approved game-specific artwork before it is marked active; fallback is a temporary loading/delivery failure state only.

## Artwork contract

- Card art must be recognizable at its smallest rendered size.
- Card art must use a common focal area, safe padding, and consistent dimensional lighting.
- Ludo art must present a believable rounded/beveled six-sided die with coherent visible-face pips.
- The decorative Ludo die is not an authoritative game roll and carries no runtime state.
- Optimized images must preserve dimensions in markup so loading does not shift controls.

## Accessibility contract

- All interactive host cards retain visible keyboard focus and an accessible name.
- Player showcase cards are not presented as actionable controls.
- The room-code panel remains labeled and announces loading/errors.
- Decorative title and card imagery use empty alternative text when the adjacent visible text supplies identity.
- Reduced motion removes decorative shimmer, float, glow, and particle animation without hiding labels or actions.

## Responsive contract

Required checks:

- 320x568
- 390x844
- 640x360
- 844x390
- 768x1024
- 1024x768
- 1366x768
- 1920x1080
- 2560x1440

No check may show clipped role text, clipped title art, overlapping profile/audio controls, hidden room entry, horizontal page overflow, distorted card art, or unreadable actions.

# Contract: Preview Approval Gate

## Required previews

| Preview ID | Mode | Viewport | Required visible state |
|------------|------|----------|------------------------|
| host-desktop | Host | Representative desktop | Active cards with host launch actions |
| player-desktop | Player | Representative desktop | Room-code form and active showcases |
| host-phone | Host | Representative phone portrait | Complete role label, header controls, active cards |
| player-phone | Player | Representative phone portrait | Complete role label, room-code form, active cards |

## Approval rules

- All four preview files must exist before review.
- No production Hub source or asset changes for this feature may begin before all four previews are approved.
- A revision request invalidates that preview only; unaffected approved previews remain approved if the design direction has not changed.
- Approval confirms visual direction, not permission to alter room, authorization, or gameplay behavior.

## Approval record

Each preview record includes:

- `artifactPath`
- `mode`
- `viewportClass`
- `approved`
- `reviewedAt`
- `notes`

## Required review questions

1. Is the crown title free of rectangular and oval/orbit borders?
2. Is the separate PLAYER HUB / HOST ARENA label completely visible?
3. Are only active games represented?
4. Is the room-code/player flow or host launch flow correctly prioritized?
5. Is the Ludo die natural and correctly rendered?
6. Is the artwork premium, consistent, and free of obvious distortion?
7. Does the phone preview preserve access to profile, audio, role, room entry, and cards?
8. Is the title artwork itself role-neutral, with PLAYER HUB or HOST ARENA present only as live text?

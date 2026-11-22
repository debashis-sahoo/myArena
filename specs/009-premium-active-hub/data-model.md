# Data Model: Premium Active-Game Hub

## Overview

The feature introduces presentation models only. Room, participant, invitation, chat, and game-state data remain unchanged.

## HubExperienceMode

| Field | Type | Rules |
|-------|------|-------|
| `mode` | `host` or `player` | Derived from the existing Hub route |
| `roleLabel` | text | Exactly `HOST ARENA` or `PLAYER HUB` |
| `canLaunch` | boolean | True only in host mode |
| `showsJoinByCode` | boolean | True only in player mode |

## ActiveGameView

| Field | Type | Rules |
|-------|------|-------|
| `id` | stable game identifier | Existing catalog ID; drives route and artwork lookup |
| `name` | display text | Existing catalog name |
| `tagline` | display text | Existing catalog tagline |
| `status` | game status | Only `active` entries may become Hub cards |
| `theme` | accent pair | Existing accent values; used for borders and highlights |
| `artwork` | visual asset reference or absent | Missing/failed artwork uses a neutral fallback; approved artwork is required before the game becomes active |
| `interactive` | boolean | True only when mode is host and launch callback exists |

**Derived rule**: `visible = status === "active"`.

## HubCard

| Field | Type | Rules |
|-------|------|-------|
| `game` | ActiveGameView | One per visible active game |
| `index` | non-negative integer | Presentation order and animation delay only |
| `statusLabel` | `Active` | Inactive states are not rendered |
| `actionLabel` | text | Host uses launch language; player uses room-code guidance |
| `artState` | `ready`, `loading`, or `fallback` | Does not alter game availability |

## TitlePresentation

| Field | Type | Rules |
|-------|------|-------|
| `artwork` | role-neutral image asset | Shared across host/player; contains no role text |
| `roleLabel` | live text | Rendered separately below the raster title |
| `reservedAspect` | dimensions | Prevents clipping and layout shift |
| `borderTreatment` | `none` | No rectangular frame or oval/orbit border |

## PreviewApproval

| Field | Type | Rules |
|-------|------|-------|
| `id` | stable string | Unique for each required preview |
| `mode` | `host` or `player` | Required |
| `viewportClass` | `desktop` or `phone` | Required |
| `artifactPath` | file path | Required before review |
| `approved` | boolean | All four must be true before implementation |
| `notes` | text | Optional requested adjustment |

## Relationships

- One HubExperienceMode produces one active-game card collection.
- One ActiveGameView produces at most one HubCard.
- One HubCard references one optional artwork asset and one deterministic neutral fallback.
- One PreviewApproval records one mode/viewport preview.
- Implementation requires four PreviewApproval records: host desktop, player desktop, host phone, player phone.

## State Transitions

```text
preview created → awaiting review → approved
                              ↘ revision requested → preview revised → awaiting review

card art loading → ready
                 ↘ failed → neutral fallback
```

None of these states mutate the room or game engines.

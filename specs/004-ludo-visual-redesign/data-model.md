# Data Model: Ludo Visual Redesign

No server, protocol or stored data changes. These are the view-side shapes this feature adds or changes. Game state, events and the seeded throw are unchanged.

## BoardGeometry (constants, pure)

| Name | Meaning |
| --- | --- |
| Grid | 15 by 15 squares; ring, lanes and cells come from `@myarena/ludo` (`RING`, `LANES`, `cellOf`). |
| Frame | Four 6 by 6 corner blocks by colour; each holds a yard of 4 by 4 with four slot centres. |
| EntryArrow | Per colour: the lane's outer square and the direction towards the centre. |
| ViewBox | The grid plus a margin for name bars and theme decoration (for example `-1.6 -1.6 18.2 18.2`). |

## PlacedPawn (existing, extended)

`seat`, `pawn`, `color`, `cx`, `cy`, `scale`, `movable` as before, plus:

| Field | Meaning |
| --- | --- |
| `highlighted` | True while its move button is pointed at or focused. Not stored in game state. |

## HopPlan (pure)

| Field | Meaning |
| --- | --- |
| `key` | `seat:pawn`. |
| `path` | Ordered squares to visit (centre points), one per step; the last equals the destination. |
| `hopMs` | Time per hop: 200 ms, reduced so a whole move never exceeds 1500 ms. |
| `afterMs` | When the capture knock-back may start (end of the path). |

Rules: a yard-to-start move has one hop; a move into home ends at the centre; a new live move finishes the one in progress at once; snapshots and instant motion skip the plan.

## DieView

| Field | Meaning |
| --- | --- |
| `face` | Settled face 1 to 6, or null before any roll. |
| `throw` | The active `Throw` (`seed`, `face`, `durationMs`, `startedAt`) from `RollPlayback`, or null. |
| `matrix` | Output of `dieTransform(sample)`: a 4 by 4 matrix string for the cube. |
| `shadow` | Scale and opacity from the die's height. |

Face layout on the cube (matches `FACE_NORMALS`): 1 up, 6 down, 2 front, 5 back, 3 right, 4 left.

## MatchLayoutMode

`wide` (from 900 px wide), `portrait` (narrower and not landscape-short), `landscape` (wide enough but under 520 px high, or narrower with `orientation: landscape`). Chosen from media queries; the chosen mode only changes arrangement, never behaviour.

## ThemeRecord (changed)

Keeps `id`, `name`, `description`, `palette`, `board`. Removed: `pawn`, `die`, `props`, `celebration`. Added: `frame` (frame colour) and `decor` (a short list of decoration kinds drawn around the board).

## Removed

`Quality`, `RenderState`, `QualityChoice`, the view preference, scene objects and animator types, and the `data-render` and `data-render-state` attributes.

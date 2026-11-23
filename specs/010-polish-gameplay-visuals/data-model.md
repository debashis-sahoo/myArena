# Data Model: Polish Gameplay Visuals

## 1. Existing boundaries

No persisted entities or database records are introduced. Room and match state remains in memory.
The models below describe presentation state and the one authoritative UNO transition that changes
observable hand and turn state.

## 2. Ludo Die Presentation

| Field | Meaning | Validation |
|-------|---------|------------|
| `value` | Authoritative result, 1–6 | Must match the latest accepted roll event |
| `face` | Cube orientation for the value | Exactly six orientations |
| `phase` | `resting`, `lifting`, `tumbling`, `bouncing`, or `settling` | Only associated with its matching event |
| `shadow` | Offset, scale, opacity, and blur | Restores to baseline on completion/cancellation |
| `reducedMotion` | User preference | Omits travel, spin, shake, and long blur |

### State transitions

`resting(old value)` → `lifting/tumbling` → `bouncing` → `settling` →
`resting(new authoritative value)`.

Interrupted or superseded animation ends on the latest authoritative resting state without replaying
stale motion.

## 3. Housie Recent-Call Layout

| Field | Meaning | Validation |
|-------|---------|------------|
| `called` | Ordered authoritative calls | 0–90 unique numbers |
| `current` | Newest call shown on the ball | Null before the first call |
| `regionWidth`, `regionHeight` | Measured chip region | Non-negative; changes trigger replanning |
| `chipWidth`, `chipHeight`, `gap` | Complete chip dimensions | Preserve digits and touch-safe spacing |
| `columns`, `rows` | Grid capacity | Every shown chip fits fully |
| `visibleRecent` | Newest previous calls | Whole chips only |
| `fullHistoryAvailable` | “View all” visibility | True while calls exceed capacity |

The “View all” action reserves complete grid space. A resize recalculates capacity; no partial row is
forced into the available region.

## 4. UNO Final-Powercard Transition

### Card classification

| Class | Kinds | May finish |
|-------|-------|------------|
| Number | `number` | Yes, when legally played last |
| Powercard | `skip`, `reverse`, `draw2`, `wild`, `wild4` | No |

### State outcomes

| Field | Final numbered card | Sole final powercard |
|-------|---------------------|----------------------|
| Player hand | 0 | 1 replacement |
| Discard top | Number | Powercard |
| Effect | Existing finish path | Real effect remains active |
| Winner | Player ID | `null` |
| Phase | `finished` | `settling`, then normal target turn |
| Draw reason | None | `replacement` |

### Transition ordering

1. Validate turn, ownership, matching, pending penalty, drawn-card restriction, and Wild colour.
2. Remove the sole card and place it on discard.
3. Apply the card's normal effect.
4. If numbered: finish.
5. If a powercard:
   - publish `play` with the real effect;
   - draw exactly one replacement through the standard pile/reshuffle path;
   - publish `draw` with `why: 'replacement'`;
   - hand off according to the played effect.
6. Continue timers, catch cleanup, bot flow, and privacy with the one-card hand.

## 5. Hub Thumbnail Presentation

| Field | Meaning | Validation |
|-------|---------|------------|
| `gameId` | Active game identifier | Maps to the active catalog |
| `sourceAspect` | Artwork's visual proportions | Ludo board area is 1:1 |
| `displayBox` | Measured card art region | Ratio-aware and non-overflowing |
| `fit` | Aspect-preserving presentation | No stretching or unintended crop |
| `fallback` | Neutral replacement | Stable dimensions and no changed game identity |

## 6. Celebration Presentation

| Field | Meaning | Validation |
|-------|---------|------------|
| `surface` | `hub`, `ludo-results`, or `uno-results` | Only existing surfaces |
| `pieceCount` | Decorative count | Desktop ≥24 visible; phone ≥16 visible |
| `reducedMotion` | User preference | Animated pieces omitted |
| `pointerEvents` | Input behavior | Always pass through |
| `lifetime` | Surface/overlay lifetime | Cleared with its owner |

# Contract: Housie Ticket Layout and Presentation

Presentation only (spec FR-008 to FR-012). Ticket numbers, placement, manual marking, claims, calling and prizes are unchanged; the game never marks a number for the player (003 FR-013).

## 1. Anatomy

```text
 +--------------------------------------------------+
 |  HOUSIE  *  Ticket #1                 (ribbon)   |   ribbon 18 px (14 px compact), scalloped lower edge
 +----+----+----+----+----+----+----+----+----+-----+
 |  4 |    | 23 |    | 41 |    | 63 |    | 80 |  row 1
 +----+----+----+----+----+----+----+----+----+
 |    | 12 |    | 31 |    | 52 |    | 74 |    |  row 2      9 columns x 3 rows, 5 numbers per row, as today
 +----+----+----+----+----+----+----+----+----+
 |  8 | 17 |    | 36 |    |    | 66 |    | 90 |  row 3
 +----+----+----+----+----+----+----+----+----+
   col tints: 1-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80-90
```

- The ribbon replaces the vertical side tab (the tab is the reason the compact layout dropped the label). It carries the ticket name for every layout, so tabs mode and a single ticket
  keep a visible name.
- The selected ticket keeps the gold frame and glow; the ink colour still alternates red and blue per ticket.
- Gradients and SVG only: no images, no new fonts.

## 2. Column tints and ink

| Column | Range | Tint | Column | Range | Tint |
|--------|-------|------|--------|-------|------|
| 1 | 1 to 9 | `#fff1c9` | 6 | 50 to 59 | `#d2f1f7` |
| 2 | 10 to 19 | `#ffe0d2` | 7 | 60 to 69 | `#d4f5dd` |
| 3 | 20 to 29 | `#fdd9e6` | 8 | 70 to 79 | `#e9f5c8` |
| 4 | 30 to 39 | `#ead9fb` | 9 | 80 to 90 | `#ffe8b8` |
| 5 | 40 to 49 | `#d9e3ff` | | | |

Number ink is `#2a1a0a`; every tint gives at least 12:1 contrast (requirement 4.5:1). Tints are light by design so the digits stay the strongest element; hatched empty cells use a
neutral paper tone.

## 3. States (readable without colour)

| State | Treatment |
|-------|-----------|
| Empty cell (no number) | Hatched paper pattern, not focusable |
| Unmarked number | Column tint, bold ink digits, thin border |
| Marked number | The hand-inked cross (existing stamp animation), plus a filled inset (tint darkened about 12%), a 2 px ink inset ring and a small corner tick; `aria-pressed="true"` and "crossed" in the label |
| Focus | 3 px gold outline with 1 px offset (existing) |
| Pressed | Scale 0.94 for 80 ms (existing; none with reduced motion) |
| Read-only | No hover or press effects (existing) |

The corner tick and inset ring mean a marked cell differs from an unmarked one by shape and fill, not only hue. Contrast is computed for each state by the V8 script.

## 4. Planner rules (`planTickets`)

Inputs: region `width` and `height` in px, ticket count, viewport width. Output: `{ mode, cell, rowH, fontPx, scrollY }` (data-model section 8).

| Rule | Value |
|------|-------|
| Phone class | viewport width under 768 px |
| Minimum number size | 18 px (phone), 24 px (768 px and up) |
| Minimum row height | 30 px (phone), 38 px (768 px and up) |
| Maximum cell width | 128 px |
| Row height | `max(minRow, 0.72 x cell)`, then limited by the height share available |
| Number size | `min(0.62 x rowH, 0.60 x cell)`, raised to the minimum |
| Overhead per ticket | compact: 18 px horizontal, ribbon 14 px; roomy: 28 px horizontal (frame and gaps), ribbon 18 px |
| Width use | a single ticket or a stack uses at least 90% of the region width unless the height limits it |
| Mode choice | evaluate `stack`, `grid` (3 or more tickets) and `tabs`; accept a mode only if its numbers meet the minimums; pick the largest cell (ties keep `stack`); if none qualify use `tabs` |
| Last resort | if even `tabs` cannot reach the minimum number size in the available height, set `scrollY`: the ticket region scrolls vertically inside itself; the page and the ticket never scroll horizontally |

### Indicative budgets (single ticket; the planner computes real values from the measured region)

| Viewport | Region width | Cell | Row height | Number size |
|----------|--------------|------|------------|-------------|
| 320 | about 300 | 31 | 30 | about 18.6 px |
| 390 | about 370 | 39 | 30 | about 18.6 px |
| 768 | about 700 | 74 | 53 | about 33 px |
| 1024 | about 480 (left column) | 50 | 38 | about 24 px |
| 1440 | about 600 | 63 | 45 | about 28 px |

Two-digit numbers need about 21 px at 18 px type, which fits every cell above (31 px or more).

## 5. Accessibility and motion

- Cell labels are unchanged ("Row 2, column 4, number 31, crossed"); the ribbon is `aria-hidden` and the group keeps its label "Ticket #1".
- Keyboard movement between numbers (arrow keys) and Enter or Space to mark are unchanged.
- The stamp animation keeps its reduced-motion alternative; the ribbon, tints and frame are static.
- Text zoom or enlarged text only increases `fontPx` up to the cell limit and falls back to `scrollY` rather than clipping a number.

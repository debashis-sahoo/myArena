# Data Model: Ludo Pawn Sync, Glossy Dice, Housie Phone Readability and Share Text

No server data, event, or protocol changes. These are the display-side entities the change introduces or tightens.

## Pawn position (shown vs recorded)

| Field | Source | Notes |
|-------|--------|-------|
| `recorded` | Server `LudoState.players[].pawns[]` (progress: base, ring 0..., home lane, HOME, removed) | Authoritative; delivered in every event snapshot and in join/reconnect snapshots |
| `square` | `cellOf(color, progress)` or base spot / HOME slot | Same function on every screen (shared) |
| `shown` | Pawn element position on one screen | Equals the layout of the committed snapshot whenever the screen is settled |
| `data-sq` (new, verification only) | Square key of the committed snapshot (`r,c`, `base:i`, or `home:i`) | Lets the harness compare screens without reading pixels |

**Invariant**: when a screen is settled (no animation, empty event queue), `shown == layout(committed snapshot)` for every pawn, and the
committed snapshot equals the server's latest snapshot, within 1 s of the last move finishing (never more than 2 s apart).

## Animation sequence (client lifecycle)

States: `idle` -> `playing` (one event: roll tumble or move hops, optional capture bounce and HOME celebration) -> `settled`
(snapshot committed, animations cancelled) or `aborted` (cut short by a newer snapshot, hidden tab, reconnect, resize, watchdog).

Rules:

- `aborted` and `settled` both end with every animation in the pawn layer cancelled and the newest committed snapshot drawn.
- An aborted sequence MUST NOT create any further animation after the abort (the H1 defect).
- A sequence has a deadline: expected duration plus 1 s; passing it forces `aborted`.
- A `seq` jump (greater than last seen plus 1) triggers one snapshot resync; events with `seq <= lastSeq` are ignored (unchanged).

## Title fit (Housie tile)

| Field | Type | Notes |
|-------|------|-------|
| `text` | string | Full name, or short name when the full name cannot fit at 10 px |
| `form` | `'full'` or `'short'` | Exposed as `data-form` for verification |
| `fontPx` | number, 10 to the tier's base size | Inline `font-size` on the name element |
| `lines` | 1 or 2 | Never more than 2 |

**Validation**: fit is accepted only if the wrapped text height is at most the available height and no word is wider than the available
width. The full name always stays in the tile's `title` attribute and the popover.

### Short names

A static table keyed by pattern id, one entry per catalogue pattern (40), each at most 9 characters; missing ids use the full name.

## Share metadata

| Tag | Value |
|-----|-------|
| `<title>` | myArena Hub |
| `meta[name=description]`, `og:description`, `twitter:description` | Play interactive games with your Friends and Family |
| `og:title`, `twitter:title` | myArena Hub |
| `og:site_name` | myArena Hub |
| `og:type` | website |
| `twitter:card` | summary |

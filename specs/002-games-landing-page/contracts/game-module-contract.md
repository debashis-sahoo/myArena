# Contract: Game Presentation, Solo Module, and Preferences

How a game plugs into the landing page. Rules and AI stay in the game (Principle VIII); this
contract carries only presentation and a way in.

## 1. Server: `GameDescriptor` additions (`packages/game-sdk`)

```text
id, name, minParticipants, maxParticipants, settingsSchema   existing, unchanged
description          string, 1 to 200 chars
category             string, 1 to 30 chars
durationMinutes      { min, max }, 1 to 600, min <= max
modes                non-empty, unique subset of SOLO_AI | ONLINE
defaultParticipants  optional integer inside [max(2, min), min(100, max)]
art                  { icon: ArtIcon, palette: ArtPalette }
test                 optional boolean, true only for test games
```

`ArtIcon` = `TARGET | SNAKE | TICKET | PALETTE | CROWN | DICE | DISCS | FLASK`.
`ArtPalette` = `CRIMSON | EMERALD | AMBER | VIOLET | INDIGO | ROSE | TEAL | SLATE`.

Registry rules (startup failure on violation): unique `id` matching `^[a-z0-9-]{1,40}$`;
`1 <= min <= max <= 100`; at least one mode; default within range; valid art values. A game with
`ONLINE` in `modes` must provide a lifecycle; a game with only `SOLO_AI` appears in the catalog
but not in `GET /api/games` and cannot be chosen for a room.

## 2. Server: catalog assembly

1. Map each registered game to a `PLAYABLE` entry.
2. Append roadmap entries as `COMING_SOON`, skipping ids already registered.
3. `defaultParticipants` for entries without one = `min(maxParticipants, 100)`.
4. Order: playable entries in registration order, then coming-soon entries in roadmap order.

Taking over a tile: a game feature registers a descriptor with the roadmap entry's id; no change
to the landing page or roadmap is needed.

## 3. Web: solo module (`apps/web/src/features/solo`)

Registry: `Record<gameId, () => Promise<{ default: SoloGameComponent }>>`. A module is imported
only when `/play/:gameId/solo` is opened.

```text
SoloGameProps
  displayName    string          the visitor's name (may be empty if none stored)
  soundEnabled   boolean         from myarena-sound
  effectsEnabled boolean         effective value after reduced-motion handling
  onExit         () => void      returns to the landing page, with the same game selected
```

Rules for a solo module:

- It owns its rules, AI and presentation, and must not call platform room endpoints.
- It must honor `effectsEnabled` and the reduced-motion preference.
- It must render an accessible exit control that calls `onExit`.
- If no module is registered for an id, the platform shows a "not available" page with a link back.

This feature ships a test-only solo module bound to the test game id; real games add their own.

## 4. Preferences exposed to games

Read through a small web helper, not by games touching `localStorage` directly:
`getPreferences()` returns `{ displayName, effects, sound }`. Games may read; only the landing
header writes. Values never leave the device.

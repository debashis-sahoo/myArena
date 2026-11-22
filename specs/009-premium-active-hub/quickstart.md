# Quickstart: Premium Active-Game Hub

## Prerequisites

- Node.js 22 or newer
- Dependencies installed with `npm ci`
- Render URL available for production verification
- Access to the approved reference and the four preview artifacts

## 1. Produce the approval set

Create exactly these files under `specs/009-premium-active-hub/previews/`:

- `host-desktop.png`
- `player-desktop.png`
- `host-phone.png`
- `player-phone.png`

Each preview must show the exact active-game set, complete live role label, and the correct host/player primary action.

Do not edit production Hub source or assets until all four previews are explicitly approved.

## 2. Review the previews

For each preview, confirm:

- No rectangular or oval/orbit title border.
- Complete role subtitle beneath the title.
- No PLAYER HUB or HOST ARENA text embedded inside the title image; the label is live text only.
- Only active games appear.
- Correct player room-code or host launch behavior is represented.
- Game imagery is polished and consistent.
- The Ludo die has natural cube perspective, rounded/beveled edges, and valid visible-face pips.
- Phone previews keep profile, audio, title, role, room entry, and cards accessible.

Record approval in the feature’s preview approval record.

## 3. Implement after approval

Run:

```powershell
npm run build -w shared
npm run dev -w client
```

Use a separate local server process when exercising `/host`, room joining, or launch flows.

## 4. Visual validation

Inspect `/` and `/host` at the viewport matrix in [hub-visual-contract.md](contracts/hub-visual-contract.md).

Expected:

- Complete PLAYER HUB / HOST ARENA text
- No title or role clipping
- No inactive or coming-soon cards
- Active art does not distort
- Compact room-code panel remains functional
- Profile and audio controls remain available
- No horizontal overflow

Repeat key checks with `prefers-reduced-motion: reduce`.

## 5. Functional regression validation

From the host Hub:

1. Select an active game.
2. Create an AI or online room using the existing launch flow.
3. Confirm the authoritative host controls remain present.

From the player Hub:

1. Enter a valid six-character room code.
2. Confirm navigation to the resolved game room.
3. Enter an invalid code and confirm the Hub remains recoverable.

Run:

```powershell
npm run build
npm run smoke
```

Expected: build completes and existing focused room-entry smoke scenarios pass.

## 6. Render validation

After deployment:

1. Open the production `/` page in a fresh browser.
2. Open the production `/host` page.
3. Confirm both role labels and all active-game assets load.
4. Confirm the browser reports no missing title/card images or content-blocking errors.
5. Join one room by code from the player page.
6. Create one room from the host page.
7. Record screenshots and observed results in the feature’s verification artifact.

8. Confirm the Render health endpoint reports healthy.
9. Confirm one browser establishes secure WebSocket connectivity.
10. Disconnect and reconnect an active room client and confirm authoritative state resynchronizes without host promotion or state divergence.

## 7. Evidence

Store approved previews and browser screenshots under:

```text
specs/009-premium-active-hub/evidence/
```

Each verification row must include scenario, expected result, observed result, status, and evidence path.

For reviewer criteria, use at least 10 total reviewers, including at least 5 host-side and 5 player-side reviewers.

For performance criteria, use a cold-cache browser profile, 4G-class throughput throttling, 150 ms added round-trip latency, and the same midrange desktop-class test machine for every run.

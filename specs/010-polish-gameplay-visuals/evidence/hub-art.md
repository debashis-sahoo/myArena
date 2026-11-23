# Hub Artwork Evidence

## Corrected asset

- `client/public/brand/games/ludo.webp`: 768×768, 176,124 bytes.
- The visible playing board is a clear square with equal sides and four correct home zones.
- All Hub card media uses `object-fit: contain` and reserves intrinsic 768×768 dimensions.

## Responsive matrix

Player and host Hub checks passed at:

- 320×568
- 390×844
- 640×360
- 844×390
- 768×1024
- 1024×768
- 1366×768
- 1920×1080
- 2560×1440

Observed:

- four active cards,
- zero broken images,
- no positive horizontal overflow,
- no missing title/tagline/action,
- final mobile host touch targets: 45 px.

## Asset failure

All four `/brand/games/*.webp` requests were aborted:

- exactly four neutral fallbacks rendered,
- each retained its card art box and action,
- Ludo fallback retained 152×167 px on 390×844,
- no overflow was introduced.

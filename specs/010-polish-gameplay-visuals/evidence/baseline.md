# Baseline Evidence: 010 Polish Gameplay Visuals

## Hub

### 1366×768

- Four active cards rendered: Ludo, Housie, Bingo, UNO.
- `document.documentElement.scrollWidth - innerWidth`: 0.
- Confetti pieces: 26.
- Ludo art display box: 295.3 × 184.2 px; source is 768 × 768 but the container currently crops
  using `object-fit: cover`.

### 390×844

- Four active cards rendered in the phone grid.
- No positive horizontal overflow.
- Confetti pieces: 26.
- Ludo art display box: 152.5 × 167.4 px; source and display framing differ visibly.

## Confetti baseline

- Hub atmosphere: 26 generated pieces on phone and desktop.
- Ludo results: 34 generated pieces.
- UNO results: 34 generated pieces.

## Authority and fallback baseline

- Ludo's client receives the authoritative result and only drives presentation from it.
- UNO's client renders `table.winner` and never creates the winner.
- Missing active-game artwork switches to `HubArtFallback` while retaining the card's reserved art
  dimensions and game guidance.

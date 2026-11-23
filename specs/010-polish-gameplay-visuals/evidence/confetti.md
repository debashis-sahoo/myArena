# Confetti Evidence

## Baselines

- Hub: 26 pieces
- Ludo result: 34 pieces
- UNO result: 34 pieces

## Implemented counts

- Hub default: 40 generated; 40 visible desktop, 36 visible phone.
- Ludo result: 48 generated; 36 visible phone under the mobile cap.
- UNO result: 48 generated; 36 visible phone under the mobile cap.

All surfaces exceed their measured baselines and the 24 desktop / 16 phone absolute floors.

## Safety

- Pointer pass-through remains enabled.
- Results/panels remain a higher visible stacking layer.
- Navigation and action controls remain outside the decorative pointer target.

## Reduced motion

At `prefers-reduced-motion: reduce`:

- Hub confetti layer: `display: none`.
- Animated/falling pieces: 0.
- Same result/status text remained available.

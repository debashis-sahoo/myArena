# Contract: Visual, Layout, and Accessibility Behavior

## 1. Ludo die

- At rest, the die exposes rounded/beveled corners, visible face depth, correct pips, and a stable
  ground shadow.
- Pips use a dark recessed treatment with strong contrast.
- Animation uses the authoritative server value; visual direction may vary, but the final face may
  not.
- Normal motion includes lift, travel, spin/tumble, decaying impacts, settle, and a shadow that
  follows apparent height/travel.
- Temporary animations are cleaned up; newer events supersede stale motion.
- Reduced motion uses a short non-spinning result transition with no blur, shake, or travel.

## 2. Housie recent called numbers

- The current ball remains distinct from previous calls.
- Previous calls are ordered newest first.
- On 320–699 px phone portrait with at least ten previous calls and enough height, complete chips
  occupy at least two rows.
- Capacity derives from the measured region, not a fixed screen-width assumption.
- “View all” remains available whenever calls exceed visible capacity.
- No chip, digit, row, dialog control, or touch target clips.
- The full-history dialog is keyboard-operable and restores focus to its trigger.

## 3. Hub thumbnails

- Image regions reserve dimensions before loading.
- Ludo board artwork uses a 1:1 visible playing-board shape.
- Source proportions are preserved with no stretching.
- Art fitting scales uniformly and does not remove the recognisable board edge.
- Title, description, badge, action, and 44 px-class touch targets remain visible.
- Failed artwork uses the neutral Hub fallback without collapsing or changing game identity.

## 4. Confetti

| Surface | Normal piece target | Reduced motion |
|---------|---------------------|----------------|
| Hub atmosphere | ≥24 desktop, ≥16 at 320 px | No animated pieces |
| Ludo results | ≥24 desktop, ≥16 at 320 px | No animated pieces |
| UNO results | ≥24 desktop, ≥16 at 320 px | No animated pieces |

- Confetti uses `pointer-events: none`.
- Result panels, winner identity, standings, actions, and navigation remain readable.
- Confetti begins and ends with its owning surface and cannot persist over another screen.
- Each surface must exceed its measured pre-feature baseline count in addition to meeting the
  absolute desktop and phone floors above.

## 5. Responsive matrix

Verify:

- 320×568
- 390×844
- 640×360
- 844×390
- 768×1024
- 1024×768
- 1366×768
- 1920×1080
- 2560×1440

At each applicable size: no horizontal overflow, clipping, overlap, hidden action, or unreadable
essential text.

## 6. Motion and performance

- Prefer compositing-friendly transforms and opacity.
- Normal use must avoid observable interaction jank or degradation of text/control readability
  during dice or confetti motion.
- Reduced motion preserves the same outcomes and controls without requiring animation.

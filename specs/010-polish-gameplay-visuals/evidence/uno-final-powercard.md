# UNO Final-Powercard Evidence

## Deterministic smoke coverage

`npm run smoke` now checks:

- Final Skip
- Final Reverse
- Final Draw Two
- Final Wild
- Final Wild Draw Four
- Final Skip with forced discard reshuffle
- Final numbered card regression
- Zero-drawable-card invariant failure

Observed:

- 6/6 valid powercard checkpoints continued without `finished`.
- Each received exactly one private replacement.
- The recipient copy carried one `cards` entry; the second viewer's event omitted it.
- Real powercard effects were retained (`skip`, `reverse`, `draw2`, `wild`, `wild4`).
- Forced reshuffle reported `reshuffled: true`.
- The numbered card published one agreed host winner.
- Corrupted state was rejected with no hand/discard/turn mutation and one state-fault log.

## Responsive screen

Active UNO AI room passed 320×568, 390×844, 640×360, 844×390, 768×1024, 1024×768,
1366×768, 1920×1080, and 2560×1440 with:

- zero horizontal overflow,
- seven visible hand cards,
- draw pile and active controls present,
- responsive hand width from 316 px phone to 2304 px ultrawide.

Pending external-equivalent verification: a real two-socket final-powercard reconnect/resync
checkpoint against a deployed Render process.

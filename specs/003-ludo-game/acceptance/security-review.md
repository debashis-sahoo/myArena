# Security Review Addendum: Ludo

Scope: changes made by feature 003 to the platform and the web app, reviewed against constitution Principle V and the
controls in the [001 review](../../001-base-platform-experience/acceptance/security-review.md) and the
[002 addendum](../../002-games-landing-page/acceptance/security-review.md). Self-review on 2026-10-31 against the code and the
automated tests in this repository. It does not cover a deployed Render service.

## What changed

| Change | Risk | Control and evidence |
|--------|------|----------------------|
| Dice, animation seeds and the first player are produced on the server | A client could pick its own roll, or predict rolls | `cryptoDice` uses `node:crypto` `randomInt`. No client message carries a roll, a seed or a seat choice; the game action schema accepts only `roll`, `move` with a pawn number, and `resume` (`parseLudoAction`, `action-parser.test.ts`). The fairness sample (6,000 draws between 15% and 18.5% per face) and the first-seat spread are asserted in `ludo-runner.test.ts`. The seed only shapes the animation; the face is the server's value. |
| New `game.action` intent and `game` message | Injection through game payloads; one member acting as another; flooding | The intent is a strict Zod object (unknown fields rejected), the action type is a short lowercase token, and the member is the authenticated socket's participant, never a field of the message. Ludo re-validates the action. `game.action` counts against the existing per-member intent rate limit (20 per 10 s). `game-channel.test.ts`, `game-channel.contract.test.ts`, `authority.test.ts`. |
| Rejected actions | A refused action leaking or changing state | Every refusal (`NOT_YOUR_TURN`, `ALREADY_ROLLED`, `DIE_STILL_ROLLING`, `MOVE_NOT_ALLOWED`, `NOT_PLAYING`, `MATCH_ENDED`, `NOT_AWAY`, `INVALID_ACTION`) leaves the engine state, the sequence number and the timers unchanged and carries only plain-language text (`ludo-runner.test.ts`, `ludo-runner-settle.test.ts`, `ludo-match.test.ts`). The host has no extra power in a match (`host-game-rules.test.ts`). |
| Room settings for the theme and the turn limit | Invalid or oversized settings; changes mid-match | `ludoSettingsSchema` is strict: five theme ids and four turn limits only, unknown keys and wrong types rejected. The platform refuses any settings change outside the lobby (`ludo-settings.test.ts`). |
| `LUDO_TEST_DICE` environment setting | Scripted rolls on a real service would make wins predictable | Refused at start-up whenever `NODE_ENV=production`, regardless of `DEPLOY_TARGET`, and never listed in `render.yaml` (`ludo-env.test.ts`). Without it the die is `cryptoDice`. |
| Per-member projection of the match | A member without a seat seeing the board | `viewFor` returns `{ kind: 'WAITING' }` and nothing else to a member who joined after the start or lost their seat (`ludo-view.test.ts`, `ludo-match.test.ts`). Ludo has no hidden information, so seated members share one view apart from `you`. |
| Match lifecycle log line | Personal data or game content in logs | Only `{ kind, gameId, seats, durationMs }` is logged, with no room id, name, roll, board, chat text or token (`ludo-logging.test.ts`). The existing log redaction still applies. |
| Solo play runs in the browser | Cheating is possible by design; stored data | Solo is a single-player game against a computer on the player's own device, so it has no authority to protect and sends nothing to the server. Dice use `crypto.getRandomValues`. The saved match is validated field by field on read, discarded after 30 minutes and tolerates blocked storage (`ludo-solo-runner.test.ts`). The saved match holds no display name (a generic name is stored and the current one is shown on restore). |
| Browser storage | Personal data or credentials in storage | Ludo adds `myarena-ludo-quality`, `myarena-ludo-view`, `myarena-ludo-solo-setup` and `myarena-ludo-solo`: choices and a solo match only. No room code, token, other person's data or display name. Every value is validated on read. |
| Three.js loaded on demand with generated assets | Remote code, fonts or images; CSP changes | Three.js is bundled with the app and loaded lazily; the studio lighting is built in, textures are drawn on a canvas, and nothing is downloaded. The canvas is sized without `style` attributes and the CSP is unchanged (`style-src 'self'`). The bundle budget fails the build if 3D code reaches an initial chunk. |
| Tile picture | Script or remote content in an image | An original SVG shipped as a local file: no scripts, no external references or fonts, 5.4 KB, loaded as an `<img>` (which never runs scripts), with the icon art as the fallback. The build fails if a tile picture exceeds 100 KB. |

## Residual risks

- A solo match is on the player's own device and can be edited there; nothing about it is shared or ranked.
- Automatic play and away handling use the room's clock; a player who is disconnected keeps their seat for the platform's
  10-minute recovery window while the game plays for them, as designed.
- The 3D scene runs on the player's graphics hardware; a driver fault is handled by falling back to the flat board.

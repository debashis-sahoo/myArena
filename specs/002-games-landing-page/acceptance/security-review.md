# Security Review Addendum: Games Landing Page

Scope: changes made by feature 002 to the base platform, reviewed against constitution Principle V
and the controls in the [001 security review](../../001-base-platform-experience/acceptance/security-review.md).
Self-review on 2026-10-30 against the code and automated tests in this repository. It does not
cover a deployed Render service.

## What changed

| Change | Risk | Control and evidence |
|--------|------|----------------------|
| `TEST_GAME_SECONDS` is now accepted in production mode when `DEPLOY_TARGET=preview` | A test game, or a game with no rules, could appear on the real service | Both keys are in `render.yaml` without values, so nothing is set by the blueprint. `DEPLOY_TARGET` defaults to `production` and only accepts `production` or `preview`. Without the preview target the server still refuses to start (`apps/server/tests/unit/env-guard.test.ts`). The catalog labels test games "Test game". Before a deployment is called production, confirm neither key is set (quickstart scenario 15). |
| New public `GET /api/catalog` | Information disclosure; scraping; load | Returns only static game presentation data (names, descriptions, ranges, art enums). No room, visitor, or secret data. Validated by schema before sending (`buildCatalog`). Uses the same per-IP per-minute limit as invitation preview. Responses are `Cache-Control: no-store` like every `/api/` route. |
| `POST /api/rooms` accepts `gameId` and `maxParticipants` | Input abuse; capacity pressure; unknown game ids | Strict body schema (unknown fields rejected); the server validates the game id, that it supports online rooms, and an integer count inside `max(2, min)` to `min(100, max)`. Failures return `GAME_UNAVAILABLE` (409) or `VALIDATION_FAILED` (400) with field errors and create no room (`room-setup.test.ts`, `room-setup.contract.test.ts`). Capacity limits, rate limits and the idempotency fingerprint (now including both fields) are unchanged in behavior. |
| Browser keeps a display name, effects and sound preferences, and the last room id in `localStorage` | Personal data; credential exposure | Only a display name (already shown to room members) and non-sensitive preferences. The room id is not a credential: the HttpOnly member cookie remains the only proof of a seat. No value leaves the device. Values are validated on read and tolerate blocked storage. |
| Game art is drawn from fixed enums by the web app | Script or style injection from game data | No image files, no inline `style` attributes, no remote fonts or images. The CSP is unchanged (`style-src 'self'`). Art values are enums validated on both server and client. |
| Solo modules are lazily imported by a web registry | Loading unexpected code | The registry is a static map in the bundle; the route parameter is looked up with `Object.hasOwn`, so unknown ids and inherited property names load nothing (`solo-registry.test.tsx`). |

## Residual risks

- A preview deployment shows a test game to anyone who can reach it; previews should not hold
  real data and should not be shared as production.
- `GET /api/catalog` is public by design. It reveals the roadmap, which is placeholder content.
- Clearing site data forgets the name and the last room; the seat itself follows the 001 recovery
  rules.

# Azure Release Verification

## Local preparation baseline

- 2026-11-27: `npm ci` completed and all workspaces built.
- 2026-11-27: `npm run smoke` passed all room-engine scenarios with zero host-ownership
  violations.
- 2026-11-27: staging-mode smoke passed with an unexpired candidate verifier, and confirmed that a
  socket without `auth.candidateVerifier` could not create a room.
- 2026-11-27: `az bicep build --file infra/main.bicep` passed. The only remaining compiler warning
  is the nullable AVM output for the system-assigned identity.
- 2026-11-27: privacy/volume and metered-traffic verification scripts passed.
- 2026-11-27: immutable ZIP packaging dry-ran twice from identical local inputs and produced the
  same digest (`sha256:3f20f2810380fc50504c0f8fda093e68b66ed5e65f9a76c63b3c5742e5d25816`).
  The production script rejects a dirty worktree; the local repeatability check used
  `ALLOW_DIRTY_ARTIFACT=1` and is not release evidence.
- 2026-11-27: a cost-contract sample of USD 73.35 passed the USD 80 gate, a 60% cached-transfer
  reduction sample passed the 50% threshold, and a complete release-evidence sample passed the
  timing and 30-minute-deadline assertions.

## Runtime protocol

Expected: physical production accepts public room creation; physical staging accepts
unauthenticated existing-room resume but rejects new-room creation unless the socket has the
short-lived candidate verifier and normal host-entry capability.

Observed locally: both production-mode smoke and staging-mode smoke passed. The raw candidate
verifier is supplied only in the Socket.IO handshake and is absent from evidence and log output.

## Connection banner visual evidence

Expected: the reconnect state is readable, never claims a scale-from-zero wake-up, fits the
viewport, and exposes a retry action after the reconnect timeout.

Observed:

| Viewport | Orientation | Result |
|---|---|---|
| 320x568 | Phone portrait | No horizontal overflow; banner fit the viewport |
| 568x320 | Phone landscape | No horizontal overflow; banner fit the viewport |
| 768x1024 | Tablet portrait | No horizontal overflow; banner fit the viewport |
| 1024x768 | Tablet landscape | No horizontal overflow; banner fit the viewport |
| 1440x900 | Desktop landscape | No horizontal overflow; banner fit the viewport |
| 900x1440 | Desktop portrait | No horizontal overflow; banner fit the viewport |

After the local server was stopped with an active room, the UI showed
`Connection lost. Reconnecting...`, then `Still cannot reach the arena.` with `Retry now`.

- [Phone screenshot](evidence/connection-banner-phone.png)
- [Desktop screenshot](evidence/connection-banner-desktop.png)

## Azure-only verification pending

The following checks require approved Azure provisioning and the protected GitHub environment:

- V2 provider, policy, quota, and live cost preflight;
- V3 real staging hostname and browser-compatible secure WebSocket;
- V4 forward swap and 30-minute no-restart drain;
- V5 500 concurrent connections on S1 and 24-hour Always On;
- V6 retained Application Insights/Log Analytics evidence;
- V7 forward and reverse rollback drain;
- V8 live 30-day cost and idle-transfer evidence.

These items are not marked complete or represented as deployment validation.

## Live infrastructure evidence

- 2026-11-28: ARM deployment `myarena-s1-initial` succeeded in `myArena`.
- 2026-11-28: App Service plan is Linux S1, Central India, one worker.
- 2026-11-28: production and staging identities each have one `Monitoring Metrics Publisher`
  assignment on the Application Insights resource.
- 2026-11-28: production Web App is Running with Always On, WebSockets, HTTPS-only, Node.js 22,
  one worker, and `/healthz`.
- 2026-11-28: live staging qualification reached 500 concurrent connections across 50 rooms.
  The measured p50/p95/p99 acknowledgements were 227/273/391 ms. The run still failed before
  cutover because expiry-dependent local smoke assertions used a 3-second expectation against the
  production 60-second reconnect window; candidate-only smoke now excludes those timing tests.
- 2026-11-28: GitHub OIDC client and exact hardened `main`, `pull_request`, and
  `environment:production` federated credentials were created.
- Blocked before app deployment: GitHub CLI is authenticated to `msft.ghe.com`, while GitHub.com
  authentication is invalid. No source commit, push, ZIP deployment, protected swap, or public
  cutover has been performed.

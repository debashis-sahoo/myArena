# Implementation Plan: Azure Release Pipeline

**Branch**: `011-azure-release-pipeline` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-azure-release-pipeline/spec.md`

## Summary

Deploy myArena to one Azure App Service Linux S1 plan in `DebFTESub` / `myArena`, Central India.
The S1 plan keeps the Node.js 22 application Always On and provides a staging deployment slot.
GitHub Actions produces one immutable ZIP artifact, validates it, deploys it to staging, warms and
tests the candidate, and requires protected-environment approval before swapping staging with
production.

The existing server remains a single authoritative in-memory process. ARR affinity and a
one-instance App Service plan keep each connected room on the process that owns its state. Before
using App Service horizontal autoscale, a separate feature must externalize room state or provide
safe room-to-process routing. The S1 release therefore treats successful 500-connection operation
on one instance as a blocking load-test gate.

Slot identity is slot-sticky and does not change during a release: the physical `production` slot
always accepts public new rooms, while the physical `staging` slot never accepts unauthenticated
new rooms. The release workflow distinguishes candidate and draining phases in evidence, not by
mutating runtime app settings. This avoids recycling the old process when its code moves from
production to staging during the swap.

After a slot swap, new visitors use the physical production slot while existing clients retain the
old slot origin for reconnect during a 30-minute drain. Connected clients receive a rolling
short-lived hint; reconnect tries production first and then the exact allowlisted old origin.
Candidate-only staging room creation is available solely to the release verifier through a
short-lived, slot-sticky verification token. At the evidence deadline, the old slot is stopped and
any remaining rooms receive the existing room-ended outcome. Rollback swaps back during the drain
or redeploys the last retained healthy artifact afterward.

## Technical Context

**Language/Version**: TypeScript on Node.js 22; React/Vite client

**Primary Dependencies**: Express, Socket.IO, Pino, React, Vite; GitHub Actions; Azure App Service
Linux S1; Log Analytics; workspace-based Application Insights

**Storage**: Game rooms remain in one process. No gameplay database is introduced. Release
evidence, immutable deployment ZIPs, and the last healthy rollback artifact are retained in the
CI/deployment system with bounded retention.

**Testing**: Existing build and smoke commands plus a 500-connection load scenario on one S1
instance, staging warm-up, HTTPS/WebSocket test, slot swap continuity, reconnect-to-draining-slot
test, 30-minute drain, rollback, telemetry privacy/cost, and 24-hour idle/warm-app checks

**Target Platform**: Azure public cloud, Central India; Linux Azure App Service; GitHub Actions

**Project Type**: Single-origin, single-instance stateful Node.js web service with an inactive
deployment slot

**Performance Goals**: 95% of player-visible room updates complete within 2 seconds at 500
concurrent connections on one S1 instance; the landing page is usable within 10 seconds after
24 hours without traffic; routine approved deployment completes within 15 minutes; rollback
completes within 10 minutes

**Constraints**: Always-on paid S1 baseline of approximately USD 69.35/month; total projected
idle/low-traffic Azure cost must remain at or below USD 80/month; one authoritative instance
because room state is in memory; 30-minute maximum drain; no zero-capacity or wake-up workflow;
West Europe blocked by policy; metered build and telemetry volume

**Scale/Scope**: One Linux S1 plan, one production Web App, one staging slot, one Log Analytics
workspace, and one Application Insights resource in `myArena`; 500 concurrent connections; one
stateful worker instance until shared room state is implemented

## Constitution Check

*GATE: Pass before Phase 0 research and re-check after Phase 1 design.*

| Constitution rule | Plan response | Gate |
|---|---|---|
| Canonical repository and Azure scope | Bicep and CI target `DebFTESub` and `myArena` explicitly | PASS |
| Central India / West Europe policy | S1 plan and all supporting resources use Central India; policy is a preflight gate | PASS |
| Readiness-gated release | Candidate is deployed to staging, warmed, tested, approved, then swapped | PASS |
| WebSocket and reconnect behavior | Linux S1 supports WebSockets; client retains a rolling production/draining-origin hint with staging CORS restricted to production | PASS WITH LIVE SWAP TEST |
| Active room drain | Existing connections remain on the old slot while new traffic uses the swapped production slot, for at most 30 minutes | PASS WITH SWAP TEST |
| No cold start | Always On and one instance keep the S1 Web App warm | PASS |
| Managed identity and no static credentials | GitHub uses OIDC; runtime uses managed identity; no client secrets in source | PASS |
| Bounded telemetry and privacy | Aggregate signals, sampled traces, 30-day retention, daily cap, no chat/secret content | PASS |
| 500-connection performance | One Linux S1 instance is load-tested; no release if it misses the 2-second target | PASS WITH LOAD TEST |
| No unsafe horizontal scale-out | App Service plan remains at one instance; autoscale is blocked until state is shareable | PASS WITH EXPLICIT CONSTRAINT |

**Initial result**: No unjustified violation. The original scale-to-zero and USD 10 requirements
are superseded by the maintainer's explicit S1 choice and revised specification. The deliberate
tradeoff is higher fixed cost and no scale-from-zero behavior in exchange for Always On and
deployment slots.

## Phase 0: Research

### R1. Hosting service

- **Decision**: Use Azure App Service Linux S1 in Central India.
- **Rationale**: S1 is the lowest Standard tier with Always On, staging slots, Standard autoscale
  capability, secure WebSockets, a production-oriented SLA, and a published estimate around
  USD 69.35/month. Linux paid SKUs support roughly 50,000 concurrent WebSockets per instance;
  CPU and memory remain the practical limits and require load testing.
- **Alternatives considered**: App Service F1 (not production, no slot, tiny CPU/WebSocket quota),
  B1 (no deployment slots or Standard autoscale), Container Apps (rejected by maintainer because
  it introduces cold starts and a more complex router topology), and AKS (unnecessary cost and
  operational overhead).

### R2. Deployment topology

- **Decision**: One Web App with a production slot and one `staging` slot on one S1 plan.
- **Rationale**: The staging slot is warmed and validated under a separate hostname. A slot swap
  moves candidate routing to production without rebuilding. The old app remains in staging to
  drain existing rooms for 30 minutes, after which it is stopped.
- **Alternatives considered**: Direct-to-production ZIP deployment (no safe warm-up/rollback),
  separate Web Apps (unnecessary additional names and routing complexity), and Container App
  blue/green (incompatible with the S1 choice).

### R3. Existing connection and room continuity

- **Decision**: Keep the old slot process alive for 30 minutes and store its origin in the client
  as a rolling short-lived reconnect hint.
- **Rationale**: After a swap, existing WebSockets may remain connected to the old process. If a
  client must reconnect, it probes production first and then the old slot origin. A hint only
  routes; the server still validates guest identity, room code, and host permissions. The hint is
  refreshed through the established room socket path so its expiry is no more than 30 minutes
  after the last server-issued update. The workflow owns the exact swap and retirement timestamps.
- **Alternatives considered**: Immediate room termination (violates the chosen drain policy),
  persistent room state (separate major data-model feature), and ARR cookie copying between slots
  (not a supported or auditable room-routing contract).

### R3a. Slot identity and role transition

- **Decision**: Give each physical slot an immutable slot-sticky identity. `production` derives
  public room admission; `staging` derives candidate/draining admission rules. The workflow tracks
  `candidate`, `active`, `draining`, and `stopped` release phases in release evidence rather than
  rewriting app settings after cutover.
- **Rationale**: A post-swap change to `SLOT_ROLE`, `ACCEPTS_NEW_ROOMS`, or
  `DRAIN_DEADLINE_UTC` can recycle the App Service process and destroy the in-memory room state
  that the drain is meant to preserve. Staging therefore rejects unauthenticated `room:create`
  before and after the swap. Candidate smoke creation is enabled only for the verifier by a
  short-lived token configured on staging as a hash before the candidate starts. The release
  verifier supplies the raw value in `Socket.IO auth.candidateVerifier`; it is not included in a
  room payload. The server timing-safely compares its SHA-256 digest, checks expiry, and retains
  the existing host-entry authorization. No normal game client receives the capability.
- **Drain deadline rule**: The release workflow records `swapCompletedUtc`, derives
  `drainDeadlineUtc = swapCompletedUtc + 30 minutes`, and stops staging no later than that
  deadline. It never writes the deadline into the running old process.
- **Alternatives considered**: Updating sticky role/deadline settings after swap (unsafe process
  recycle), restarting staging as an explicit drain mode (destroys old rooms), and running a
  separate blue Web App (adds a second service and configuration/cost surface).

### R4. Scale model

- **Decision**: Pin the App Service plan to one S1 instance and disable horizontal autoscale.
- **Rationale**: The current `RoomStore` is in-process. If App Service scales to multiple
  instances, different participants in one room can land on different workers and the room cannot
  be resolved consistently. ARR affinity keeps one client sticky but does not guarantee that all
  participants in one room share an instance.
- **Performance condition**: The 500-connection test must meet the two-second p95 target. If it
  fails, the plan must scale vertically to a larger Standard/Premium instance or add a shared room
  store before enabling multi-instance autoscale.
- **Alternatives considered**: Enabling Standard autoscale immediately (unsafe with in-memory
  room state), Redis adapter alone (does not externalize the room and game object), and
  Container Apps revision scaling (rejected by the S1 selection).

### R5. Deployment recipe and identity

- **Decision**: Use GitHub Actions, Bicep, ZIP Deploy to staging, slot warm-up/swap, and GitHub
  OIDC.
- **Rationale**: ZIP Deploy avoids a registry and keeps metered transfer lower than rebuilding and
  pulling container layers. The staging slot isolates the candidate and OIDC avoids a long-lived
  Azure credential.
- **Alternatives considered**: ACR/container image deployment (unnecessary for App Service code
  deployment), stored Azure service-principal secrets, and direct portal deployment.

### R6. Release and rollback

- **Decision**: Protected `production` GitHub environment; production traffic changes only through
  a slot swap.
- **Rationale**: S1 Standard provides five slots. Candidate checks and approval happen while
  production remains live. During the 30-minute window, swap-back is immediate; after retirement,
  the pipeline redeploys the retained last healthy ZIP without rebuilding.
- **Execution gate**: Required reviewers must be available for the repository's visibility and
  GitHub plan. A workflow without protection is not acceptable.
- **Performance gate**: Before the first production swap for this topology, the candidate must
  pass the one-worker 500-connection qualification. The US1 staging/swap mechanics may be
  validated first, but no public production cutover occurs before that gate.

### R7. Observability

- **Decision**: Use App Service metrics and diagnostics, Log Analytics, and workspace-based
  Application Insights with bounded sampling and retention.
- **Rationale**: Required categories include availability, request failure, response duration,
  active connections, room count, restart count, deployment/swap health, CPU, memory, and HTTP
  queue depth. The Log Analytics daily cap remains 0.1 GB and retention remains 30 days.
- **Alternatives considered**: Console logs only, unbounded 100% tracing, and external hosted
  telemetry.

### R8. Cost

- **Decision**: Plan for one S1 Linux instance in Central India at approximately USD 69.35/month,
  plus low-volume storage/telemetry and egress; use USD 80/month as the release estimate gate.
- **Rationale**: The user explicitly selected S1. The plan favors no cold start and built-in slots
  over scale-to-zero. The monitoring target remains within the 5 GB/month Analytics grant when
  collection stays bounded.
- **Alternatives considered**: F1 (not production), B1 (no deployment slots/Standard autoscale),
  Container Apps (lower idle cost but cold starts/router complexity), and a higher Premium tier
  (not justified until S1 load or feature requirements demand it).

### R9. Policy, region, and quota

- **Decision**: Central India remains the production region with preflight gates.
- **Rationale**: App Service, Log Analytics, and Application Insights are available there and the
  subscription blocks West Europe. The first implementation verifies the S1 worker is available,
  records one-instance plan capacity, and rechecks policy before mutation.

## Phase 1: Design & Contracts

### Deployment topology

1. **App Service plan**: Linux S1, one worker, Always On.
2. **Production Web App**: active Node.js 22 application and the only public release hostname.
3. **Staging slot**: candidate Web App and post-swap drain endpoint.
4. **Application Insights + Log Analytics**: one workspace with bounded sampling/retention.
5. **Key Vault or equivalent secure app settings boundary**: no committed deployment secrets.
6. **GitHub Actions artifacts**: immutable SHA-tagged ZIP and evidence; retain the previous healthy
   ZIP for rollback.

### Release sequence

1. CI verifies lockfile, build, smoke test, Bicep, App Service availability, subscription policy,
   region, and live cost estimate.
2. CI produces one SHA-tagged ZIP and records the artifact digest and source revision.
3. Configure a cryptographically random, short-lived verifier token hash and expiry only on
   `staging`; this candidate-only change may restart staging but cannot touch production.
4. Deploy the ZIP to `staging`; preserve production slot settings.
5. Warm staging and test health, HTTPS, secure WebSocket, and a verifier-only create/join/chat/game
   room. Confirm an unauthenticated new-room request is rejected and production is unchanged.
6. Wait for protected `production` approval; no second release may proceed while a drain is active.
7. Acquire the release/drain lock and record the prepared rollback artifact.
8. Swap staging to production. Do not update either slot's role, room-admission, origin, or
   deadline app setting after this point.
9. Record `swapCompletedUtc` and `drainDeadlineUtc` in release evidence. The physical production
   slot now accepts public new rooms; the physical staging slot rejects unauthenticated new rooms
   and permits valid existing-room reconnects.
10. Existing clients keep the rolling reconnect hint for at most 30 minutes. Reconnect probes the
    production origin first and then the exact production-allowlisted staging origin.
11. Verify new-room routing, production health, secure staging reconnect, stale/new-room rejection,
    and the absence of post-swap runtime-setting changes.
12. At the earlier of zero active rooms or `drainDeadlineUtc`, stop staging and record the result.
    Expire the verifier capability; it is never usable on production and is never required for
    gameplay reconnect.
13. Record commit, artifact digest, approver, endpoint, health, cost, cutover/drain timestamps, and
    rollback artifact. Rollback swaps back only within the retained drain window; afterward,
    redeploy the retained previous ZIP without rebuilding.

### Reverse drain on rollback

If rollback occurs during the forward drain, rooms may exist in both the old production process
and the newly swapped candidate process. The rollback is therefore a reverse cutover:

1. Acquire the existing drain lock and swap staging back to production without changing app
   settings.
2. The previous healthy release becomes the public production process again; the candidate moves
   to staging and rejects all new unauthenticated room creation.
3. New candidate-room reconnects use the same production-first, allowlisted-staging fallback.
4. The workflow records a rollback-specific deadline at most 30 minutes after the reverse swap and
   retires the candidate process no later than that deadline or when no candidate rooms remain.
5. A subsequent forward release remains locked until both the rollback cutover and reverse drain
   are closed.

Only one swap/drain may be active at a time.

### Project Structure

#### Documentation (this feature)

```text
specs/011-azure-release-pipeline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── slot-routing.md
│   ├── pipeline-evidence.md
│   └── telemetry.md
└── tasks.md
```

#### Expected implementation surface

```text
.azure/
└── deployment-plan.md

.github/
└── workflows/
    └── azure-release.yml

infra/
├── main.bicep
├── main.bicepparam
└── modules/
    ├── app-service-plan.bicep
    ├── web-app.bicep
    ├── staging-slot.bicep
    ├── monitoring.bicep
    ├── identity.bicep
    └── app-settings.bicep

client/src/state/
└── socket.ts                    # Production/staging reconnect hint

server/src/
├── index.ts                     # Socket.IO production-origin allowlist
├── config.ts                    # Immutable slot identity and verifier safeguards
└── sockets/registerHandlers.ts  # Admission, candidate verifier, and rolling reconnect hint
```

**Structure Decision**: Keep the Node/React monorepo as one deployable unit and one source of
truth. Use App Service slots, not separate services, to isolate candidate and prior production
versions. Horizontal autoscale remains disabled until authoritative room state is made shareable.

## Complexity Tracking

| Complexity | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Client reconnect fallback to old slot | Preserves existing rooms across swap if the socket drops during the 30-minute drain | Production-only reconnect would lose rooms owned by the old process |
| Immutable slot identity plus workflow release phase | Prevents production/staging admission rules from moving with code and avoids a post-swap restart | Mutating runtime role settings would recycle the old process and can destroy in-memory rooms |
| Ephemeral candidate verification capability | Lets the pipeline test room creation on staging without opening public new-room creation before cutover | Anonymous staging room creation creates an undisclosed public game endpoint |
| Immutable ZIP and retained rollback artifact | Restores the prior version without rebuilding from a mutable dependency state | Source rebuild can differ and delays rollback |

## Post-Design Constitution Check

All gates pass with the approved S1 tradeoff. The design uses the canonical Azure scope, managed
identity/OIDC, Bicep, readiness-gated slot swaps, HTTPS/WebSocket verification, bounded telemetry,
and no gameplay-state migration. The single-instance cap and revised USD 80 estimate are explicit
because S1 is always on and the existing room state cannot safely scale horizontally.

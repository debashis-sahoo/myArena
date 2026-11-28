# Data Model: Azure Release Pipeline

Gameplay state remains in the authoritative Node.js process. The feature persists release evidence
and a short-lived client reconnect hint; it does not create a gameplay database.

## ReleaseCandidate

| Field | Meaning | Validation |
|---|---|---|
| `commitSha` | Source identity | 40-character Git SHA |
| `artifactDigest` | Immutable ZIP identity | SHA-256 digest |
| `dependencyFingerprint` | Lockfile/cache identity | Stable hash |
| `targetSlot` | Candidate deployment slot | `staging` |
| `region` | Production region | `centralindia` unless governance is amended |
| `appServiceSku` | Planned hosting tier | `S1` |
| `buildRun` | CI identity | Repository run ID and attempt |
| `verificationResults` | Build/readiness/HTTPS/WebSocket/load evidence | Required before approval |
| `costEstimate` | S1 plus projected low-traffic supporting cost | At or below USD 80 unless approved exception |
| `approval` | Protected-environment decision | Required before swap |
| `rollbackCandidate` | Previous healthy artifact | Valid artifact identity |

**Lifecycle**: `building` → `built` → `preflighted` → `deployed-to-staging` → `verified` →
`approved` → `active` or `rejected`. `active` may later become `draining` and `retired`.

## DeploymentSlot

| Field | Meaning | Validation |
|---|---|---|
| `name` | Production or staging slot | `production` or `staging` |
| `webAppResourceId` | App Service slot identity | In `myArena` |
| `identity` | Immutable physical slot identity | `production` or `staging`; slot-sticky |
| `releasePhase` | Workflow phase for the current artifact | `candidate`, `active`, `draining`, or `stopped` |
| `releaseId` | Current artifact | Artifact digest |
| `acceptsPublicNewRooms` | Derived runtime admission rule | True only for `identity=production` |
| `drainDeadlineUtc` | Workflow-owned latest reconnect/drain point | Required in evidence when draining; never a post-swap app setting |
| `roomConnections` | Aggregate active WebSocket count | Non-negative integer |
| `roomCount` | Aggregate active room count | Non-negative integer |

**Invariant**: Exactly one slot is public production. At most one prior slot is draining. A second
swap is rejected while a drain remains active. Runtime identity is never mutated to enter drain;
the workflow controls the phase and retirement deadline. `acceptsPublicNewRooms` is derived only
from immutable physical identity; it is not a separately writable environment setting.

## CandidateVerification

Ephemeral release-only capability used to create a controlled test room on the non-production
candidate.

| Field | Meaning | Validation |
|---|---|---|
| `tokenHash` | Digest of workflow-generated capability | SHA-256; slot-sticky on staging only; compared timing-safely |
| `expiresUtc` | Capability expiry | At most 30 minutes and before cutover |
| `transport` | Delivery to the server | Socket.IO handshake `auth.candidateVerifier`; never a room payload |
| `scope` | Allowed operation | Candidate `room:create` only, in addition to normal host-entry authorization |
| `usedBy` | Release run identity | Required in evidence; no client-visible value |

The token itself is never committed, never copied to the production slot, and is invalid for
ordinary gameplay after expiry. Expiring or clearing it requires no post-swap process setting
change because it remains attached only to the physical staging slot.

## RoomReconnectHint

Client-held, short-lived routing information. It identifies the process that owns an existing room;
it is not authorization.

| Field | Meaning | Validation |
|---|---|---|
| `gameId` | Registered active game | Allowed game identifier |
| `roomId` | Existing room identity | Valid six-character code |
| `origin` | Production or draining slot origin | Exact allowlisted HTTPS origin |
| `validUntilUtc` | Rolling reconnect deadline | At most 30 minutes after server issuance |

The backend still validates guest identity, room membership, host permissions, and state. The
workflow's exact drain deadline is authoritative for slot retirement; the hint expiry is an
independent client-side upper bound.

## DeploymentEvidence

| Field | Meaning | Validation |
|---|---|---|
| `sourceRevision` | Git commit | Immutable SHA |
| `artifactDigest` | ZIP digest | SHA-256 |
| `checks` | Required validation outcomes | All blocking checks pass |
| `approval` | Reviewer and timestamp | Required for swap |
| `publicEndpoint` | Verified production HTTPS URL | Required after provision |
| `swapStartedUtc` / `swapCompletedUtc` | Cutover timing | UTC timestamps; completion required |
| `drainDeadlineUtc` | Old-slot retirement point | Exactly completion plus 30 minutes |
| `retiredUtc` | Actual staging stop time | At or before deadline |
| `cutoverDirection` | Forward or rollback traffic transition | `forward` or `rollback` |
| `postSwapSettingMutation` | Runtime restart risk check | Must be absent |
| `rollbackArtifact` | Prior healthy ZIP | Required before cutover |
| `costEstimate` | S1 and supporting monthly cost | At or below USD 80 unless approved |

## OperationalSignal

| Field | Meaning | Validation |
|---|---|---|
| `timestampUtc` | Event time | UTC |
| `releaseId` | Running artifact digest | Known release |
| `slot` | Runtime source | `production` or `staging` |
| `category` | Essential event family | Allowlist only |
| `severity` | Diagnostic severity | Info/warning/error/critical |
| `safeCorrelationId` | Cross-component identifier | Non-user random ID |
| `metric` | Aggregate measurement | Finite numeric value and unit |

Forbidden fields: secrets, access tokens, chat, raw Socket.IO payloads, cookies, display names, and
guest identifiers.

## CapacityPolicy

| Field | Meaning | Validation |
|---|---|---|
| `workerCount` | App Service worker count | Exactly 1 until shared-state feature |
| `maxConnections` | Production connection ceiling | 500 |
| `alwaysOn` | Warmth behavior | Required |
| `drainMinutes` | Maximum old-slot drain | 30 |
| `dailyIngestionGb` | Log Analytics/App Insights cap | 0.1 GB/day initial default |
| `retentionDays` | Telemetry retention | 30 |
| `warningPercent` | Cap warning threshold | 70% |
| `monthlyCostCeilingUsd` | Approved S1-plus-supporting estimate | 80 |

# Tasks: Azure Release Pipeline

**Input**: Design documents from `/specs/011-azure-release-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are implemented as focused build, smoke, load, swap, rollback, privacy, and cost
validation scripts because the feature explicitly requires those acceptance checks; no general test
harness is added.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as
an independent operational increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when its dependencies are complete and it touches different files.
- **[Story]**: Required only in a user-story phase (`[US1]` through `[US4]`).
- Every task includes an exact repository path.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the S1 deployment target and implementation boundaries without provisioning
or changing runtime behavior.

- [X] T001 Confirm the maintainer has approved S1/App Service, the approximately USD 69.35/month
  S1 estimate, and the USD 80/month total gate in `.azure/deployment-plan.md`; record the explicit
  approval before any validation that provisions or changes Azure resources
- [X] T002 [P] Add an `azure-release` task grouping and shared shell entry points in
  `package.json` for build, artifact, preflight, smoke, and verification commands
- [X] T003 [P] Add the Azure App Service ZIP deployment artifact boundary to `.gitignore` without
  ignoring source Bicep, workflow, or evidence files
- [X] T004 [P] Create the Bicep layout documented in the plan with `infra/main.bicep`,
  `infra/main.bicepparam`, and `infra/modules/.gitkeep`
- [X] T005 [P] Create a deployment runbook placeholder at
  `specs/011-azure-release-pipeline/implementation-notes.md` that links the preflight, approval,
  swap, rollback, and evidence contracts
- [X] T006 [P] Create `.azure/oidc-inputs.example.json` with canonical repository, environment,
  subscription/resource-group scope, and no-secret placeholders; do not create a second Bicep
  parameter contract
- [X] T007 [P] Create `scripts/azure/assert-production-environment.ps1` to configure or verify the
  GitHub `production` environment's required reviewer, branch restriction, wait timer, and
  self-review policy, and to fail a release when protection cannot be verified
- [X] T008 Run `npm ci` and `npm run build` from the repository root and record the clean baseline
  in `specs/011-azure-release-pipeline/verification.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the one-worker S1 infrastructure, shared slot-state contract, release
evidence, and preflight safety gates required by every story.

**CRITICAL**: Do not deploy or enable production traffic until this phase passes.

- [X] T009 Create `infra/modules/app-service-plan.bicep` for Linux S1 in `centralindia`, with
  one worker, reserved Linux compute, HTTPS-capable operation, and no autoscale resource
- [X] T010 [P] Create `infra/modules/web-app.bicep` for the Node.js 22 production Web App with
  Always On, WebSockets, ARR affinity, `/healthz`, `WEBSITE_RUN_FROM_PACKAGE`, and a system-assigned
  managed identity
- [X] T011 Create `infra/modules/staging-slot.bicep` with one `staging` slot, immutable slot-sticky
  `SLOT_IDENTITY=staging`, production/staging reconnect origins, ephemeral candidate-verifier
  settings, and the same runtime/health configuration as production
- [X] T012 [P] Create `infra/modules/monitoring.bicep` for one workspace-based Application Insights
  resource and one Log Analytics workspace with 30-day retention and a 0.1 GB/day cap
- [X] T013 [P] Create `infra/modules/app-settings.bicep` to define slot-sticky
  `SLOT_IDENTITY`, `PUBLIC_ORIGIN`, `DRAIN_ORIGIN`,
  `CANDIDATE_VERIFIER_TOKEN_HASH`, `CANDIDATE_VERIFIER_EXPIRES_UTC`, `RELEASE_ID`, and
  `APPLICATIONINSIGHTS_CONNECTION_STRING`; keep `DRAIN_DEADLINE_UTC` out of app settings because
  the workflow owns it after swap and must not restart the old process; derive room admission only
  from immutable `SLOT_IDENTITY`
- [X] T014 [P] Create `infra/modules/identity.bicep` for App Service managed identity outputs and
  least-privilege role-assignment scopes under `myArena`
- [X] T015 Wire T009-T014 into `infra/main.bicep` and `infra/main.bicepparam` with the constitutional
  subscription/resource-group scope, Central India, S1, one worker, names, tags, and module outputs
- [X] T016 [P] Create `scripts/azure/preflight.ps1` to verify active account, tenant, subscription
  `ec7b61df-f90c-4c20-b089-847e999236d5`, resource group `myArena`, Central India, required
  providers, S1 availability, one-worker quota, policy exclusions, and the USD 80 cost gate
- [X] T017 [P] Create `scripts/azure/assert-s1-single-worker.ps1` to fail if the App Service plan
  has autoscale enabled or more than one worker while authoritative room state remains in memory
- [X] T018 [P] Create `scripts/release/create-artifact.mjs` to run the production build, produce one
  deterministic SHA-tagged ZIP, calculate source/artifact digests, and emit a manifest without
  environment secrets
- [X] T019 [P] Create `scripts/release/write-evidence.mjs` implementing
  `contracts/pipeline-evidence.md`, including commit SHA, artifact digest, target scope, S1 cost
  estimate, checks, approval, swap start/completion, exact drain deadline, retirement, elapsed
  duration, and rollback candidate
- [X] T020 Define immutable slot identity, workflow release phase, candidate verification, and
  evidence TypeScript types in `shared/src/protocol.ts`: physical identity is
  `"production" | "staging"`; phase is `"candidate" | "active" | "draining" | "stopped"`;
  `RoomReconnectHint` requires `gameId`, six-character `roomId`, exact allowlisted HTTPS `origin`,
  and server-issued `validUntilUtc`
- [X] T021 Add slot/deployment settings to `server/src/config.ts` with explicit validation for
  `SLOT_IDENTITY`, `PUBLIC_ORIGIN`, `DRAIN_ORIGIN`,
  `CANDIDATE_VERIFIER_TOKEN_HASH`, `CANDIDATE_VERIFIER_EXPIRES_UTC`, `RELEASE_ID`, and `PORT`;
  derive public admission from physical slot identity and reject invalid HTTPS origins or token
  settings, missing verifier expiry, or a legacy conflicting `ACCEPTS_PUBLIC_NEW_ROOMS` setting
  at startup
- [X] T022 [P] Add short, safe release-event names and redaction fields to `shared/src/protocol.ts`
  for evidence and aggregate room/connection metrics; never include guest IDs, display names,
  cookies, tokens, chat, or raw Socket.IO payloads
- [X] T023 Run `npm run build -w shared -w server -w client` plus Bicep build on
  `infra/main.bicep`, record results in `specs/011-azure-release-pipeline/verification.md`, verify
  the immutable slot identity and one-worker state are representable, and move
  `.azure/deployment-plan.md` to `Ready for Validation` before T024-T039 may change or deploy Azure
  resources

**Checkpoint**: S1 infrastructure and release-state contracts are representable, validated, and
still unprovisioned.

---

## Phase 3: User Story 1 - Release Safely to Azure (Priority: P1) 🎯 MVP

**Goal**: A maintainer can build, validate, deploy to staging, approve, swap, drain, and roll back
an immutable App Service release without local-machine dependence.

**Independent Test**: From a clean commit, run the release workflow through protected approval,
observe staging become healthy, complete a non-production forward/reverse swap drill, verify room
admission and rollback behavior, then inspect the release evidence. The first public production
cutover remains gated by US2's S1 500-connection qualification.

### Implementation for User Story 1

- [X] T024 [US1] Implement production/staging ZIP deployment orchestration in
  `scripts/azure/deploy-staging.ps1`, accepting only a validated artifact manifest and verified
  checksum
- [X] T025 [P] [US1] Implement `scripts/azure/warm-and-verify.ps1` to poll `/healthz`, HTTPS, secure
  Socket.IO, verifier-only host room creation, second-client join, chat, one controlled game
  action, reconnect, candidate slot URL, and unauthenticated staging room-create rejection; mask
  and discard the short-lived verifier token, send it only through
  `auth.candidateVerifier`, and retain normal host-entry authorization
- [X] T026 [US1] Implement slot-swap and rollback operations in `scripts/azure/swap-release.ps1`,
  including pre-swap evidence check, drain lock, swap command, immediate `swapCompletedUtc` and
  30-minute `drainDeadlineUtc` evidence, forward and reverse-cutover direction, rollback-specific
  candidate-room drain, 10-minute rollback target, no concurrent forward swap, and a hard
  prohibition on changing role/admission/origin/deadline app settings after either cutover
- [X] T027 [P] [US1] Implement a bounded drain-deadline controller in
  `scripts/azure/retire-draining-slot.ps1` that reads the workflow-owned evidence deadline, stops
  staging at the earlier of zero active rooms or 30 minutes for forward or reverse drain, records
  the exact stop result, and keeps the next forward release locked until the reverse drain closes
  without updating runtime app settings
- [X] T028 [US1] Update `server/src/index.ts` and
  `server/src/sockets/registerHandlers.ts` to derive unauthenticated room admission from immutable
  physical slot identity, restrict cross-origin Socket.IO access to the exact configured production
  origin, accept controlled creation on staging only for an unexpired verifier capability supplied
  through `auth.candidateVerifier`, compare its SHA-256 hash timing-safely, require the normal
  host-entry capability, and keep valid existing-room join/resume and game actions working
- [X] T029 [US1] Add room/connection aggregate helpers and a safe release-status payload to
  `server/src/rooms/roomStore.ts` and `server/src/sockets/registerHandlers.ts` without returning
  participant, chat, or guest details
- [X] T030 [US1] Add a server-issued, rolling `RoomReconnectHint` event to
  `server/src/sockets/registerHandlers.ts` and `shared/src/protocol.ts`; include it on room join
  and refresh it on a bounded active-room timer, set expiry no later than 30 minutes after
  issuance, and allow only the exact configured HTTPS drain origin without exposing a runtime
  drain deadline
- [X] T031 [US1] Update `client/src/state/socket.ts` to retain a `RoomReconnectHint`, try the normal
  production origin first, and try the exact allowlisted drain origin only when reconnecting to a
  still-valid existing room
- [X] T032 [US1] Update `client/src/state/roomStore.ts` to persist the latest valid hint for the
  current room in memory only, expire it using `validUntilUtc`, and clear it on leave, room close,
  or invalid membership
- [X] T033 [P] [US1] Create `.github/workflows/azure-validate.yml` for pull requests with npm cache,
  clean build, smoke, Bicep build, policy/preflight, protected-environment assertion, cost
  estimate, and artifact dry run
- [X] T034 [US1] Create `.github/workflows/azure-release.yml` for `main` with OIDC, immutable ZIP
  build, artifact upload, short-lived staging verifier preparation, staging deploy, warm
  verification, protected `production` approval, no-restart slot swap, drain monitoring, evidence
  upload, and rollback
- [X] T035 [US1] Configure `.github/workflows/azure-release.yml` to reject unverified artifacts,
  mutable or missing SHA/digest metadata, missing GitHub production protection, unauthenticated
  staging room creation, a post-cutover app-setting mutation, a second swap while a drain is active,
  and any result whose S1-plus-supporting estimate exceeds USD 80
- [X] T036 [P] [US1] Create `scripts/azure/bootstrap-oidc.ps1` to configure the Entra application,
  federated credential for the canonical GitHub repository, and narrow `myArena` resource-group
  role; emit IDs only and never print or persist credentials
- [X] T037 [P] [US1] Add a deployment evidence summary step to
  `.github/workflows/azure-release.yml` using `scripts/release/write-evidence.mjs` and upload the
  exact candidate/approval/cutover/reverse-drain/rollback record, measured rollout duration, and
  evidence-retrieval timing with bounded retention; fail the release when a rollout exceeds 900
  seconds or the documented evidence lookup takes 300 seconds or more
- [X] T038 [US1] Update `server/src/config.ts`, `server/src/sockets/registerHandlers.ts`, and
  `client/src/state/socket.ts` to expose a clear room-ended or unavailable response when an
  expired hint cannot recover the room after production-first reconnect; do not mutate an app
  setting or wait for the old process to receive a synthetic deadline
- [ ] T039 [US1] Run quickstart V1-V3 and a non-production forward/reverse swap drill from
  `specs/011-azure-release-pipeline/quickstart.md`; record source SHA, artifact digest, approval
  configuration, slot identities, protected-environment result, managed identity/RBAC behavior,
  candidate token rejection, no post-swap setting mutation, and verifier masking in
  `specs/011-azure-release-pipeline/verification.md`; do not perform the first public production
  cutover until the T047 S1 500-connection gate passes

**Checkpoint**: One approved source revision can move to S1 staging, pass validation, exercise
forward/reverse slot mechanics without public production traffic, and leave complete evidence.
The public S1 cutover remains blocked until T047 passes.

---

## Phase 4: User Story 2 - Maintain Gameplay Performance Without Cold Starts (Priority: P1)

**Goal**: Keep one S1 worker warm and prove it can serve 500 concurrent connections without an
unsafe multi-worker split.

**Independent Test**: Start 500 concurrent connections on one S1 worker, verify 95% of measured
player-visible updates are within 2 seconds, confirm one worker remains active, and verify a
landing page is usable within 10 seconds after 24 hours idle.

### Implementation for User Story 2

- [X] T040 [P] [US2] Add the single-worker App Service health/capacity gate to
  `scripts/azure/assert-s1-single-worker.ps1`, including `workerCount = 1`, autoscale disabled,
  Always On enabled, and WebSockets enabled
- [X] T041 [P] [US2] Add `server/scripts/load-500.ts` to create 500 WebSocket connections across
  at least 50 rooms, exercise create/join/chat/controlled game actions, measure player-visible
  p50/p95/p99 latency, and refuse to proceed if the backend reports more than one worker
- [X] T042 [US2] Add a 500-connection ceiling and clear temporary-capacity response in
  `server/src/config.ts` and `server/src/sockets/registerHandlers.ts`; preserve every existing
  healthy connection below 500 and do not change the current 500-player roster caps
- [X] T043 [P] [US2] Add capacity warning counters and aggregate metrics at 350 and 450
  connections in `server/src/sockets/registerHandlers.ts` and `server/src/rooms/roomStore.ts`
- [X] T044 [US2] Update `infra/main.bicep` and `infra/modules/app-service-plan.bicep` to keep one S1
  worker, no autoscale resource, and no second stateful backend instance
- [X] T045 [US2] Add `scripts/azure/idle-readiness.ps1` to run repeated landing-page and `/healthz`
  checks after 24 hours idle or a controlled equivalent and report the usable-within-10-second
  percentage
- [X] T046 [P] [US2] Add a focused no-cold-start status check to
  `client/src/components/common/ConnectionBanner.tsx`; remove any Azure migration path that would
  claim scale-from-zero or a 90-second wake while preserving existing genuine reconnect messages
- [ ] T047 [US2] Run `server/scripts/load-500.ts` plus quickstart V5 first, then V4; perform the first
  public production cutover only if the 500-connection and p95 gates pass; record worker count,
  CPU, memory, HTTP queue, restarts, p95 latency, capacity refusals, 24-hour warm check, protected
  approval, endpoint, forward and rollback drain behavior, exact cutover/deadline times, staging
  CORS reconnect, rollout duration, sub-five-minute evidence retrieval, and the exact S1 fallback
  decision in `specs/011-azure-release-pipeline/verification.md`

**Checkpoint**: One S1 worker meets the 500-connection target or the plan explicitly selects a
larger single worker/shared-state follow-up; multi-instance scaling remains blocked.

---

## Phase 5: User Story 3 - Operate on a Low-Cost Observability Baseline (Priority: P2)

**Goal**: The maintainer can diagnose deployments, WebSocket health, room capacity, and restarts
without collecting chat, secrets, or unnecessary player identity.

**Independent Test**: Produce a successful deployment, failed candidate, reconnect, and slot
swap/drain, then locate every required operational category in bounded telemetry with zero
prohibited fields.

### Implementation for User Story 3

- [X] T048 [P] [US3] Add `@azure/monitor-opentelemetry` and lockfile entries in
  `server/package.json` and `package-lock.json`
- [X] T049 [US3] Initialize Azure Monitor before server imports in `server/src/index.ts` using the
  `APPLICATIONINSIGHTS_CONNECTION_STRING` app setting, with safe failure behavior when unset
  outside Azure
- [X] T050 [P] [US3] Extend `server/src/logger.ts` to require safe fields `timestamp`, `severity`,
  `releaseId`, `slot`, `category`, `event`, `safeCorrelationId`, optional aggregate `metric`, and
  `unit`; redact prohibited object keys before serialization
- [X] T051 [US3] Add aggregate operational metrics and structured events in
  `server/src/index.ts`, `server/src/rooms/roomStore.ts`, and
  `server/src/sockets/registerHandlers.ts` for active connections, rooms, restarts, failures,
  one-worker capacity/health, release phase, slot swap/reverse drain, and deployment health;
  record that no horizontal scale event is expected for S1
- [X] T052 [P] [US3] Update `infra/modules/monitoring.bicep` to enforce 30-day retention, 0.1 GB/day
  cap, warning at 70%, and a workspace-based App Insights resource
- [X] T053 [P] [US3] Add Application Insights/OpenTelemetry sampling settings to
  `infra/modules/app-settings.bicep`: 10% ordinary traces or platform rate limit, 100% errors and
  release-verification traces
- [X] T054 [US3] Add privacy and volume assertions in `scripts/verify/telemetry.ps1` that fail on
  chat, raw Socket.IO payloads, token, cookie, credential, display name, guest ID, or unbounded
  trace configuration
- [ ] T055 [US3] Run quickstart V6, query the required signals, verify cap warnings and privacy
  exclusions, and append results to
  `specs/011-azure-release-pipeline/verification.md`

**Checkpoint**: All required signals are searchable, bounded, and privacy-safe while Application
Insights and Log Analytics remain low-volume.

---

## Phase 6: User Story 4 - Respect Metered-Connection Constraints (Priority: P2)

**Goal**: Repeated releases and operations avoid unnecessary transfer while the always-on S1 cost
and supporting telemetry remain within the revised budget.

**Independent Test**: Run a clean release and an unchanged cached release, verify at least 50%
less build input transfer, keep artifact/log volume bounded, and prove the S1 total estimate remains
at or below USD 80/month.

### Implementation for User Story 4

- [X] T056 [P] [US4] Add npm, Bicep, and ZIP artifact caching to
  `.github/workflows/azure-validate.yml` and `.github/workflows/azure-release.yml` with
  lockfile/content hashes and explicit cache fallbacks
- [X] T057 [US4] Extend `scripts/azure/preflight.ps1` to calculate and record S1 base, monitoring,
  storage, transfer, and artifact-retention estimates separately and fail above USD 80 without
  maintainer override evidence
- [X] T058 [P] [US4] Add cache/artifact transfer measurement and comparison to
  `scripts/release/measure-transfer.mjs`, including clean baseline and unchanged repeated release
  with a 50% reduction target
- [X] T059 [P] [US4] Add bounded retention policy to `.github/workflows/azure-release.yml`:
  retain the previous healthy ZIP, the active ZIP, and only bounded recent evidence; do not retain
  arbitrary historical ZIPs
- [X] T060 [US4] Add no-keepalive/no-idle-traffic assertions to `scripts/verify/metered-traffic.ps1`
  and `client/src/state/socket.ts`; the client disconnects when no room needs it and no application
  traffic is introduced merely because S1 is Always On
- [X] T061 [US4] Add `scripts/azure/verify-cost-budget.ps1` to compare live or estimated S1,
  Log Analytics, Application Insights, transfer, and artifact costs with USD 80 and emit an
  actionable category report
- [ ] T062 [US4] Run quickstart V8, record clean versus cached transfer, artifact volume, no-active
  traffic behavior, monthly estimate, and variance from USD 80 in
  `specs/011-azure-release-pipeline/verification.md`

**Checkpoint**: Repeated releases minimize transfer, idle behavior avoids unnecessary traffic, and
the S1/supporting monthly estimate is enforced below the approved ceiling.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete documentation, operational safety, and end-to-end migration evidence.

- [X] T063 [P] Update `README.md` from Render deployment instructions to the approved S1 App
  Service, staging slot, OIDC, Always On, one-worker, and Azure release model; preserve Render
  only as a temporary rollback source
- [X] T064 [P] Visually verify the T046 ConnectionBanner behavior in
  `client/src/components/common/ConnectionBanner.tsx` on phone, tablet, and desktop viewports in
  supported portrait and landscape orientations; record expected and observed reconnect messages,
  overflow/readability results, and screenshot evidence in
  `specs/011-azure-release-pipeline/verification.md`
- [X] T065 [P] Document maintainer operations and recovery in `docs/azure-release-operations.md`,
  including provider registration, preflight, candidate verification, staging verification,
  approval, swap, 30-minute forward drain, reverse rollback drain, retained ZIP rollback, and
  telemetry-cap recovery
- [X] T066 Review `infra/main.bicep`, `infra/main.bicepparam`, all files under `infra/modules/`, and
  `.github/workflows/azure-release.yml` for secret values, anonymous access, public staging origin
  risk, unsafe autoscale, West Europe references, missing tags, and missing evidence
- [ ] T067 Run the complete `specs/011-azure-release-pipeline/quickstart.md` pass, mark all
  applicable V1-V8 evidence in `specs/011-azure-release-pipeline/verification.md`, and list any
  deployment-only checks still pending; assert the 95% rollout sample meets 900 seconds and all
  sampled releases have evidence retrievable in under 300 seconds
- [ ] T068 Remove the temporary Sync Impact Report from
  `.specify/memory/constitution.md` if present, run a final constitution/readiness review, and
  update `.azure/deployment-plan.md` from `Ready for Validation` to the final reviewed status only
  after T001-T067 pass and the complete quickstart evidence is accepted; do not provision from
  this task generation workflow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; starts with maintainer approval of the S1 tradeoff.
- **Foundational (Phase 2)**: Depends on Setup; blocks every user story.
- **US1 (Phase 3)**: Depends on Foundation and supplies the staging/release-mechanics path.
- **US2 (Phase 4)**: Depends on Foundation and US1's release verifier; it qualifies S1 capacity
  and gates the first public cutover.
- **US3 (Phase 5)**: Depends on Foundation; can proceed in parallel with US1 and US2.
- **US4 (Phase 6)**: Depends on US1 workflow structure and US3 cost/volume telemetry; completes last.
- **Polish (Phase 7)**: Depends on all desired stories and the end-to-end quickstart.

### User Story Dependencies

- **US1 (P1)**: Operational release mechanics: build → stage → approve → non-production swap
  drill → reverse drain → rollback evidence; its public cutover is gated by US2.
- **US2 (P1)**: One-worker S1 qualification at 500 connections and Always On; this is the
  mandatory capacity gate before US1's first public swap.
- **US3 (P2)**: Independent observability increment: aggregate safe signals and bounded ingestion.
- **US4 (P2)**: Reuses the US1 pipeline and US3 measurements to enforce transfer and cost limits.

### Within Each User Story

- Establish data/contracts before services.
- Configure platform settings before workflows/scripts that call them.
- Validate candidate behavior before production cutover tasks.
- Record verification evidence immediately after the relevant phase.
- Do not enable multi-instance autoscale while the game room store remains in process.

---

## Parallel Opportunities

- Setup: T002, T003, T004, T005, T006, and T007 can run independently after T001.
- Foundation: T010/T012/T013/T014/T016/T017/T018/T019/T022 can start in parallel after T009
  establishes the App Service plan shape.
- US1: T025, T027, T033, T036, and T037 can progress in parallel once their shared contracts and
  foundational scripts exist.
- US2: T040, T041, T043, T045, and T046 touch different files and can progress together.
- US3: T048, T050, T052, T053, and T054 can run independently, then T049/T051/T055 integrate them.
- US4: T056, T058, T059, T060, and T061 can progress in parallel before T057/T062 close the gate.
- Polish: T063, T064, and T065 can run in parallel after the implementation behavior is stable.

## Parallel Example: User Story 1

```text
T025 scripts/azure/warm-and-verify.ps1
T027 scripts/azure/retire-draining-slot.ps1
T033 .github/workflows/azure-validate.yml
T036 scripts/azure/bootstrap-oidc.ps1
T037 .github/workflows/azure-release.yml evidence summary
```

## Parallel Example: User Story 3

```text
T048 server/package.json + package-lock.json
T050 server/src/logger.ts
T052 infra/modules/monitoring.bicep
T053 infra/modules/app-settings.bicep
T054 scripts/verify/telemetry.ps1
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement US1 without enabling multi-instance autoscale and validate staging plus
   forward/reverse slot mechanics without public cutover.
3. Complete US2's 500-connection and Always On qualification on one S1 worker.
4. Permit the first public approved production cutover only after that qualification passes.
5. Validate warm start, HTTPS, WebSocket, room flow, both drain directions, and rollback.

### Incremental Delivery

1. Add US1: repeatable S1 release and rollback.
2. Add US2: prove 500 connections and Always On on one worker.
3. Add US3: bounded privacy-safe operational telemetry.
4. Add US4: transfer reuse and S1/supporting cost guardrails.
5. Complete Polish only after the full quickstart passes.

### Risk-Driven Sequence

- Do not provision until S1, Central India, quota, provider registration, policy, and USD 80
  estimate preflight pass.
- Do not enable horizontal autoscale while authoritative room state is process-local.
- Do not mark the deployment ready if a real slot-swap WebSocket reconnect fails.
- Do not perform a public S1 production cutover before the 500-connection qualification passes.
- Do not replace the S1 cost gate with vague "lowest cost" language; record live numbers.

---

## Notes

- `[P]` marks tasks in different files with no unmet dependency.
- `[US1]` through `[US4]` map directly to the clarified user stories.
- All testing tasks in this feature are requirement-driven validation scenarios, not a heavy new
  unit/integration suite.
- Commit after each independently verifiable task or logical group.
- Provisioning and deployment begin only after maintainer approval and the blocking preflight.

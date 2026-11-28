# Feature Specification: Azure Release Pipeline

**Feature Branch**: `011-azure-release-pipeline`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "Define a CI/CD plan to deploy myarena to the Azure subscription specified in the constitution. Include dynamic scaling to maintain performance under high load and minimize costs during low or no traffic, using standby or scale-to-zero where supported. Include essential telemetry and logging, prioritizing free or lowest-cost tiers, and account for the constraints of a metered connection."

## Clarifications

### Session 2026-11-27

- Q: What monthly idle and low-traffic Azure cost ceiling should gate deployment? → A: Originally USD 10/month; superseded by the later S1 hosting decision and USD 80 total estimate gate.
- Q: What should happen to active game rooms during a production rollout? → A: Keep existing rooms on the prior release until they naturally end, with a bounded drain period.
- Q: What is the maximum time the previous release may remain available only for existing rooms during a rollout? → A: 30 minutes.
- Q: What maximum concurrent connection ceiling should the Azure production plan use? → A: 500 concurrent connections.
- Q: Which Azure hosting product should replace the earlier lowest-idle-cost assumption? → A: Azure App Service Linux S1, using a permanently available Standard plan and deployment slots.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Release Safely to Azure (Priority: P1)

As the project maintainer, I want an approved change to move from source control to the
production Azure environment through a repeatable release pipeline so that deployment does not
depend on local machine state or ad hoc commands.

**Why this priority**: A trustworthy release path is required before Azure can replace the
existing production destination.

**Independent Test**: Trigger a production release candidate from a clean checkout, review its
validation and deployment evidence, approve it, and verify that the released application is
reachable at its verified Azure endpoint without manual edits to the source.

**Acceptance Scenarios**:

1. **Given** a change is ready for release, **When** the release pipeline starts, **Then** it
   produces one immutable candidate and records the source revision, validation results,
   deployment target, and approver.
2. **Given** build, policy, readiness, security, or smoke validation fails, **When** the release
   is evaluated, **Then** production is not changed and the failure reason is available to the
   maintainer.
3. **Given** a candidate is approved, **When** the production release runs, **Then** infrastructure
   and application state are reconciled in the constitutional Azure scope and the verified HTTPS
   endpoint becomes healthy before traffic is considered migrated.
4. **Given** a production release is unhealthy, **When** the release gate detects the problem,
   **Then** it prevents further rollout or restores the last healthy candidate without requiring
   an untracked manual change.

---

### User Story 2 - Maintain Gameplay Performance Without Cold Starts (Priority: P1)

As a player, I want the service to remain warm and responsive when I open it so active rooms
continue without a scale-from-zero delay, while the maintainer can increase capacity only after
the existing in-memory game state is safe to distribute.

**Why this priority**: S1 is explicitly chosen to prioritize predictable always-on behavior.
The current authoritative room state is process-local, so unsafe horizontal scaling must not be
introduced merely to consume an App Service feature.

**Independent Test**: Start a representative low-load room, raise demand to 500
concurrent connections across many rooms, observe player-visible updates during the transition,
then remove all demand and verify that the service remains available at its one-instance
always-on baseline without a new cold-start delay.

**Acceptance Scenarios**:

1. **Given** demand is low or absent, **When** the environment is operating normally, **Then**
   Always On keeps the S1 instance ready without a scale-from-zero wake-up.
2. **Given** connection count, compute pressure, or request pressure approaches the configured
   threshold, **When** the service remains under load, **Then** capacity alerts identify the
   condition before healthy connections are rejected.
3. **Given** 500 concurrent connections are active, **When** representative room
   creation, joins, chat, and game actions are exercised, **Then** at least 95% of
   player-visible updates complete within 2 seconds and no healthy connection is intentionally
   rejected below the configured global capacity limit.
4. **Given** no active rooms or external traffic remain, **When** the application is idle,
   **Then** the S1 instance remains healthy and warm at its disclosed recurring plan cost.
5. **Given** a player opens the application after inactivity, **When** the request arrives,
   **Then** the landing page becomes usable without a platform scale-from-zero wait in at least
   95% of checks.

---

### User Story 3 - Operate on a Low-Cost Observability Baseline (Priority: P2)

As the maintainer, I want essential health, availability, deployment, connection, and failure
evidence at low cost so I can diagnose a live issue without retaining unnecessary telemetry.

**Why this priority**: A personal subscription needs actionable operational visibility without
turning logs and metrics into the primary ongoing cost.

**Independent Test**: Exercise a successful deploy, a failed readiness check, a normal room
session, and a reconnect scenario, then confirm that the maintainer can distinguish each outcome
from retained telemetry while the unrelated high-volume events remain excluded or sampled.

**Acceptance Scenarios**:

1. **Given** a deployment succeeds or fails, **When** the maintainer reviews its evidence, **Then**
   the revision, health result, start time, duration, failure category, and verification status
   are visible without accessing private application data.
2. **Given** application availability degrades, **When** essential thresholds are crossed,
   **Then** the platform records a clear incident signal and the maintainer can locate the
   corresponding startup, connection, or runtime failure logs.
3. **Given** a room is active, **When** connections join, reconnect, leave, or exhaust capacity,
   **Then** aggregate counts and outcomes are observable without recording player messages,
   access credentials, or game content.
4. **Given** telemetry volume or retention would materially exceed the planned low-cost baseline,
   **When** the pipeline evaluates the deployment, **Then** it reports the projected overage and
   prevents silent enablement of an unbounded collection policy.

---

### User Story 4 - Respect Metered-Connection Constraints (Priority: P2)

As the maintainer on a limited or metered connection, I want releases and monitoring to avoid
unnecessary downloads, uploads, log volume, and repeated idle traffic so CI/CD and operations
remain practical and predictable.

**Why this priority**: Network transfer, telemetry ingestion, and always-on probes can become
avoidable cost and consume limited bandwidth even when gameplay traffic is low.

**Independent Test**: Run the same release twice without dependency or source changes and compare
the transferred build data, artifact reuse, telemetry volume, and recurring requests; then run
an idle-period check for at least 30 minutes and verify that no avoidable active traffic is kept.

**Acceptance Scenarios**:

1. **Given** dependencies and source have not changed, **When** another release is validated,
   **Then** reusable inputs and artifacts are restored instead of downloaded and rebuilt in full.
2. **Given** the service is idle, **When** operational checks run, **Then** only essential health
   checks produce billable or metered traffic; gameplay-style keepalive traffic is
   absent.
3. **Given** high-volume diagnostics are available, **When** no active investigation requires
   them, **Then** verbose or request-content logging remains disabled and diagnostics stay below
   the configured transfer and retention limits.
4. **Given** outbound transfer or diagnostic ingestion exceeds its warning threshold, **When**
   the overage is detected, **Then** the maintainer receives an actionable report that identifies
   the category and recommended reduction.

---

### Edge Cases

- The S1 plan does not reach zero; the release plan uses one Always On instance and discloses the
  approximately USD 69.35/month base estimate.
- The App Service process restarts after a deployment, platform maintenance, or failure; the
  application becomes ready promptly, duplicate room creation is prevented, and clients receive a
  clear reconnect or room-ended outcome.
- A burst fills the configured capacity ceiling; new requests receive a clear temporary-capacity
  response while existing rooms continue to receive authoritative updates.
- A deployment replaces an instance with active connections; the existing release drains safely,
  players reconnect and resynchronize, and active room limitations are disclosed.
- Readiness succeeds but secure WebSocket connectivity fails; the release is not treated as
  production-ready.
- Subscription policy, quota, region availability, or estimated cost changes after planning;
  deployment stops before mutation and identifies the blocking constraint.
- Telemetry or CI/CD credentials expire or permissions change; validation and release fail
  closed, retain the previous healthy deployment, and expose no secrets in logs.
- A telemetry or log destination is unavailable; gameplay continues and operational data is
  buffered only within a small bounded limit before being dropped with a visible health signal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The release process MUST deploy only from a source-controlled revision and MUST
  produce one identifiable immutable release candidate.
- **FR-002**: The release process MUST validate source integrity, build output, constitutional
  deployment constraints, Azure Policy compatibility, region availability, quota, and estimated
  cost before a production mutation.
- **FR-003**: The release process MUST target subscription `DebFTESub`
  (`ec7b61df-f90c-4c20-b089-847e999236d5`) and resource group `myArena` unless the maintainer
  approves a documented exception.
- **FR-004**: The release process MUST prevent deployment to the policy-blocked `westeurope`
  region and MUST record the selected supported production region in release evidence.
- **FR-005**: A production release MUST require explicit maintainer approval after automated
  checks complete and before traffic is migrated.
- **FR-006**: Production traffic MUST move to a candidate only after startup, health, HTTPS, and
  secure real-time connection checks pass against the candidate.
- **FR-007**: The release process MUST retain the identity of the previous healthy candidate and
  MUST provide rollback or equivalent traffic restoration without rebuilding that candidate.
- **FR-008**: The S1 runtime MUST operate as one Always On authoritative instance for the
  production game backend and MUST support a verified production ceiling of 500 concurrent
  connections. Requests above that ceiling MUST receive a clear temporary-capacity outcome
  without degrading existing healthy connections.
- **FR-009**: The runtime MUST NOT horizontally scale the current in-memory game backend across
  App Service instances unless a separate approved feature first makes authoritative room state
  shareable or routes every room consistently to one process.
- **FR-010**: The plan MUST use one S1 instance, disclose the recurring published estimate, and
  keep the app warm. Scale-to-zero and a wake-up workflow MUST NOT be claimed for App Service S1.
- **FR-011**: Active-room connections MUST be drained before a revision is retired, within the
  selected platform's drain limits. A rollout MUST route new rooms to the candidate while existing
  rooms remain on the prior release until they naturally end within a maximum 30-minute drain
  period.
  The prior release MUST NOT accept new rooms, and any room still active after the drain period
  MUST receive a clear room-ended outcome before retirement.
- **FR-012**: The service MUST expose an essential health and readiness signal that is safe for
  repeated checks and does not create user-visible gameplay traffic.
- **FR-013**: Operational telemetry MUST cover availability, request failures, response delay,
  active connections, room count, restart/crash count, worker-capacity/health changes, capacity
  exhaustion, and deployment health. The one-worker S1 topology MUST record that no horizontal
  scale event is expected.
- **FR-014**: Logs MUST provide structured timestamps, severity, revision, event category, and
  safe correlation identifiers while excluding secrets, access credentials, chat content, and
  unnecessary player-identifying data.
- **FR-015**: Telemetry collection MUST use bounded retention and volume controls, with
  free-tier-compatible or lowest-cost settings selected by default.
- **FR-016**: The release plan MUST define warning thresholds for projected or actual compute,
  outbound transfer, and telemetry-ingestion cost. The published S1 plan estimate is
  approximately USD 69.35/month before storage, telemetry, and transfer; material variance or a
  projected monthly idle/low-traffic total above USD 80 MUST block release pending maintainer
  approval.
- **FR-017**: Build inputs, dependency caches, and release artifacts MUST be reused when source
  and dependencies are unchanged to minimize repeated downloads on a metered connection.
- **FR-018**: Idle and low-traffic operation MUST NOT use application-level keepalive traffic
  solely to keep billable capacity awake.
- **FR-019**: Every production release MUST record its source revision, artifact identity, target
  scope, selected region, cost estimate, approver, validation results, public endpoint, health
  result, and rollback candidate.

### Key Entities

- **Release Candidate**: An immutable application and infrastructure revision with validation
  evidence, source identity, and deployment target.
- **Deployment Approval**: The maintainer's explicit decision to release, block, or roll back a
  candidate after automated evidence is available.
- **Capacity Policy**: Thresholds and limits governing low-load baseline, scale-up, maximum
  capacity, one-worker state safety, drain, and the Always On baseline.
- **Operational Signal**: An aggregate health, availability, connection, capacity, failure,
  deployment, or cost observation used to operate the release.
- **Metered Budget Guardrail**: Transfer, compute, and telemetry limits plus the warning and
  acknowledgement behavior when a limit is approached or exceeded.
- **Rollback Candidate**: The last verified healthy immutable release available for traffic
  restoration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can move an approved change from source revision to a healthy Azure
  production endpoint with zero manual edits to application source or deployment configuration.
- **SC-002**: A failed build, policy, quota, cost, readiness, HTTPS, or secure real-time check
  blocks 100% of production rollouts in the acceptance tests.
- **SC-003**: The production rollout completes in 15 minutes or less for 95% of routine releases
  when the candidate is already cached and requires no external approval beyond the maintainer.
- **SC-004**: At 500 concurrent connections, 95% of measured player-visible room updates complete
  within 2 seconds during load and after the load is sustained.
- **SC-005**: After 24 hours with no active rooms, the S1 plan remains at one healthy Always On
  instance and the measured cost projection remains within the approved App Service budget.
- **SC-006**: At least 95% of landing-page checks after 24 hours of inactivity become usable
  within 10 seconds; no scale-from-zero wake-up message is required.
- **SC-007**: A failed candidate restores the previous healthy candidate's traffic within
  10 minutes for 95% of rollback drills.
- **SC-008**: The essential telemetry set covers 100% of the required operational categories while
  excluding player chat content and secrets from test logs.
- **SC-009**: In a 30-day idle-period simulation, the release and telemetry profile generates no
  gameplay keepalive traffic and the projected monthly idle and low-traffic Azure cost remains
  at or below USD 80, with the S1 base explicitly itemized.
- **SC-010**: Releasing an unchanged dependency graph transfers at least 50% less build input than
  a clean uncached release, and only bounded telemetry is retained after the release.
- **SC-011**: The maintainer can find the source revision, approval, deployment outcome, endpoint
  health, and rollback candidate for every production release in under 5 minutes.
- **SC-012**: After a production rollout starts, 100% of new rooms use the candidate immediately,
  no new rooms join the prior release, and the prior release stops serving any traffic no later
  than 30 minutes after its drain begins.

## Assumptions

- The repository remains a single deployable service that serves the client and authoritative
  multiplayer backend from one production origin.
- The release destination is the constitutional `DebFTESub` subscription and `myArena`
  resource group; the specific Azure compute service and region are selected during planning.
- A metered connection means limited or paid network transfer, cloud compute, and telemetry
  ingestion; the plan must minimize all three, not only internet bandwidth at the maintainer's
  workstation.
- The maintainer accepts an always-on S1 compute baseline in exchange for no normal
  scale-from-zero delay and built-in staging-slot deployment.
- Free tiers are out of scope for production. The S1 Standard Linux tier is selected for Always
  On, secure WebSockets, five deployment slots, and autoscale capability.
- The first release pins the stateful game backend to one instance. Horizontal autoscaling and
  multi-instance routing are a separate feature requiring a shareable authoritative room store or
  equivalent room-to-instance coordination.
- Active room state is in memory; service replacement may end rooms, and player reconnection or
  a clear room-ended outcome remains required.
- Telemetry retention is limited to operational diagnosis rather than long-term analytics; player
  behavior analytics and chat-content retention are outside this feature.
- Render remains operational until the Azure endpoint passes verification and traffic-cutover
  approval; Render removal is a separate post-migration cleanup action.

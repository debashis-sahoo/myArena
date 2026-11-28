# Contract: Pipeline Release Evidence

Each production candidate produces a bounded machine-readable evidence object and a human-readable
summary. Evidence is attached to the GitHub Actions run and deployment record.

```json
{
  "schemaVersion": 1,
  "repository": "debashis-sahoo/myArena",
  "commitSha": "40-character SHA",
  "runId": "GitHub Actions run ID",
  "runAttempt": 1,
  "artifactDigest": "sha256:...",
  "targetSubscription": "ec7b61df-f90c-4c20-b089-847e999236d5",
  "resourceGroup": "myArena",
  "region": "centralindia",
  "targetSlot": "staging",
  "cost": {
    "s1MonthlyUsd": 69.35,
    "supportingMonthlyUsd": 0,
    "lowTrafficMonthlyUsd": 0,
    "ceilingUsd": 80,
    "withinCeiling": true
  },
  "checks": {
    "build": "pass | fail",
    "smoke": "pass | fail",
    "bicepWhatIf": "pass | fail",
    "policy": "pass | fail",
    "quota": "pass | fail",
    "health": "pass | fail",
    "https": "pass | fail",
    "websocket": "pass | fail",
    "stagingRoomAdmission": "pass | fail",
    "stagingCorsReconnect": "pass | fail",
    "postSwapSettingMutation": "absent | detected",
    "load": "pass | fail | pending"
  },
  "approval": {
    "environment": "production",
    "approvedBy": "GitHub identity",
    "approvedAtUtc": "ISO-8601"
  },
  "cutover": {
    "activeSlot": "production",
    "direction": "forward | rollback",
    "drainingSlot": "staging | null",
    "swapStartedUtc": "ISO-8601 | null",
    "swapCompletedUtc": "ISO-8601 | null",
    "drainDeadlineUtc": "ISO-8601 | null",
    "retiredUtc": "ISO-8601 | null",
    "publicEndpoint": "verified HTTPS URL"
  },
  "timing": {
    "routineRolloutSeconds": "number | null",
    "evidenceRetrievalSeconds": "number | null"
  },
  "rollbackCandidate": "previous artifact digest",
  "result": "candidate-ready | rejected | active | rolled-back | retired"
}
```

## Rules

- A missing or failed blocking check prevents production cutover.
- Production approval is separate from build and candidate verification.
- `swapCompletedUtc + 30 minutes` is the workflow-owned drain deadline. No runtime app setting is
  updated to communicate it to the old process.
- A rollback records a separate reverse-cutover swap and rollback-drain deadline. Candidate-room
  reconnect and candidate-process retirement are included in evidence.
- `timing.routineRolloutSeconds <= 900` and `timing.evidenceRetrievalSeconds < 300` are acceptance
  assertions, not merely informational measurements. Routine rollout compliance is aggregated
  over the documented release evidence sample.
- A detected post-swap role, admission, origin, or deadline setting mutation fails the release
  evidence and requires explicit investigation of process continuity.
- Candidate verifier evidence records only the run identity, hash presence, and expiry; it never
  records the verifier token.
- `cost.withinCeiling` must be true or the deployment is blocked pending maintainer approval of
  the revised S1-plus-supporting cost.
- Rollback requires no new build and records the restored artifact digest.
- Evidence never contains cloud tokens, client secrets, chat, room payloads, or player identity.
- Artifact retention keeps enough evidence to inspect every production release while observing the
  repository's storage and metered-transfer limits.

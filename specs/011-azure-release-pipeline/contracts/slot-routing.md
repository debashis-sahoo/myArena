# Contract: App Service Slot Routing and Drain

## Purpose

Keep production always available while allowing an S1 staging slot to be warmed, swapped, and
retained for existing-room reconnects during a 30-minute drain.

## Slot roles

- The physical `production` slot accepts Hub traffic, public new room creation, joins, and normal
  gameplay.
- The physical `staging` slot never accepts unauthenticated new room creation. Before swap it is
  exercised as a candidate using the release verifier capability. After swap it permits only
  valid existing-room reconnects and becomes `draining` in release evidence.

Physical slot identity and admission behavior are slot-sticky and never change after swap.
`candidate`, `active`, `draining`, and `stopped` are workflow release phases, not runtime app
settings. This prevents an app-setting update from recycling the old process during the drain.

## Candidate verification

1. The release workflow generates a 256-bit lowercase-hex verifier token, stores only its SHA-256 hash and a
   short expiry on the physical staging slot, and applies these settings before starting the
   candidate.
2. The verifier supplies the raw token in the Socket.IO handshake field
   `auth.candidateVerifier`; it is never included in a room payload. The server derives SHA-256,
   compares the digest timing-safely, and checks the configured expiry.
3. Candidate creation still requires the normal host-entry capability. The verifier only bypasses
   the staging identity's public room-creation prohibition for that controlled request.
4. The token is masked by the workflow, rate-limited, never committed, never sent by a normal game
   client,    and remains slot-sticky on staging. The restricted hex alphabet prevents Base64 punctuation
   from being normalized by proxy or workflow transports.
5. After swap, the verifier capability cannot enable production room creation because it is not
   attached to the physical production slot and ordinary staging gameplay still rejects public
   creation.

## Client reconnect contract

Before a reconnect, the client has a short-lived hint:

```json
{
  "roomId": "6-character room code",
  "gameId": "active game identifier",
  "origin": "https://<production-or-staging-origin>",
  "validUntilUtc": "ISO-8601"
}
```

1. Connect the normal WebSocket origin when possible.
2. On an existing-room miss after a verified swap, try the allowed draining origin before expiry.
3. Accept only a response that validates the guest and room.
4. If the room is closed, expires, or the draining origin is unavailable, show the existing
   room-ended/not-found outcome.

The hint is routing metadata, not authentication or authorization. It is refreshed over the
existing room socket path while the room remains active. `validUntilUtc` is set no later than
30 minutes after issuance; the client does not extend an expired hint locally.

## Invariants

- Exactly one public production slot accepts new rooms.
- The candidate is warmed before swap.
- A second swap is prohibited while a drain deadline is active.
- Existing-room reconnects remain allowed on staging for at most 30 minutes.
- Staging rejects unauthenticated new-room creation before and after cutover.
- Slot origin is allowlisted; arbitrary user-provided origins are rejected.
- Public new-room admission is derived only from physical `SLOT_IDENTITY`; there is no independent
  writable `ACCEPTS_PUBLIC_NEW_ROOMS` switch.
- Cross-origin socket access to staging is restricted to the verified production origin and
  covered by a real secure-WebSocket reconnect test.
- The S1 plan remains one worker until authoritative room state is no longer process-local.

## Drain sequence

1. Provision immutable slot identity and `DRAIN_ORIGIN` once. Do not change them during a release.
2. Configure the candidate verifier hash/expiry on staging, restart staging, then deploy/warm the
   candidate.
3. Candidate staging passes health, HTTPS, secure WebSocket, and verifier-only room smoke checks.
4. Protected `production` approval is granted and the release/drain lock is acquired.
5. Slots swap without any subsequent runtime setting mutation.
6. Record `swapCompletedUtc` and `drainDeadlineUtc = swapCompletedUtc + 30 minutes` in evidence.
7. New rooms use the physical production slot. The old process is now reachable at staging,
   rejects unauthenticated new-room creation, and accepts valid existing-room resume.
8. Existing clients reconnect to production first, then to the exact allowlisted staging origin
   while a non-expired hint remains valid.
9. At the earlier of no remaining rooms or `drainDeadlineUtc`, stop staging and record the result.
10. A rollback during this window is a reverse cutover: swap back, accept new rooms again on the
    prior production release, permit candidate-room reconnects on staging, and record a new
    rollback drain deadline at most 30 minutes after the reverse swap.
11. A later rollback deploys the retained healthy ZIP. A second forward swap is prohibited until
    the prior forward or reverse drain is closed.

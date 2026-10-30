# Security Review: Base Platform and Experience

Scope: constitution Principle V and the OWASP Top 10 (2021) for the account-free room platform.
Reviewed against the code and automated tests in this repository on 2026-10-30. This is a
self-review, not an independent assessment, and it does not cover the deployed Render service.

## Controls and evidence

| Area | Control | Evidence |
|------|---------|----------|
| Content security policy | Helmet with `script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`; no inline scripts or styles | `apps/server/tests/unit/foundation.test.ts` (CSP header); every e2e journey runs against the server that sends it |
| Origin checks | Allow-list for every state-changing request and for the WebSocket upgrade; production requires exact HTTPS origins | `foundation.test.ts` (403 `ORIGIN_NOT_ALLOWED`); `leave.test.ts` (cross-origin leave); `gateway.test.ts` |
| Cookie flags | `mah_m_<roomId>`; `HttpOnly; Secure; SameSite=Strict; Path=/`; cleared on leave | `entry.contract.test.ts`; `leave.test.ts` |
| Credentials | 256-bit CSPRNG tokens, stored only as SHA-256, constant-time compare, never in a body or URL | `foundation.test.ts`; `privacy.test.ts` (no token in any view, error, or log) |
| Authorization | Role comes only from the session participant; strict schemas reject any identity, host, or role field | `authority.test.ts` (every intent with forged fields, stale host, REST bodies, spoofed headers, cross-room credential) |
| Invitations | 10 characters from a 32-character alphabet (about 50 bits), one uniform failure for invalid, revoked, and closed | `invitation.test.ts`; `invitation-privacy.test.ts` |
| Rate limits | Per IP on create, join, and preview; per participant on intents and chat; configurable | `rate-limit.test.ts`; `chat.test.ts` |
| Input validation | Zod on every request and frame; 4 KB request and client-frame limits; display names NFC-normalized with control, zero-width, and bidi characters rejected; chat rendered as text | `protocol.test.ts`; `realtime.contract.test.ts`; `chat.test.ts` |
| Logging | Pino redaction of tokens, cookies, invitation codes (by key and in `/join/<code>` and `/api/invitations/<code>` paths), and errors reduced to name only | `foundation.test.ts`; `privacy.test.ts` (captured real server logs contain no secret) |
| Data retention | Room, chat, members, invitation, and recovery timers deleted at closure; recovery data deleted at expiry, leave, or removal | `closure.test.ts`; `recovery-expiry.test.ts`; `leave.test.ts` |
| Configuration | Environment validated at start; the test-only game is refused in production | `foundation.test.ts` |
| Dependencies | `npm audit` reports 0 vulnerabilities after the fixes below | Audit run on 2026-10-30 |

## OWASP Top 10 mapping

| Category | Assessment |
|----------|------------|
| A01 Broken access control | Covered by the authorization and privacy tests above. Members only receive projections built per recipient. |
| A02 Cryptographic failures | No passwords or personal data. Credentials are random and hashed. Production forces HTTPS origins and `Secure` cookies. |
| A03 Injection | No database or shell. All input is schema validated. React escapes output, and the CSP blocks inline script. |
| A04 Insecure design | Server-authoritative design; clients send intents only. Capacity limits bound abuse. |
| A05 Security misconfiguration | CSP and Helmet headers set; environment validated; no admin surface (`authority.test.ts`). |
| A06 Vulnerable components | See findings. |
| A07 Identification and authentication failures | Opaque credentials bound to a seat; guessing limited by entropy and rate limits; no recovery after expiry by design (FR-025). |
| A08 Software and data integrity | Lockfile committed; Render build uses `npm ci`. |
| A09 Logging and monitoring failures | Redaction verified. There is no alerting; Render logs are the only signal. |
| A10 Server-side request forgery | The service makes no outbound requests. |

## Findings

1. **Fixed: `@fastify/static` 8.3.0 had four advisories** (path traversal in directory listing, two
   route-guard bypasses, authorization bypass via non-canonical paths). It serves the built SPA.
   Upgraded to 10.1.7; the full automated suite, including the SPA served through it, passes.
2. **Fixed: Vitest and its worker pool had advisories** (a critical prototype-pollution gadget in
   `tinypool`, and mock-registration issues). These affect the test tooling only. Upgraded to
   Vitest 5.0.5; all suites pass.
3. **Fixed: capacity limits were not configurable above launch targets.** The launch defaults of 20
   rooms and 200 participants are unchanged; operators and the end-to-end server can now raise them.
4. **Open, informational: install scripts.** npm warns that `esbuild` has a postinstall script that
   is not yet covered by an `allowScripts` policy. It is a well-known build dependency; review
   before approving it in CI.

## Residual risks and limits

- Room state is in memory. A restart or deploy drops every room (accepted in the plan).
- A single instance means rate limits are per process. A second instance needs shared state first.
- A browser that clears its cookies cannot be recognized, so a returning visitor becomes a new
  participant by design (FR-025).
- There is no CAPTCHA. Join and preview are rate limited per IP; revisit if abuse appears.
- Behind Render's proxy the client IP depends on `trustProxy` trusting exactly one hop. This is not
  yet verified on a real deployment.

## Not yet verified

- Behavior through Render's proxy: WebSocket upgrade, `Secure` cookies, heartbeats, and the client
  IP used by rate limits (task T133).
- Real-device behavior of cookies and reconnection on iPhone Safari and Chrome for Android
  (task T127).
- An independent security assessment, if the project needs one before wider release.

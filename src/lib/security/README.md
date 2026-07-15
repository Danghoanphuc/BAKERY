# Security operations

The customer security model uses first-party opaque visitor/session identifiers and
server-side risk counters. It does not use browser fingerprinting.

## Firestore collections

- `customer_sessions`: hashed bearer sessions and revocation state.
- `security_events`: pseudonymous audit events, retained for 90 days.
- `security_counters`: transactional rolling-window counters.
- `customer_passkeys`: public WebAuthn credential material.
- `passkey_challenges`: single-use five-minute WebAuthn challenges.
- `auth_rate_limits`: PIN-specific phone and network limits.

Enable Firestore TTL on the `deleteAfter` field for `security_events`,
`security_counters`, and `passkey_challenges`. TTL is cleanup only; application
authorization never depends on deletion timing.

## Initial policy

- PIN: 5 attempts per phone and 25 failures per network / 15 minutes.
- Sessions: retain at most 8 active browser-container sessions per customer;
  revoke the least recently seen sessions first.
- Registration: 3 attempts per visitor / day, 10 per network / hour.
- Checkout: 8 attempts per visitor, 5 per phone, 30 per network / hour.
- COD: at most 2 active unpaid COD orders per phone.
- Single-use promotions: 1 claim per visitor, 2 per normalized address, and 5
  per network / 30 days.

These are initial thresholds. Review false positives and conversion metrics before
tightening them. Network and address signals must never be the sole reason for a
permanent account ban.

## Required production configuration

Set Firebase Admin credentials, `AUTH_HASH_SECRET`, Turnstile keys,
`PASSKEY_ORIGIN`, and `PASSKEY_RP_ID`. Passkeys require HTTPS outside localhost.

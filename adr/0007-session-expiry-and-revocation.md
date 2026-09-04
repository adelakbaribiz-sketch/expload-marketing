# ADR-0007: Add session token expiry and a revocation path

**Status**: Proposed
**Date**: 2026-09-04

## Current

`src/lib/auth/simple-session.ts` signs a token as `userId.HMAC(userId)` with no timestamp/nonce claim. The 30-day cookie `maxAge` is a browser-side hint only — the server accepts the token indefinitely if replayed. Logout only clears the client cookie. The only way to invalidate all sessions is rotating `NEXTAUTH_SECRET`, which logs out every user simultaneously (`SECURITY-BASELINE.md` §1).

## Problem

A leaked or copied session token (via XSS, a compromised device, a browser-history-shared cookie, etc.) remains valid forever, and there is no way to respond to a single-user security incident (e.g. "this specific account was compromised, kill just their sessions") without a blunt, all-users logout. This also **directly enables** the tenant-context-spoofing path in ADR-0004 — that vulnerability specifically requires a session that's cryptographically valid but for a now-inactive account, which non-expiring tokens make far more likely to exist and be replayable long after the account was deactivated.

## Target

Signed tokens carry an expiry claim, checked on every verification. A minimal revocation mechanism exists for logout and incident response — doesn't need to be a full session store from day one, but needs *something* beyond "rotate the global secret."

## Migration strategy

1. **Step 1 (low-risk, do first)**: add an `issuedAt` timestamp into the signed payload (`userId.issuedAt.HMAC(userId+issuedAt)`), and reject in `verifySessionToken` if `now - issuedAt > 30 days` (matching the existing cookie `maxAge`, just now actually enforced server-side too). This alone closes the "leaked token never expires" half of the problem with a small, contained change to `createSessionToken`/`verifySessionToken`.
2. **Step 2 (moderate effort)**: add a minimal revocation list — a `revokedAt` timestamp on the `User` model (or a small dedicated table), checked in `getCurrentUser()` alongside the existing `isActive` check: if `session.issuedAt < user.revokedAt`, treat as logged out. Set `revokedAt = now()` on explicit "log out all my sessions" action and optionally on password change. This gives real single-user revocation without needing a full server-side session store.
3. **Step 3 (only if actually needed later)**: a full session store (Redis-backed, since Redis is already provisioned) enabling per-device session listing/revocation — defer until there's a real product requirement for it (e.g. a "manage your active sessions" UI), don't build it speculatively.
4. Coordinate this with ADR-0004: fixing tenant-context spoofing and fixing session expiry both reduce the same class of risk from different angles — doing both closes the gap more robustly than either alone, but ADR-0004 is the higher-priority one of the two (it's a direct cross-tenant data-access bug; this one is a session-hygiene hardening that makes that bug harder to trigger).

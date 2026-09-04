# ADR-0004: Harden tenant-context resolution — stop trusting unauthenticated headers/cookies

**Status**: **Accepted and implemented** (2026-09-04)
**Date**: 2026-09-04

**Implementation note**: shipped with a refinement discovered during the dependency check this ADR's own migration step 1 called for — the `tenant-id` cookie fallback turned out to be a real, live feature (the sidebar's SuperAdmin tenant-switcher, via `src/components/providers.tsx`'s `TenantSync`), not dead weight. So instead of Option A (remove both fallbacks outright), the shipped fix removed the `X-Tenant-ID` header fallback entirely (confirmed zero legitimate callers) and kept the `tenant-id` cookie override, but gated it to only be honored when `getCurrentUser().isSuperAdmin` is true. Verified live: a non-superadmin's forged cookie is now ignored; a genuine superadmin's tenant-switch still works. See `docs/IMPLEMENTATION-PLAN.md` #4 for the full dependency-check and test evidence.

## Current

`src/lib/tenant.ts`'s `getTenantId()` resolves tenant scope in priority order: (1) the authenticated session's tenant, (2) an `X-Tenant-ID` request header, (3) a `tenant-id` cookie — neither (2) nor (3) requires any credential proving the caller actually belongs to that tenant. This is the direct root cause of the Critical/High findings in `SECURITY-BASELINE.md` #2-#3, and the ~46 CRUD-factory domains all rely on this resolver as their only tenant-isolation mechanism.

## Problem

The header/cookie fallback appears to be an intentional design for external API-client access (per `PRD.md` §8's "hidden requirement" analysis — likely meant for marketplace API-key consumers), implemented without the credential check that requirement actually needed. As shipped, any request that reaches a route handler with `getAuthTenantId()` returning null (reachable today via a session for a deactivated/deleted account, which `proxy.ts` doesn't check) can specify any tenant it wants via header and get that tenant's data.

## Target

Two acceptable target designs — pick one, don't ship a half-measure of both:

**Option A (simpler, recommended unless external API-client access is a real near-term requirement)**: remove the header/cookie fallback entirely. `getTenantId()` returns the session-derived tenant or null, full stop. Any route needing a tenant context 401s cleanly when there isn't a valid one — which is what should happen today anyway; nothing currently *needs* the fallback to function, since proxy.ts already requires a session cookie for every non-public route.

**Option B (if external API-client access via `X-Tenant-ID` really is wanted)**: pair the header with a real credential check — e.g. require a valid `ApiKey` (the model already exists, per `KNOWN-ISSUES.md`'s note that the marketplace already issues API keys) presented alongside the header, and resolve the tenant from *that key's* owner, not from the caller-supplied header value directly. The header becomes "which of my own resources am I asking about," not "which tenant am I claiming to be."

## Migration strategy

1. Confirm with the product owner whether any real, current integration relies on the `X-Tenant-ID`/`tenant-id` fallback today (check: does any documented external integration, webhook consumer, or the marketplace API actually send this header? Phase 1-3 audits found no evidence of one, but this should be confirmed by someone who can check live traffic/partner docs, not assumed from code alone).
2. If no live dependency exists (likely, per the audit trail): implement Option A directly — delete the header/cookie fallback branches in `getTenantId()`. This is a small, low-risk, high-value fix; pair it with fixing the two genuinely-unscoped routes found in the same area (`support-plans/tickets` and `support-plans/subscriptions` PATCH handlers, `SECURITY-BASELINE.md` #2) in the same change, since they're the same class of bug.
3. If a live dependency is found: implement Option B, and audit every current caller of the header/cookie path to make sure they're updated to send a real API key before the old fallback is removed.
4. Either way, add a regression test for this specific case once a test suite exists (`KNOWN-ISSUES.md` has no test-suite ADR yet — flag as a prerequisite gap, not this ADR's job to create). Until then, manually verify: an authenticated user from tenant A cannot read/write tenant B's data via header manipulation, for at least the CRUD-factory path and the two support-plans routes.

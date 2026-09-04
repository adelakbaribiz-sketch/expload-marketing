# THREAT-MODEL.md — Expload Marketing SaaS

Generated 2026-09-05, Phase 05 (Security Engineering). Companion to `SECURITY-BASELINE.md` (the evidence-cited finding-by-finding checklist) — this document is the narrative model: who could attack this system, what they'd be after, where the trust boundaries actually sit, and how the two most important classes of attack (cross-tenant data access, privilege escalation) play out end-to-end. Read this first for the *shape* of the risk; read `SECURITY-BASELINE.md` for the *evidence*.

---

## 1. System summary

Expload Marketing is a multi-tenant B2B SaaS: one Next.js deployable, one shared database, tenant isolation enforced entirely in application code (no database-level row-security, no per-tenant schema/database separation). This is a deliberate, reasonable architecture choice (`adr/0001`), but it means **every route handler is individually responsible for its own tenant-isolation correctness** — there is no framework-level backstop. That single fact is the source of almost every finding in this audit: the isolation *pattern* (fetch the record, compare its `tenantId` to the caller's, only then act) is well-established and followed correctly in the large majority of the ~239 routes, but it is opt-in per file, not structurally enforced, so it has been individually forgotten in dozens of places over the app's development history.

## 2. Actors

| Actor | Access level | Motivation | Realistic capability |
|---|---|---|---|
| **Anonymous visitor** | No account. Can reach: public marketing pages, `/api/health`, `/api/auth/{login,signup}`, `/api/public/*`, the NOWPayments webhook receiver, `/api/sandbox/*`, `/invite/[token]`. | Reconnaissance, account creation, abuse of free sandbox/demo features, or a stepping stone to becoming an "Authenticated tenant user" below (signup is free and unrestricted). | Low technical bar — everything reachable here is reachable with `curl`. |
| **Authenticated tenant user** | A real account in some tenant, any role (`owner`/`admin`/`manager`/`editor`/`viewer` — self-assigned at signup as `owner` of a brand-new tenant, since anyone can sign up and immediately owns a fresh tenant). | Same as anonymous, plus: everything their own tenant's role should legitimately allow, plus — per this audit's findings — a large amount that it shouldn't. | This is the **most important actor in this threat model**. Because signup is free, "authenticated" barely restricts who can reach a route; it only means they clicked through one form first. Every finding in `SECURITY-BASELINE.md` §2 was reachable by this actor. |
| **Tenant owner/admin (legitimate)** | Same as above but acting within their actual authorized scope. | Running their business on the platform. | The party these isolation bugs put at risk — their data was reachable by *other* tenants' "Authenticated tenant user" actors. |
| **Platform internal staff** (`InternalEmployee`, `platformRole: employee/admin/super_admin`) | Elevated, but scoped to platform-operations data (payroll, distributor management, support) — not automatically full SuperAdmin. | Legitimate platform operations; a compromised or malicious internal account is a meaningfully worse actor than a tenant user since it starts with real elevated access. | Internal-staff-scoped findings (payroll, virtual-assistant catalogs) assumed this actor should exist and be trusted at the `admin`/`super_admin` `platformRole` level — the fixes this phase gate on exactly that boundary. |
| **Platform SuperAdmin** | Full platform access by design (`SuperAdmin` table, separate from tenant roles). | Legitimate platform administration. | Out of scope as an "attacker" for most findings (if a SuperAdmin account is compromised, that's a credential-security problem, not an authorization-design problem) — but several fixes this phase specifically narrow what *shouldn't* require SuperAdmin (health-check detail, payment-gateway secrets) precisely because the pre-fix code effectively treated every authenticated user as if they had this level of trust. |
| **Network-adjacent attacker** | No account needed — someone who can reach the Docker host's public IP directly (not through the app's own routes). | Bypass application-layer controls (rate limiting, TLS termination) by going around them, not through them. | This is the actor behind the `docker-compose.prod.yml` findings (§25/26 in the baseline) — publishing Postgres/Redis/the app itself directly to the host's public interface handed this actor a shortcut past every in-app control. |
| **Compromised/malicious third-party integration** | Whatever the integration's webhook/callback endpoint allows. | Forge events (fake completed payments, fake webhook deliveries) to gain value without paying. | Relevant to the NOWPayments webhook (correctly signature-verified) and the not-yet-implemented `WebhookSubscription` delivery feature (flagged as a design note for whoever builds it). |

## 3. Assets (what's actually worth protecting, ranked)

1. **Payment gateway credentials** (`PaymentGatewayConfig.apiKey/secretKey/webhookSecret`) — real Stripe/PayPal/NOWPayments keys for the platform operator's live payment processing. Compromise = direct financial theft (refunds, unauthorized charges, forged "payment completed" webhooks granting free paid entitlements) across *every* tenant, not just one. This was the single most exposed asset found this phase (§7/22 in the baseline) — fixed.
2. **Cross-tenant customer data** — every tenant's leads, contacts, deals, campaigns, financial records, support tickets, negotiation sessions. The core promise of a multi-tenant SaaS is that Tenant A never sees Tenant B's data; this phase found and fixed 13 ways that promise was broken.
3. **Account/role integrity** — who can act as whom. The `team/members`/`team/invite` chain found this phase was a complete, self-contained path from "any free account" to "owner of an arbitrary other tenant, or owner-equivalent access to any specific victim's existing account" — arguably worse than a pure data leak, since it grants standing access, not a one-time read.
4. **Platform-internal operations data** — payroll (real compensation figures and the ability to trigger real payment runs), internal HR records, distributor contracts/payouts. Scoped to internal staff, but a real financial/legal-sensitivity asset if leaked or manipulated.
5. **Session tokens & password hashes** — the keys to everything above. Hashes are bcrypt cost-12 (reasonable); the fixed leaks (§22) were of hashes, not plaintext passwords, so the residual risk is offline cracking, not immediate account takeover.
6. **Platform infrastructure itself** — the database and Redis instances, and the host they run on. The infra-layer findings (§25/26) were about this asset: with Postgres/Redis published to the public internet, an attacker wouldn't need to find an application-layer bug at all.
7. **Availability** — the various unrated-limited public-write endpoints (`/api/public/demo`, `/api/public/pricing-calculate`, the sandbox family) were a real, if low-severity, DoS/DB-bloat vector; the `X-Forwarded-For` rate-limit bypass made the *login* endpoint's availability-adjacent brute-force protection meaningless.

## 4. Trust boundaries

```
                    ┌─────────────────────────────────────────────┐
                    │              Public internet                 │
                    └───────────────────────┬───────────────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │   Caddy (host, port 80/443)  │  ← TLS terminates here;
                              │   auto-HTTPS, security        │    X-Forwarded-For is
                              │   headers, sets X-Forwarded-  │    TRUSTED past this
                              │   For from the real peer      │    point specifically
                              └──────────────┬──────────────┘    because Caddy sets it
                                             │ (loopback only, 127.0.0.1:3000)
                              ┌──────────────▼──────────────┐
                              │   Next.js app (proxy.ts)     │  ← session-cookie check +
                              │   session auth + CSRF Origin │    Origin check happen
                              │   check + security headers   │    HERE — the only real
                              └──────────────┬──────────────┘    perimeter in the system
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │   Route handler (per-route tenant/role check)    │  ← THIS is the boundary
                    │   ~239 files, individually responsible for       │    that had the gaps —
                    │   verifying the caller may touch this record     │    everything past proxy.ts
                    └────────────────────────┬────────────────────────┘    trusts the route to
                                             │                              re-check authorization
                              ┌──────────────▼──────────────┐
                              │   Prisma / db.ts (shared     │  ← NO row-level security,
                              │   connection, all tenants    │    NO per-tenant isolation
                              │   in one schema)              │    at this layer — 100% of
                              └──────────────┬──────────────┘    isolation is enforced above
                                             │                    (or wasn't, per the findings)
                    ┌────────────────────────┼────────────────────────┐
                    │  Postgres / Redis (internal Docker network only  │  ← now unreachable from
                    │  after this phase's fix — was publicly exposed)  │    outside the container
                    └───────────────────────────────────────────────────┘    network (fixed)
```

**The critical observation**: there are only two real enforcement points in this whole chain — the proxy layer (session validity, CSRF Origin) and the individual route handler (tenant/role ownership). The proxy layer was already solid going into this phase (confirmed via §13/14 in the baseline — CORS/CSRF posture is genuinely good). Every single finding in this phase's largest category (§2, IDOR/authorization) is a failure at the *second* boundary — a route handler that trusted a client-supplied id or skipped the ownership check entirely. There is no third layer to catch what the route handler misses. This is why the fix pattern is always the same (fetch-then-compare, or a role gate) and why `adr/0003` (validation hooks on the shared CRUD factory) and the broader question of whether tenant isolation should someday move into a database-level policy (row-level security, if the Postgres migration ever happens) are the right long-term structural answers — not fixed this phase, since they're architecture changes, not point fixes.

## 5. Primary attack trees

### 5.1 Cross-tenant data access / mutation (the dominant threat class this phase)

```
GOAL: Read or modify Tenant B's data as an authenticated user of Tenant A
│
├── [FIXED] Guess/enumerate a record id and call a route with no tenant check
│   ├── support-plans tickets/subscriptions (prior phase)
│   ├── leads/enrich, campaigns/send (prior phase)
│   ├── onboarding/sessions PATCH, project-intake/.../pay, campaign-scheduler/.../approve,
│   │   competitor-analysis/run (this phase)
│   └── virtual-assistants/assignments PATCH, timesheets GET/PATCH/POST (this phase)
│
├── [FIXED] Call a route gated on the wrong signal
│   └── virtual-assistants/assignments GET — checked tenant ROLE ('owner'/'admin'
│       string) instead of PLATFORM role (isSuperAdmin) to decide whether to skip
│       the tenant filter. Every tenant's own creator is 'owner', so this gate
│       was accidentally "true for almost everyone," not "true for platform staff."
│
├── [FIXED] Call a route with literally no auth check
│   └── reseller/opportunities/[id] GET — returned every tenant's application PII
│       to a fully anonymous caller.
│
└── [FIXED] Exploit the shared tenant-context resolver's fallback (prior phase)
    └── requireTenantId()'s X-Tenant-ID header / tenant-id cookie fallback —
        the ROOT-CAUSE class of bug from the prior phase, now closed at the
        source (adr/0004). This phase's findings are all "individual route
        forgot the check," not "the shared resolver was wrong" — a sign the
        prior phase's fix was structurally correct and this phase is cleaning
        up pre-existing individual gaps, not a new instance of the same root cause.
```

### 5.2 Privilege escalation → full tenant/account takeover (the most severe single chain found)

This is worth walking through in full because it's the clearest example of how three independently-small-looking bugs composed into something much worse.

```
STEP 1: Attacker self-signs-up (public, free) → becomes 'owner' of a brand-new,
        empty Tenant A. No special access needed to reach this point.

STEP 2 [FIXED]: POST /api/team/invite had no permission check — ANY authenticated
        user, any role, any tenant, could call it. Attacker invites
        "victim@target.com" (a real user who may already own Tenant B) with
        roleName: "owner". Response includes the invitation's token in plaintext.

STEP 3 [FIXED]: POST /api/team/invite/{token} with {action: "accept"} required
        NO authentication and NO proof the caller is victim@target.com — only
        knowledge of the token (which the attacker already has, from step 2,
        since THEY sent the invite). The handler found victim's EXISTING user
        row by email and unconditionally updated tenantId → Tenant A,
        role → "owner".

RESULT (pre-fix): Victim's real account — with all its existing data access —
        is silently ripped out of Tenant B and now belongs to Tenant A, which
        the attacker controls. No click, no password entry, no notification
        to the victim. This is not "read another tenant's data" — it's
        "take over management of another user's actual account."

FIX: Step 2 now requires hasPermission('team.manage') (owner/SuperAdmin only)
     — an attacker's freshly-signed-up 'owner' account CAN still call this
     against their OWN tenant (that's legitimate — owners invite people), but
     step 3 now independently requires the target's real password before
     the tenant/role reassignment happens, closing the chain even if step 2's
     gate were somehow bypassed. Defense in depth: two independent fixes,
     not one relied upon alone.
```

A second, parallel escalation path existed entirely within `POST`/`PATCH /api/team/members(/[id])` — no invitation needed at all, an attacker could just directly `PATCH` their own user row's `role` to `"owner"`, or (the `POST` variant) target *any* `userId` platform-wide with no tenant filter. Both fixed with the same `team.manage` permission gate plus (for the cross-tenant `POST` variant) an added tenant-ownership check on the target.

### 5.3 SSRF → internal network / cloud metadata access

```
GOAL: Make the server issue an HTTP request to an internal-only or
      cloud-metadata address on the attacker's behalf

[FIXED] POST /api/onboarding/crawl (any authenticated tenant user)
  → crawlWebsite(url) with `url` fully attacker-controlled
  → old code: new URL(normalized) just checks it PARSES, then
    fetch(url, {redirect: 'follow'}) — no IP-range check at all,
    and even a naive same-request check would've been bypassable
    via a 3xx redirect to 169.254.169.254 or 127.0.0.1
  → FIX: resolve the hostname via DNS, reject private/loopback/
    link-local/CGNAT/reserved ranges (explicitly including the AWS/
    GCP/Azure metadata address), switch to redirect:'manual' and
    re-validate every hop before following it (max 5 hops), reject
    non-http(s) schemes on the original URL AND every redirect target
```

### 5.4 Infrastructure bypass (network-adjacent attacker, no application bug needed)

```
GOAL: Reach data or bypass controls without finding an app-layer bug at all

[FIXED] docker-compose.prod.yml published:
  - app :3000 to 0.0.0.0        → bypasses Caddy AND every X-Forwarded-For-
                                    trusting rate limit (including login's
                                    5/min brute-force cap) with a single
                                    per-request header spoof
  - postgres :5432 to 0.0.0.0   → direct DB access behind only a password
                                    (often left at the documented default)
  - redis :6379 to 0.0.0.0      → direct access with NO auth at all

  FIX: app bound to 127.0.0.1 only (still reachable by Caddy on the same
  host); postgres/redis port mappings removed entirely (reachable only via
  the internal Docker network, which is all the app container ever needed);
  Postgres's default-password fallback removed (fails closed if unset,
  matching the existing NEXTAUTH_SECRET pattern).
```

## 6. What this threat model deliberately does NOT cover

- **Physical/host-level security** (who has SSH access to the VPS, disk encryption, OS patching cadence) — outside this application's own control surface, not audited.
- **Third-party integration compromise** (a breached Stripe/NOWPayments/Serper account on the *provider's* side) — out of scope; this app's own webhook signature verification is the relevant control and is confirmed correct.
- **Social engineering / phishing of a real user's credentials** — a real risk for any web app, not specific to this codebase's implementation, not modeled here.
- **The 2 BLOCKED prior-phase findings** (payment-gateway stubs presenting as functional, fabricated analyzer data) — these are product-honesty/data-integrity issues, not attacker-driven threats, and remain tracked in `KNOWN-ISSUES.md`/`SECURITY-BASELINE.md` §22 rather than modeled as an attack tree here.
- **Denial-of-service at scale** (volumetric/DDoS) — the rate-limiting fixes in this phase address application-layer abuse (unlimited free-tier writes, brute-force), not network-layer flooding, which would need infrastructure-level mitigation (a CDN/WAF) not currently part of this deployment's documented architecture.

## 7. Residual risk after this phase (what's still genuinely open)

Ranked by what a realistic attacker would actually go after next, given everything above is now closed:

1. **No database migration history** (`adr/0006`) — not itself exploitable, but means any future schema change carries real data-loss risk with no safe rollback path. Highest-effort remaining item, correctly deferred to its own pass.
2. **8 more unwrapped multi-step writes**, 2 of which are genuine TOCTOU races in the customer-loyalty points/ad-credits system (`DATABASE-TARGET.md` DB-08) — same bug class as the crypto-payment double-booking bug already fixed this engagement, same fix pattern, just not yet applied to these 8.
3. **No session revocation list** (`adr/0007` step 2) — a captured token stays valid until its 30-day expiry; low-likelihood given `httpOnly` cookies and the confirmed absence of any live XSS path, but a real gap for incident response.
4. **~96% of routes still unvalidated** at the type/format level (not a security hole per se, given Prisma parameterization and React's default escaping, but a data-integrity and DoS-via-malformed-input surface).
5. **CSP still allows `unsafe-inline`** — no live XSS exists to pair it with today, but it's the reason §15's "latent, for future awareness" finding matters: if a future feature ever renders stored HTML unsafely, CSP won't catch it.

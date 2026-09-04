# PRD.md — Product Requirements Document (Recovered)

**Status**: This is a *recovered* PRD — reverse-engineered from code, database schema, UI, API behavior, and existing project docs (`TECHNICAL_SPECIFICATION.md`, `worklog.md`), not written before the product was built. Where the recovered requirement is only partially or not implemented, that is stated explicitly rather than omitted. Cross-references: `PROJECT-INVENTORY.md`, `ARCHITECTURE-CURRENT.md`, `KNOWN-ISSUES.md` (same audit, 2026-09-04).

---

## 1. Product overview

**Expload Marketing** (internal codename "CPPflow") is a multi-tenant, multi-language B2B SaaS platform that runs a customer's entire marketing operation — lead generation through to customer retention — plus, distinctly, a set of **platform-operator businesses** layered on top: reselling the platform itself (wholesale distribution, white-label), staffing marketing work (virtual assistants), and monetizing API access (marketplace). It is not just "marketing software" — it's marketing software *plus* the wholesale/reseller/staffing business built to sell that software, in one codebase.

**Primary business model implied by the schema and UI**: sell tenant subscriptions (`plan: free|pro|enterprise|distributor`) for the marketing tooling itself, layered with usage-based/wholesale revenue (license packages sold to distributors, API marketplace usage, paid support-plan subscriptions, paid virtual-assistant staffing), with an internal payroll system that automatically splits platform revenue between the owner and staff.

## 2. Target users / personas (recovered from RBAC roles, models, and dedicated dashboard views — not documented anywhere as personas before this audit)

| Persona | How they enter the system | What they can do |
|---|---|---|
| **Tenant Owner** | Public self-signup (`POST /api/auth/signup`) — creates a new `Tenant` + becomes its first `User` with `role: 'owner'` | Full control of their own tenant: all marketing modules, billing, team management, custom roles |
| **Tenant team member** (admin/manager/editor/viewer) | Invited by an owner/admin via the team-invite flow, or self-signup if invite-link accepted | Same tenant's data, permission level decreasing by role string (formal granular permissions exist in schema but are not enforced in code — see BUSINESS-RULES.md) |
| **SuperAdmin** | Bootstrapped out-of-band (`scripts/bootstrap-super-admin.ts`) or promoted by an existing SuperAdmin | Platform-wide: every tenant, every user, platform revenue, gateway config, LLM provider config |
| **Internal Employee ("Operator")** | Created by a SuperAdmin or an `admin`-platformRole employee, belongs to the `platform.internal` tenant | Internal HR/ops: department structure, own payroll, distributor account management (per assigned region), depending on `platformRole` (employee/admin/super_admin) |
| **Distributor** | A `Tenant` with `plan: 'distributor'`, tied to a `Distributor` record with a tier (standard/silver/gold/platinum/master) | Buys license packages wholesale, allocates/resells individual licenses, manages exclusive territories, requests payouts |
| **Anonymous visitor** | No account — landing page, public blog, pricing calculator, or the 24-hour sandbox demo | Browses marketing content, tries a capped (20-action) product demo, can convert to a real signup |
| **Support-plan customer** | Any tenant that subscribes to a `SupportPlan` (Basic/Premium/Enterprise) | Purchased SLA-backed support: ticket submission with guaranteed response time |
| **Virtual-assistant client** | Any tenant that hires a `VirtualAssistant` for a project | Staffed marketing work with time-tracking and automatic billing |

## 3. Core product structure — the "10-phase marketing framework"

The sidebar organizes the tenant-facing product around 10 sequential marketing phases (P1–P10, visible as badges on nav items), which is the product's own stated mental model for how a customer grows using the platform:

| Phase | Focus | Modules |
|---|---|---|
| P1 | Acquire — find prospects | Lead generation (Serper/Google Maps discovery + AI enrichment) |
| P2 | Acquire — convert | CRM (deals/pipeline), Email campaigns, Engagement Hub (WhatsApp/chatbot/reviews) |
| P3 | Grow — content | Content ideas & pieces, calendar |
| P4 | Grow — findability | SEO project/crawl/issue tracking, Growth experiments (A/B testing) |
| P5 | Grow — paid | Ad campaign management |
| P6 | Grow — social | Social account/post management, brand-mention listening |
| P7 | Grow — authority | Backlink tracking & outreach |
| P8 | Grow — measurement | Social/export analyzers, unified analytics |
| P9 | Monetize — AI | AI agents/recommendations, AI advisor/strategy generation |
| P10 | Monetize — automation | Workflow engine, autonomous agent orchestration (graph-based) |

Outside this 10-phase spine sit the **platform-operator modules**: distributor/reseller program, internal HR/payroll, payment gateway/billing infrastructure, white-label/reseller branding, marketplace (sell API access), support plans, virtual assistant staffing, plus platform-wide admin (Super Admin panel, Internal Portal).

## 4. Module-level requirements summary

Full technical detail is in `ARCHITECTURE-CURRENT.md`; this table is the product-level view of the same 28 functional domains, with implementation status (Implemented / Partial / Missing / Stub) so nothing is silently assumed complete.

| Module | Core requirement | Status |
|---|---|---|
| Auth & multi-tenancy | Self-signup creates an isolated tenant; session-based login; team invite by email | **Implemented** (invite flow fixed this session) |
| RBAC / permissions | Tenant roles (owner→viewer) gate access; custom roles with granular permissions can be defined per tenant | **Partial** — role strings work; the granular custom-permission system has UI but has no effect on actual access (dead wiring, see KNOWN-ISSUES.md) |
| Lead generation | Discover businesses via search/maps, AI-enrich contact/firmographic data, score leads | **Implemented**, with a documented mock-data fallback when `SERPER_API_KEY` is unset |
| CRM | Deals, pipeline stages, tasks, activity log | Implemented |
| Email campaigns | Template-based campaign send to a segment/list | Implemented (queuing has an unguarded-throw gap if Redis misconfigured, see KNOWN-ISSUES.md) |
| Engagement Hub | WhatsApp messaging, chatbot widgets, review monitoring, push/SMS | **Partial** — chatbot & reviews real; WhatsApp and SMS are database-only with no send integration |
| Content / SEO / Social / Ads / Backlinks / Analytics (P3–P8) | Plan, create, and track content/SEO/social/ad/backlink work with reporting | Implemented as CRUD; 4 "analyzer" endpoints (backlink discovery, competitor analysis, social analyzer, SEO crawl) always return fabricated data rather than real analysis (see KNOWN-ISSUES.md #8) |
| AI agents / advisor / workflow / autonomous (P9–P10) | AI-assisted strategy generation and multi-step autonomous execution | Implemented via two parallel AI backends — a real multi-provider LLM aggregator, and an environment-coupled SDK used by some features that may not function outside the original build sandbox |
| Attribution & fraud detection | Track acquisition source, detect click fraud, funnel/journey analytics | Implemented (funnel/journey builders added this session) |
| Negotiation Engine | AI-negotiated pricing proposal across 6 rounds with automatic scope/price/timeline concessions | Implemented — see BUSINESS-RULES.md for the exact formula per round |
| Onboarding Wizard | 6-step guided intake (business info → website crawl → documents → system prompt → negotiation) | Implemented |
| Project intake & pricing | Customer describes their project, gets an AI-generated roadmap + 3-tier pricing, pays in full or phased | Implemented |
| Payments & billing | Multi-gateway card payments, crypto payments, subscription billing | **Partial/Stub** — only crypto (NOWPayments) and manual crypto wallets are real; 11 card-payment gateways are non-functional stubs (see KNOWN-ISSUES.md #7) |
| Wholesale distribution | Distributors buy license packages, allocate to end customers, manage territories, request payouts | Implemented |
| White-label / reseller | Rebrand the platform for a reseller's own customers | Implemented as CRUD (config + customer list) |
| Internal HR / payroll | Department structure, employee records, automatic revenue-split payroll | Implemented — see BUSINESS-RULES.md for the exact split formula |
| Support plans | 3-tier paid support subscriptions with SLA response times | **Partial** — subscription/ticket CRUD works; whether SLA deadlines are actually computed/enforced needs confirmation (flagged in BUSINESS-RULES.md) |
| Virtual assistants | Marketplace to hire trained staff for marketing work, with time-tracking | Implemented |
| Marketplace | Sell API access as a product, issue API keys, track usage | Implemented (one route has an access-control gap, see KNOWN-ISSUES.md #5) |
| Vector search | Semantic search over indexed content | Implemented, Qdrant-optional with in-DB fallback |
| Platform admin (Super Admin panel) | Cross-tenant visibility and control for platform operators | Implemented, extended this session with a System tab (job queue + semantic search status) |
| i18n | 29 languages including RTL (Arabic/Hebrew/Persian) | Implemented, cookie-based, English-fallback for missing keys |
| Approval workflows | Content/campaign/ad/budget requests routed for review before going live | **Was Missing, now Implemented** — built this session (no other feature yet auto-creates a request; currently manual-submission only) |
| Webhooks | Outbound event notifications to a customer's own endpoint | **Was Missing, now Implemented** — built this session |

## 5. Non-functional requirements (recovered from actual configuration, not a written NFR doc)

- **Multi-tenancy**: every tenant's data must be isolated from every other tenant's — this is the platform's core promise and, per `SECURITY-BASELINE.md`, is **not fully upheld today** (several routes allow cross-tenant access to any signed-up user). This is the single most important non-functional requirement currently unmet and should be treated as a release blocker for any real multi-customer deployment until fixed.
- **Internationalization**: full RTL support required (not optional) given Arabic/Hebrew/Persian are first-class supported locales — confirmed by dedicated CSS/dir handling, not just translation files.
- **Self-hostable**: the product must run without any dependency on its original AI-sandbox platform — implicitly broken today by the `z-ai-web-dev-sdk` coupling on several AI features (see KNOWN-ISSUES.md #14). This is a real, currently-unmet non-functional requirement given the product ships Docker/Caddy self-hosting docs.
- **No test suite is currently a requirement the codebase satisfies** — zero automated tests exist. Whether "must have test coverage" is a genuine product requirement or an accepted trade-off is a decision for the product owner, not something this audit can infer from absence alone.
- **Graceful degradation** is a consistently-applied design pattern across most (not all) external integrations: LLM, search, vector DB, email, and the job queue all degrade to a documented fallback rather than crash when unconfigured. This appears to be an intentional, real requirement ("the app should never hard-fail just because an optional third-party API key is missing") — it should be treated as a standing constraint for any new integration, and the two exceptions found (`campaigns/[id]/send`'s queue call, the crypto-payment manual-wallet fallback) should be fixed to match.

## 6. Explicitly out of scope (per this audit, not per original product intent — see caveats)

Items marked "Stub" or "Missing" in §4 are not, strictly speaking, "out of scope" — the product clearly intends to have working payment gateways, WhatsApp/SMS sending, and real analyzer data (the UI and schema are fully built for it). They are unfinished, not unwanted. True out-of-scope items (nothing in the code or docs suggests they were ever intended):
- Automated testing infrastructure.
- CI/CD pipeline.
- A password-reset backend (the pages exist publicly but nothing implements the flow — likely an oversight rather than a deliberate scope cut, given signup/login are both fully built).

## 7. Contradictory requirements found

1. **Documented default login vs. actual code**: `README-DEPLOY.md` states the default login is `admin@expload.io` / `admin123`; the actual seed route hardcodes `demo12345`. One of these is wrong — needs a decision on which is correct, then the other fixed.
2. **RBAC granularity**: the UI (custom-role editor, built this session on top of pre-existing API endpoints) implies tenant owners can define arbitrary fine-grained permission sets per custom role. The actual enforcement code cannot read those permissions at all (`roleId` is never populated on the session user object) — the UI promises something the backend cannot deliver. This needs a product decision: either implement enforcement, or scale back the UI's promise.
3. **"Production-ready" payment gateways vs. reality**: the pricing/settings UI presents 15 payment gateways as configurable, implying real payment processing; 11 of them process nothing. A customer configuring "Stripe" in good faith would believe card payments are live when they are not.

## 8. Hidden requirements (inferred from system behavior, not written anywhere — per this phase's explicit instruction to extract these)

- **"A tenant's data must survive tenant deletion cascades correctly for financial/audit records, but not for everyday CRM data."** Inferred from the schema's mixed `onDelete: Cascade` (77 relations) vs. `SetNull` (9 relations, notably `Activity.user`, `EmailTemplate.creator`) pattern — the system was clearly designed so that deleting a user preserves the historical record (who did what) even after that user is gone, while deleting a tenant wipes its operational data. This is a real, considered business rule embedded only in schema annotations, never written down.
- **"The platform must function usably even when zero of its optional third-party integrations are configured."** Inferred from the consistent fallback-to-mock/in-memory/in-DB pattern across nearly every external integration — this is clearly a deliberate design requirement (a new operator can run the whole platform with just `NEXTAUTH_SECRET` and one LLM key), not an accident, and should be preserved as new integrations are added.
- **"Every AI-generated negotiation proposal must be traceable and auditable."** Inferred from `NegotiationAuditEvent` existing as a dedicated model logging every state change, separate from the proposals themselves — implies a compliance/trust requirement around AI-driven pricing decisions that isn't stated anywhere in prose but is clearly load-bearing in the schema design.
- **"Session-derived tenant context should be overridable for API-client access."** Inferred from `getTenantId()`'s deliberate `X-Tenant-ID` header fallback (`src/lib/tenant.ts`) — this reads as an intentional design for allowing external API clients (e.g. marketplace API-key consumers) to specify their tenant context directly, rather than only through a session cookie. **However**, as currently implemented, this requirement conflicts with the multi-tenancy isolation requirement in §5 — the header isn't paired with an API-key check, so it grants that access to anyone, not just legitimate API clients. This is very likely the origin of the tenant-isolation flaw in `SECURITY-BASELINE.md`: a real, intended requirement, implemented without the authentication check it needed.

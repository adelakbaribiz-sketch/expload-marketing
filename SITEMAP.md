# SITEMAP.md — Sitemap, Screen Map, Navigation & Information Architecture

Generated 2026-09-05, Phase 06 (UX Architecture). Companion to `USER-JOURNEYS.md` (the flow-level document — Entry/Main/Alternate/Error/Empty/Recovery per role). Every claim below is evidence-cited against the actual running app, not a redesign proposal — this is what the app's IA *is today*, with gaps flagged inline and fixes tracked in `USER-JOURNEYS.md`'s "Proposed UX fixes" section.

## How this app is actually structured (read this first)

Expload Marketing is a **single-page application with one real route** (`/`, `src/app/page.tsx`) that switches between 62 "views" via client-side state (`useState<View>`), plus exactly one other real Next.js route (`/invite/[token]`). There is no URL per view — refreshing, sharing a link, or using the browser back button always returns to `/` and the default `dashboard` view. Every "page" in the sitemap below is therefore a *view*, not a URL, except where explicitly noted.

**Integrity check (verified programmatically, not by eye)**: the `View` union type, the sidebar's `SECTIONS` nav array, `page.tsx`'s `VIEW_META` title/subtitle map, and `page.tsx`'s `RenderView` switch were cross-diffed — all four contain exactly the same 62 ids with zero mismatches. There is no orphaned nav item and no silent fallthrough to the default view. This is a genuinely clean result for a 62-view app that grew incrementally — worth stating plainly rather than assuming it's broken.

---

## 1. Sitemap

```
/ (unauthenticated)
├── Landing Page (src/components/dashboard/landing-page.tsx)
│   ├── Live Interactive Demo widget (public, no login — src/components/landing/live-demo-section.tsx)
│   └── Auth Modal (login / signup tabs — src/components/auth/auth-modal.tsx)
│
/ (authenticated) — Dashboard Shell (Sidebar + Header + active View)
│
├── OVERVIEW (10 views)
│   dashboard · agent-hub · graph-agent · project-intake · events-calendar ·
│   unified · roadmap · quick-setup · goals · calendar
│
├── ACQUIRE — P1-P2 (8 views)
│   leads · generator · crm · campaigns · engagement · attribution ·
│   competitor-analysis · investor-hub
│
├── GROW — P3-P8 (10 views)
│   content · seo · growth · ads · social · listening · backlinks ·
│   social-analyzer · export-analyzer · analytics
│
├── MONETIZE & AI (18 views)
│   ai · advisor · workflow · autonomous · pricing · marketplace · club ·
│   ecommerce · reseller · distributors · payment-gateways · llm-settings ·
│   ai-decisions · onboarding-wizard · negotiation · virtual-assistants ·
│   support-plans · payroll
│
└── SYSTEM (16 views, 2 conditional)
    notification-center · internal-portal [gate: internalPlatformRole] ·
    super-admin [gate: isSuperAdmin] · white-label · finance ·
    financial-reports · platform · promo-links · team · approvals ·
    webhooks · projects · tenants · activity · settings · sandbox-demo

/invite/[token] (public, unauthenticated) — Invite Accept page
    src/app/invite/[token]/page.tsx → InviteAcceptClient
```

That's the entire routable surface of the application: 1 shell route with 62 client-side views + 1 real secondary route. No other `src/app/*/page.tsx` exists.

---

## 2. Screen Map

Full inventory of all 62 views — id, section, title (from `VIEW_META`), component file. (Nav label/hint omitted here since it's cosmetic; see `sidebar.tsx` for exact badge text.)

### Overview
| View id | Title | Component |
|---|---|---|
| `dashboard` | Dashboard | `dashboard-view.tsx` |
| `agent-hub` | Agent Hub | `agent-hub-view.tsx` |
| `graph-agent` | Graph Agent Orchestrator | `graph-agent-view.tsx` |
| `project-intake` | Project Brief & Pricing | `project-intake-view.tsx` |
| `events-calendar` | Events & Smart Scheduler | `events-calendar-view.tsx` |
| `unified` | Unified Dashboard | `unified-dashboard-view.tsx` |
| `roadmap` | Marketing Roadmap | `progressive-roadmap-view.tsx` |
| `quick-setup` | 1-Click Setup | `quick-setup-view.tsx` |
| `goals` | Goals & Onboarding | `goals-view.tsx` |
| `calendar` | Marketing Calendar | `calendar-view.tsx` |

### Acquire
| View id | Title | Component |
|---|---|---|
| `leads` | Leads Management | `leads-view.tsx` |
| `generator` | AI Lead Generator | `generator-view.tsx` |
| `crm` | CRM Pipeline | `crm-view.tsx` |
| `campaigns` | Email Campaigns | `campaigns-view.tsx` |
| `engagement` | Engagement Hub | `engagement-hub-view.tsx` |
| `attribution` | Attribution & Analytics | `attribution-view.tsx` |
| `competitor-analysis` | Competitor Deep Analysis | `competitor-analysis-view.tsx` |
| `investor-hub` | Investor & Partnership Hub | `investor-hub-view.tsx` |

### Grow
| View id | Title | Component |
|---|---|---|
| `content` | Content Strategy | `content-view.tsx` |
| `seo` | SEO Platform | `seo-view.tsx` |
| `growth` | Growth & Optimization | `growth-view.tsx` |
| `ads` | Advertising | `ads-view.tsx` |
| `social` | Social Media | `social-view.tsx` |
| `listening` | Social Listening | `social-listening-view.tsx` |
| `backlinks` | Backlink Platform | `backlinks-view.tsx` |
| `social-analyzer` | Social Media Analyzer | `social-analyzer-view.tsx` |
| `export-analyzer` | Export Market Analyzer | `export-analyzer-view.tsx` |
| `analytics` | Analytics | `analytics-view.tsx` |

### Monetize & AI
| View id | Title | Component |
|---|---|---|
| `ai` | AI Agents | `ai-agents-view.tsx` |
| `advisor` | AI Advisor Hub | `ai-advisor-hub-view.tsx` |
| `workflow` | Workflow Engine | `workflow-view.tsx` |
| `autonomous` | Autonomous Marketing Agent | `autonomous-agent-view.tsx` |
| `pricing` | Pricing & Billing | `pricing-view.tsx` |
| `marketplace` | API Marketplace | `marketplace-view.tsx` |
| `club` | Customer Club | `club-view.tsx` |
| `ecommerce` | Ecommerce Analyzer | `ecommerce-view.tsx` |
| `reseller` | Reseller Hub | `reseller-view.tsx` |
| `distributors` | Wholesale Distributors | `distributor-view.tsx` |
| `payment-gateways` | Payment Gateways & Crypto | `payment-gateways-view.tsx` |
| `llm-settings` | Multi-LLM Aggregator | `llm-settings-view.tsx` |
| `ai-decisions` | AI Decisions | `ai-decisions-view.tsx` |
| `onboarding-wizard` | Onboarding Wizard | `onboarding-wizard-view.tsx` |
| `negotiation` | Negotiation Engine | `negotiation-view.tsx` |
| `virtual-assistants` | Virtual Assistant Service | `virtual-assistant-view.tsx` |
| `support-plans` | Support Plans | `support-plans-view.tsx` |
| `payroll` | Payroll & Salary | `payroll-view.tsx` |

### System
| View id | Title | Component | Gate |
|---|---|---|---|
| `notification-center` | Notification Center | `notification-center-view.tsx` | none |
| `internal-portal` | Internal Portal | `internal-portal-view.tsx` | `user?.internalPlatformRole` |
| `super-admin` | Super Admin Panel | `super-admin-view.tsx` | `user?.isSuperAdmin` |
| `white-label` | White Label & Reseller | `white-label-view.tsx` | none |
| `finance` | Finance & Payments | `finance-view.tsx` | none |
| `financial-reports` | Financial Reports | `financial-reports-view.tsx` | none |
| `platform` | Platform Self-Promotion | `platform-promotion-view.tsx` | none |
| `promo-links` | Marketing Link Generator | `promo-link-view.tsx` | none |
| `team` | Team & Access Control | `team-view.tsx` | none |
| `approvals` | Approval Queue | `approvals-view.tsx` | none |
| `webhooks` | Webhooks | `webhooks-view.tsx` | none |
| `projects` | Projects | `projects-view.tsx` | none |
| `tenants` | Tenants | `tenants-view.tsx` | none |
| `activity` | System Activity | `activity-view.tsx` | none |
| `settings` | Settings | `settings-view.tsx` | none |
| `sandbox-demo` | Demo Sandbox | `sandbox-demo-view.tsx` | none |

---

## 3. Navigation model

- **Primary nav**: the Sidebar (`src/components/dashboard/sidebar.tsx`) — 5 collapsible sections (Overview/Acquire/Grow/Monetize/System), flat within each section (no further nesting). This is the *only* top-level navigation surface; there is no header-level nav menu.
- **Secondary nav (in-view)**: 25 of the 62 view components use a `Tabs` sub-navigation pattern for internal sections (e.g. `team-view.tsx` → Members/Roles/Audit Log; `finance-view.tsx` → Overview/Payments/Alerts/Methods; `engagement-hub-view.tsx` → WhatsApp/Conversational AI/Reviews/Push&SMS). Tab state is local component state, not URL-addressable — refreshing or sharing a link always returns to the first tab.
- **Command palette** (`src/components/i18n/command-palette.tsx`, ⌘K): a **small fixed subset**, not a mirror of the sidebar — only 7 hardcoded items (`dashboard`, `leads`, `generator`, `projects`, `tenants`, `activity`, `settings`) plus theme-toggle and language-switcher actions. It has no awareness of the other 55 views and doesn't respect role gating (moot, since gated items aren't in its list). **Gap**: as the nav has grown to 62 items, the palette hasn't grown with it — a "jump to any view" power-user tool that only reaches ~11% of the app.
- **Header** (`src/components/dashboard/header.tsx`): page title/subtitle, a read-only active-tenant name badge, command-palette trigger, language switcher, theme toggle, and one contextual primary-action button (currently wired only for the `leads` view → "Generate Lead"). **No notification bell, no user/account menu, no logout control.**
- **Tenant switcher**: lives in the Sidebar, not the Header (`sidebar.tsx:249-274`), a `<Select>` populated from `GET /api/tenants` (returns only the caller's own tenant unless they're a SuperAdmin, per `adr/0004`'s tenant-isolation fix).
- **Breadcrumbs**: `src/components/ui/breadcrumb.tsx` exists as an unused shadcn primitive (zero imports anywhere in `src/`). No breadcrumb pattern is used — consistent with the flat, one-level-deep IA, so its absence isn't currently a real gap, just dead code (already noted in `DEAD-CODE.md`-adjacent territory).

### Critical navigation gap: no logout control anywhere

`useAuth().logout()` is fully implemented (`src/components/auth/session-provider.tsx:63-77`, correctly calls `POST /api/auth/logout` and clears local state) but a repo-wide search confirms **it is never invoked from any component**. The only user-identity UI is a static, non-interactive name/email/role card in the sidebar footer (`sidebar.tsx:342-352`). **There is no way for a user to sign out through the interface** — the only way to end a session today is to clear cookies manually or wait for the 30-day expiry. This is the single highest-priority finding in this phase — see "Proposed UX fixes" in `USER-JOURNEYS.md` for the fix (implemented this pass).

---

## 4. Information Architecture

### 4.1 Role-based visibility — the core IA gap

The sidebar reads exactly two identity signals to decide what to show: `user?.internalPlatformRole` (gates `internal-portal`) and `user?.isSuperAdmin` (gates `super-admin`). **It never reads `user.role`** (the tenant-scoped owner/admin/manager/editor/viewer role) for navigation purposes at all — only to print it as text in the footer card. This means **all 60 of the other nav items render identically for every tenant role**, from `owner` down to `viewer`.

Cross-referencing each view's own stated purpose (`VIEW_META` title/subtitle) against who would plausibly use it:

**Confirmed platform-internal, shown to every tenant role (IA bug — fixed this pass):**
| View | Why it's platform-internal, not tenant-facing |
|---|---|
| `payroll` | "Automatic salary distribution: 50% revenue to owner, 50% to staff pool" — this is the *platform operator's own* HR/compensation tool for paying *their own staff* out of *platform* revenue. A tenant customer has no use for it. Already gated server-side to `isPlatformStaffAdmin()` (`SECURITY-BASELINE.md` §2) — every tenant user who clicks it gets a 403 today, a dead-end. |
| `platform` | "The marketing platform that markets itself — campaigns, referrals, financial dashboard" — about marketing *this SaaS product*, not the tenant's business. |

**Ambiguous — flagged, NOT changed this pass (needs a product decision, not an engineering guess):**
| View | Ambiguity |
|---|---|
| `financial-reports` | Subtitle says "for admins, distributors, and affiliates" — could mean platform admins or tenant admins; a near-duplicate `finance` view is unambiguously tenant-scoped, which makes this one read as the platform-operator's cross-account reporting tool by contrast, but not certainly. |
| `virtual-assistants` | "Automatic salary" language mirrors `payroll` — reads like platform-staffed fulfillment-ops, but could also be a tenant-facing "hire help for my account" marketplace. |
| `llm-settings` | Vendor/infrastructure configuration (which LLM backend powers the app) — the kind of setting usually set once platform-wide, not per-tenant, but not certainly restricted. |
| `payment-gateways` | Sits among clearly-platform items in the System section; could be platform-level payment-rail config or a tenant's own storefront payment setup. |
| `distributors` | "Master distributor" + "license pools" + "payouts" reads platform-internal; but the `B2B` hint and adjacency to `reseller`/`white-label` (both confirmed legitimately tenant-facing) suggest it may be the same "tenant becomes a distributor" pattern. |

**Reviewed and confirmed legitimately tenant-facing (not flagged):** `white-label`, `reseller`, `support-plans`, `investor-hub`, `webhooks` (subtitle explicitly says "from your account"), `tenants` (the app has a genuine one-login-many-tenants agency pattern via the sidebar's own tenant switcher).

### 4.2 Two disconnected "try before you sign up" systems

The app has **two independent, non-integrated demo implementations**:

1. **`LiveDemoSection`** (`src/components/landing/live-demo-section.tsx`, embedded in the landing page) — genuinely public, calls `POST /api/public/demo`, is what an anonymous visitor actually encounters. CTA: "Launch Live Demo."
2. **`sandbox-demo` view + `/api/sandbox/*`** — a real, more sophisticated backend (20-action cap, 24h expiry, real conversion-to-account flow) whose own copy says *"Try the platform without signing up... no credit card required."* But this view is only reachable through the authenticated Sidebar, which only renders after login. **An anonymous visitor cannot reach it — the one feature explicitly built to not require signup requires signup to access.**

This is a genuine architecture inconsistency, not a cosmetic one — it represents real, unused backend investment (a full session-limited trial system) sitting behind the exact wall it was built to avoid. Documented here as a **product decision** (merge the two, or make the sandbox genuinely reachable pre-login) — not resolved this pass beyond fixing the sandbox's own internal error-handling bugs (see `USER-JOURNEYS.md`).

### 4.3 Account/settings IA is fragmented

There is no single "Account" or "My Profile" area. Account-adjacent concerns are split across 5 separate top-level nav items with no grouping: `settings` (mostly read-only diagnostics — no profile editing, no password change, no billing, despite the name), `team` (members/roles/audit — the real access-control IA), `pricing` (billing/subscription), `finance` (tenant's own revenue/payments), and `financial-reports`. A user looking for "change my password" or "update my billing" has no single place to start.

### 4.4 What's genuinely well-structured (say so, not just gaps)

- Zero orphaned or dead nav entries across 62 views — confirmed programmatically.
- The 5-section, single-level sidebar grouping is a reasonable, scannable IA for an app this feature-dense — the problem is what's *inside* each section (role-blindness), not the section structure itself.
- The in-view `Tabs` pattern for larger views (team, finance, engagement hub) is applied consistently where it's needed and correctly avoided where it isn't (e.g. `leads-view.tsx` doesn't over-tab a simple list view).
- Login's generic "Invalid email or password" for both wrong-password and non-existent-email is a deliberate, correct anti-enumeration security choice, not an oversight (see `USER-JOURNEYS.md` journey 2).

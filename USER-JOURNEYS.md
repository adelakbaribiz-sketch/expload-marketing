# USER-JOURNEYS.md — User Journeys, UX Completeness Audit & Fixes

Generated 2026-09-05, Phase 06 (UX Architecture). Companion to `SITEMAP.md` (screen inventory/IA). Every journey below is traced against real code (component logic, API calls, error handling) — not an idealized flow. Format per journey: **Entry Point → Main Flow → Alternate Flow → Error Flow → Empty Flow → Recovery Flow**.

---

## Journey 1 — New tenant owner signup

- **Entry Point**: Landing page (`landing-page.tsx`) — any CTA calls `openAuthModal('signup')`, opening `AuthModal` on the signup tab.
- **Main Flow**: `handleSignup` (`auth-modal.tsx:60-105`) validates client-side → `POST /api/auth/signup` (requires `tenantName`+`tenantDomain`, creates tenant+owner user, **auto-seeds** a project, 5 sample leads, an email template, fraud rules, a funnel, a customer journey, club tier/points, and 2 goals — all wrapped in try/catch so seeding failure is non-fatal). The signup route itself never sets a session cookie; the client then explicitly calls `login(email, password)` (real auto-login) and reloads. Lands on the default `dashboard` view — **not** `quick-setup`/`onboarding-wizard`/`roadmap`, despite those existing specifically to guide a new user.
- **Alternate Flow**: The `/api/seed` auto-bootstrap in `page.tsx:104-125` is a *separate* narrow path that only fires if `GET /api/tenants` returns zero tenants — essentially never true right after a real signup (which always has exactly one tenant), so it's a recovery path for orphaned accounts, not part of the normal signup flow.
- **Error Flow**: Duplicate email/domain (409) and validation failures (400) surface via `toast.error(...)` — visible, though raw zod-flatten errors aren't formatted per-field.
- **Empty Flow**: Because signup auto-seeds 5 sample leads, the "empty" dashboard case rarely triggers for a real signup — the new owner's first screen shows KPI cards and charts populated with **synthetic data indistinguishable from real data** (e.g. "Sample Lead 1 — Software"), with no label anywhere marking it as demo/sample content. If seeding does fail, `dashboard-view.tsx` shows plain "no leads yet" text with no CTA.
- **Recovery Flow**: None needed for the happy path; for the rare true-empty case, no action button exists to guide the user toward adding their first lead.

**Gaps found**: (1) synthetic seed data shown unlabeled on first login — a new owner could mistake it for real data or, worse, real accumulated results; (2) no onboarding nudge toward `quick-setup`/`roadmap` despite those views existing for exactly this moment; (3) empty-state text has no call-to-action.

---

## Journey 2 — Returning user login

- **Entry Point**: `openAuthModal('login')` from the landing page.
- **Main Flow**: `handleLogin` → `login()` → `POST /api/auth/login` → `authenticateUser` verifies password, sets cookie → dashboard renders.
- **Alternate Flow**: n/a (single path).
- **Error Flow**: Wrong password and non-existent email both produce the **identical** generic `'Invalid email or password'` message — a deliberate, correct anti-enumeration security choice (not an oversight). A deactivated user/tenant also gets this same generic message, with no signal distinguishing "you mistyped your password" from "your account was disabled" — an intentional security tradeoff, but one with a real cost: a legitimately-deactivated user has no way to discover *why* they can't get in.
- **Empty Flow**: n/a.
- **Recovery Flow**: **No password-reset flow exists anywhere** (already tracked in `KNOWN-ISSUES.md`/`SECURITY-BASELINE.md` §1 — `/forgot-password` is a dead public-route entry with no page). A user who forgets their password, or was deactivated, has zero self-service recovery path. `session-provider.tsx` only calls `refresh()` once on mount — if a session is invalidated mid-use (tenant deactivated by a SuperAdmin), the SPA won't notice until next reload, and dashboard queries just show a React Query error state rather than forcing a clean re-auth.

**Gaps found**: password-reset dead end (pre-existing, tracked, not re-fixed here — it's a feature-build item, not a point fix). Session-staleness detection is a real but lower-priority gap.

---

## Journey 3 — Team member accepting an invite

- **Entry Point**: `/invite/[token]` → `InviteAcceptClient`, fetches invite info via `GET /api/team/invite/[token]`.
- **Main Flow (new email)**: Name+password form → `POST .../accept` creates the account, marks the invite accepted, client explicitly calls `login()` (real auto-login), redirects to `/` after 800ms — lands on the dashboard already authenticated.
- **Alternate Flow (existing account — the security-hardened path from Phase 05)**: Password-only form (proves ownership of the existing account) → server reassigns `tenantId`/`role` → but **the client never calls `login()` here and the server never sets a cookie** — it only calls `refresh()` and redirects. If the browser already had a valid session (common case: same browser, was logged into their old tenant), `refresh()` picks up the change and they land on the dashboard seamlessly. If they had no active session (fresh/incognito browser), `refresh()` returns null and they're dropped on the plain login screen, forced to **manually re-type the exact password they just entered**. This is a real, confirmed asymmetry between the two branches — fixed this pass (see below).
- **Error Flow**: Expired token → clear message, but no "request a new invite" action (must ask an admin manually — acceptable, since only an admin can send one). Already-processed invite → clear, dead-end message (no retry offered, which is correct — there's nothing to retry). Invalid token (404) → visible error, not silent. Wrong password on the existing-account branch → visible toast from the server's 401.
- **Empty Flow**: n/a.
- **Recovery Flow**: The existing-account branch's silent-if-no-session case (above) is the one real recovery gap — fixed this pass.

**Gaps found (fixed this pass)**: existing-account accept branch doesn't reliably land the user on the dashboard — now explicitly calls `login()` with the just-verified password after a successful accept, matching the new-account branch's behavior.

---

## Journey 4 — Anonymous visitor trying the demo

**This journey surfaced the clearest architecture bug in the whole audit.** Two independent demo systems exist:

- **Entry Point (the one that actually works)**: `LiveDemoSection` on the landing page, "Launch Live Demo" button → `POST /api/public/demo` (genuinely public). Read-only sample data across 5 tabs, 5 permanently-locked tabs, two "Sign Up" CTAs that open the real signup modal. No action limit, no expiry — purely illustrative, and it does its one job correctly.
- **Entry Point (the one that's unreachable)**: the `sandbox-demo` view, whose own copy says *"Try the platform without signing up... no credit card required."* Its backend (`/api/sandbox/start|action|convert`) is real and genuinely public/no-auth by design (20-action cap, 24h expiry, real conversion-to-account). But the *only* frontend consumer is wired into the authenticated Sidebar — which only renders after login. **An anonymous visitor has no UI path to this feature at all.**
- **Main Flow (for a user who does reach it, i.e. already logged in)**: Start session → creates a throwaway mock tenant. Clicking a "module" card just increments an action counter — the "Simulated Dashboard Preview" shows **hardcoded static numbers regardless of which module was clicked**; the module buttons are decorative, not functional navigation.
- **Error Flow**: Hitting the 20-action limit returns `{error:'action_limit_reached', upgradeUrl:'/signup'}` (HTTP 429) — but the frontend's `onError` shows a **generic `toast.error('Action failed')`**, never reading or using `upgradeUrl`, and doesn't distinguish limit-reached from session-expired from a real network error. **`/signup` isn't even a real route in this app** (the app has only `/` and `/invite/[token]`) — following `upgradeUrl` would 404 regardless.
- **Empty Flow**: n/a.
- **Recovery Flow**: The conversion form (`/api/sandbox/convert`) exists inline in the (unreachable-to-anon) view, and — like the invite-accept bug above — doesn't set a session cookie or auto-login on success; it drops the newly-registered user back on the landing page to log in manually.

**Gaps found**: (1) the sandbox system is architecturally unreachable by its intended audience — a product decision (merge with `LiveDemoSection`, or make it reachable pre-login), not fixed this pass; (2) the generic error toast masking a real, actionable "you hit your limit — sign up to keep going" moment — **fixed this pass**; (3) the dead `/signup` URL reference — **fixed this pass** (now opens the real signup modal instead).

---

## Journey 5 — SuperAdmin's first login after bootstrap

- **Entry Point**: Normal login, after `scripts/bootstrap-super-admin.ts` has been run against their existing account by an operator with server access (the only supported path — confirmed the script requires an already-signed-up user, it never creates accounts).
- **Main Flow**: Identical login flow to journey 2; `getCurrentUser()` now additionally resolves `isSuperAdmin: true`, which the Sidebar uses to inject the `super-admin` nav item.
- **Alternate Flow**: If also an `InternalEmployee`, `internal-portal` appears too — the only two nav differences from a normal owner.
- **Error/Empty/Recovery Flow**: Same as journey 2 (no SuperAdmin-specific handling exists or is needed here).
- **Notable**: the Super Admin Panel pulls genuinely platform-wide, cross-tenant data (all tenants/users/audit log/job queue), and `GET /api/tenants` itself returns every tenant once `isSuperAdmin` is true — feeding the same tenant-switcher `<Select>` every other user sees, just with a much longer list. This is a coherent, well-scoped elevation (confirmed correctly gated server-side per `SECURITY-BASELINE.md`), not a UX gap.

---

## Journey 6 — A `viewer`-role team member's experience

- **Entry Point**: Accepted an invite with `role: viewer` (journey 3).
- **Main Flow**: Logs in exactly like any other tenant user — **and sees the exact same UI as an owner.**
- **Alternate/Error/Empty/Recovery Flow**: All identical to owner — because nothing distinguishes them.

**The core finding**: `rbac.ts` defines `viewer` as read-only by convention and implements real enforcement logic (`hasPermission()`/`requirePermission()`), but it is only wired into a narrow set of admin/platform-tier routes (`admin/*`, `distributors/*`, `finance/*`, `internal/*`, `llm/providers`, `marketplace/*`, `payments/*`, `payroll/*`, `platform/finance`). **`leads`/`campaigns` — the two most common tenant CRUD surfaces — never call `rbac.ts` at all**; their write endpoints only require a valid session, not a role check. And the frontend has **zero role-conditional rendering** anywhere in `leads-view.tsx`/`campaigns-view.tsx` (confirmed via grep — no matches for `role` at all in either file). A `viewer` sees every create/edit/delete button, and clicking them **succeeds**, not just "looks clickable but fails server-side" — the read-only promise isn't enforced at either layer for these two views.

**Gaps found**: this is a real, significant gap spanning both security (backend enforcement) and UX (frontend affordance) — full resolution (wiring `rbac.ts` into every tenant-CRUD route, and role-gating every action button across all 62 views) is out of scope for a single UX pass and is tracked as a deferred, prioritized item (see below). **This pass implements the frontend half for the two views actually audited** (`leads`, `campaigns`) as a representative, contained fix — hiding create/edit/delete affordances for `viewer`-role users — establishing the pattern for the rest to follow later, matching this project's established "fix the highest-value subset now, document the rest" discipline.

---

## UX completeness audit — all 62 dashboard views

Full grep-based sweep of every `src/components/dashboard/*-view.tsx` for: loading state, empty state, visible error state, and destructive-action confirmation.

### Headline numbers
- **Loading state**: ~40/62 have a real skeleton/spinner on their primary query; ~14 partial (some queries covered, others not); ~8 have none.
- **Empty state**: ~54/62 have a deliberate empty-state message; a handful (`reseller-view.tsx`, `graph-agent-view.tsx`) show nothing when a list is empty.
- **Visible error state**: this is the weakest dimension, confirmed by a second, more precise verification pass — **0 of 58 applicable views check `isError` on their primary data query at all** (`isError` does not appear anywhere in `src/components/dashboard/*-view.tsx`). Every view follows a `!res.ok → return {items: []}` (or equivalent) pattern in its query function, meaning a failed initial fetch is **indistinguishable from "you genuinely have zero items"** — the user sees either an empty-state message or an infinite skeleton, never "failed to load, try again." What *does* exist widely (in most files) is `useMutation({ onError: () => toast.error(...) })` on write actions (save/delete) — real, but a different thing from surfacing a failed page load. A few views (`unified-dashboard-view.tsx`, `progressive-roadmap-view.tsx`, `club-view.tsx`) go further and render a **blank page** (`return null`) on certain failure paths.
- **Destructive-action confirmation**: only 4 of 13 views with a real delete-style mutation guard it — `leads-view.tsx`, `campaigns-view.tsx`, `tenants-view.tsx`, `projects-view.tsx`, all via the same simple `window.confirm(...)` before `.mutate()` — this is the established convention in the codebase (`AlertDialog` is imported/used nowhere in the 62 view files), so fixes below follow the same pattern for consistency rather than introducing a new component pattern.

### Reference implementations (handle loading/empty/error well)
`generator-view.tsx`, `leads-view.tsx`, `payment-gateways-view.tsx` — worth citing as the pattern other views should converge toward.

### Destructive actions with NO confirmation (fixed this pass)
| File | Action | Real-world cost of an accidental click |
|---|---|---|
| `payroll-view.tsx` | "Approve & Pay" | Triggers a **real payout** — highest-severity item in this list |
| `super-admin-view.tsx` | Toggle tenant active/inactive; promote/demote SuperAdmin | Locks out an entire tenant's users; grants/revokes platform-wide access |
| `internal-portal-view.tsx` | "Terminate" employee | Named a termination action, fires with zero friction |
| `team-view.tsx` | Delete custom role | Removes a role possibly still assigned to users |
| `crm-view.tsx` | Delete deal | Permanent data loss |
| `attribution-view.tsx` | Delete fraud rule / funnel / journey (3 separate buttons) | Permanent data loss ×3 |
| `approvals-view.tsx` | Delete approval request | Permanent data loss |
| `webhooks-view.tsx` | Delete webhook | Silently breaks any integration relying on it |
| `marketplace-view.tsx` | Revoke API key | Immediately breaks any consumer using that key |
| `llm-settings-view.tsx` | Reset provider | Wipes a saved provider API key/config |
| `promo-link-view.tsx` | Delete promo link | Breaks any already-shared/printed link |

---

## Proposed UX fixes (prioritized) and implementation status

### P0 — implemented this pass
1. **No logout control anywhere in the UI.** Added a clickable user menu to the sidebar footer (dropdown with "Sign out", calling the already-implemented `useAuth().logout()`).
2. **11 destructive actions with zero confirmation**, listed above — added `window.confirm(...)` guards before each `.mutate()` call, matching the codebase's existing convention.

### P1 — implemented this pass
3. **`payroll` and `platform` nav items shown to every tenant role** despite being platform-operator-only features (payroll is already server-side gated to platform staff, so every tenant click was a guaranteed dead-end 403) — gated in `sidebar.tsx` behind the same `internalPlatformRole`/`isSuperAdmin` signals `internal-portal`/`super-admin` already use.
4. **Sandbox demo's error handling** — replaced the generic `toast.error('Action failed')` with specific messages for `action_limit_reached` (with a working "Sign up" CTA that opens the real auth modal) vs `session_expired`, and removed the dead `/signup` URL reference.
5. **Dashboard empty state has no call-to-action** — added a "Generate your first leads" button linking to the `generator` view, alongside the existing "no leads yet" message.
6. **Viewer-role UI gating in `leads-view.tsx`/`campaigns-view.tsx`** — create/edit/delete affordances now hidden for `role === 'viewer'`, establishing the pattern for the remaining views (documented as P2 below, not blindly rolled out everywhere in one pass).
7. **Invite-accept existing-account branch doesn't reliably land the user on the dashboard** — now explicitly logs the user in with the just-verified password after a successful accept.

### P2 — documented, deferred (need a product decision or larger scope, not an oversight to quietly fix)
- The 2 disconnected demo systems (`LiveDemoSection` vs `sandbox-demo`) — needs a decision on which to keep/merge, not an engineering guess.
- The 5 ambiguous platform-vs-tenant nav items (`financial-reports`, `virtual-assistants`, `llm-settings`, `payment-gateways`, `distributors`) — needs a product owner's call per item, see `SITEMAP.md` §4.1.
- Full `rbac.ts` enforcement across all tenant-CRUD routes, and role-gating every action button across all 62 views (this pass only covers `leads`/`campaigns` as the representative fix) — large, cross-cutting, tracked for its own pass.
- Settings page fragmentation (no real profile/password/billing management under "Settings") — feature-build work, not a point fix.
- Command palette only covering 7 of 62 views — low priority, cosmetic.
- Weak error-state visibility across the majority of views (the `!res.ok → {items:[]}` pattern) — a systemic pattern affecting ~50 files; fixing it properly means changing the shared query-error convention project-wide, out of scope for a single pass. Flagged as the single highest-leverage follow-up for a future UX pass, since it's the dimension with the worst coverage (see headline numbers above).
- Unlabeled synthetic seed data on first login (Journey 1) — changing signup's auto-seed behavior is a product/business decision (it exists specifically to make first login feel populated), not an obvious bug to unilaterally remove.

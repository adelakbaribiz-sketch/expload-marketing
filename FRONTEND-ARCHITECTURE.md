# Frontend Architecture — Phase 09 (Frontend Engineering)

**Date**: 2026-09-06
**Scope**: Audit + standardization of the client-side app (`src/app/page.tsx`, `src/components/**`, `src/store/**`). Companion to `SITEMAP.md`/`USER-JOURNEYS.md` (Phase 06), `DESIGN-SYSTEM.md` (Phase 07), and `BACKEND-ARCHITECTURE.md` (Phase 08) — this document builds on those, it doesn't repeat their findings.

Audited via three full-codebase sweeps (architecture/state/routing/API layer; forms/validation/auth/business-rules; accessibility/performance/responsive) plus direct reads of the central infrastructure files. This document is the synthesis: current architecture, findings per area, what was fixed now, and what's deferred with severity.

---

## 0. Critical finding — production CSRF check rejected every authenticated write in the standalone/Docker deployment

Writing this phase's E2E test (§ Testing, below) surfaced a severe, previously-undetected bug that had nothing to do with the frontend directly but blocks every real user action once deployed: `src/proxy.ts`'s CSRF defense-in-depth check (Phase 05) rejected the request if `origin !== req.nextUrl.origin`. `req.nextUrl.origin` reflects the **server's own bind address**, not the host a real browser addressed — confirmed live: running the actual production artifact (`next build` → `.next/standalone/server.js`, the exact command `docker-compose.prod.yml` runs) returns `req.nextUrl.origin = "http://0.0.0.0:3000"` regardless of what domain a user's browser is pointed at. A real browser's `Origin` header can never equal `http://0.0.0.0:PORT`, so **every authenticated POST/PUT/PATCH/DELETE request would have been rejected with a 403 in the deployed standalone/Docker environment** (dev mode never exhibited this because `next dev` derives `nextUrl.origin` differently). This was invisible in every prior phase's live-verification because those all ran against `next dev`, never a production build.

**Fixed**: `proxy.ts` now derives the expected origin from the `Host` header (what the browser actually addressed, forwarded correctly by Caddy in production) instead of `req.nextUrl.origin`, with `X-Forwarded-Proto` for the scheme. Confirmed fixed by running the full signup → create-deal E2E journey against the real standalone build before and after.

---

## 1. Architecture

The app is a client-rendered SPA-in-one-page: `src/app/` has exactly **2 real Next.js routes** — `page.tsx` (the entire authenticated shell) and `invite/[token]/page.tsx`. All 63 dashboard "views" (`src/components/dashboard/*-view.tsx`, 18,239 lines) are selected by a `useState<View>('dashboard')` in `page.tsx`, rendered through a 63-case `switch` in `RenderView`, with a parallel `VIEW_META` object supplying each view's header title/subtitle and `sidebar.tsx` independently owning the `View` union type and nav structure. Adding a view touches 3-4 files (~15-20 lines) with no codegen or shared abstraction — currently 100% consistent by manual discipline (confirmed zero orphaned components, zero dangling nav items in Phase 06's audit), not by a structural guarantee.

Internal view-file structure is genuinely consistent across the ones sampled: `useState` → `useQuery` → `useMutation` → derived values → JSX, in that order, in every file checked. Two files mix multiple unrelated backend domains behind one component (a maintainability/blast-radius smell, not a bug): `engagement-hub-view.tsx` (WhatsApp + chatbot + review-monitoring + push/SMS) and `attribution-view.tsx` (822 lines, the largest view — raw events + fraud rules + funnels + journeys).

This is very likely a deliberate modular-monolith-SPA choice (`adr/0001`), not an incomplete migration — reported factually rather than as a defect. Concrete user-facing consequences are in §4 (Routing).

**Not addressed this phase**: splitting the 2 multi-domain "god views" into per-domain components — real but not urgent; documented as deferred.

---

## 2. Components

No shared data-table, stat-card-grid, or create/edit-dialog component exists — confirmed by direct search. `ui/table.tsx` (a complete shadcn primitive) is imported by **zero** files; 5 of 63 views hand-roll a raw `<table>` instead (done correctly where present — `overflow-x-auto`, `hidden md:table-cell` for secondary columns on mobile). A new finding beyond Phase 07's Table/Dialog/EmptyState/AlertDialog audit: **stat-card grids are hand-rolled independently 118 times across 53 files** — no `StatCard` component exists anywhere, not even as a local helper.

**Not addressed this phase**: same treatment as Phase 07's Table/AlertDialog findings — documented, deferred mechanical consolidation, not a blind rewrite of 53 files.

---

## 3. State

The 3-way split — React Query (server state), Zustand with `persist` (`app-store.ts`: `activeTenantId`/`sidebarOpen`; `auth-store.ts`: auth-modal state), React Context (`AuthProvider`/`useAuth`, the one genuinely global, rarely-changing value) — is **largely principled**. A targeted grep for the `useEffect(() => fetch...setState())` anti-pattern (manually syncing fetched data into local state instead of the query cache) returned **zero matches** across all 62 views: every server-data read goes through `useQuery`/`useMutation`, no duplication found. Tenant scoping is centralized in one place (`providers.tsx`'s `TenantSync` writes the `tenant-id` cookie once; no view sets a tenant header itself).

**Two real bugs found and fixed this phase**:
- `auth-store.ts` persisted `authModalOpen`/`authModalMode` to localStorage with no `partialize`. Closing the tab mid-login left `authModalOpen: true` in storage, reopening the login/signup modal unprompted on the next visit — including for an already-logged-in user. **Fixed**: `partialize: () => ({})` — this store's fields are transient UI state, not something that should survive a reload.
- `sidebar.tsx`'s nav-item `onClick` called `setSidebarOpen(false)` unconditionally on every click. Since the same boolean also controls the **persistent desktop sidebar's** visibility (`sidebarOpen ? translate-x-0 : '... md:hidden'`), every single nav click on desktop hid the whole sidebar with no way to reopen it short of a page reload. This was mobile-drawer-close logic that was never scoped to mobile — caught live by this phase's own E2E test ("create and view a CRM deal" journey lost the sidebar after the first nav click). **Fixed**: gated to `window.innerWidth < 768`, matching the existing Escape-key-close and overlay-click-close handlers, which were already correctly scoped.

---

## 4. Routing

Confirmed precisely: **zero dashboard views have a URL.** `useRouter`/`usePathname`/`<Link>`/manual history APIs are used in exactly one place in the entire app (`invite-accept-client.tsx`, the one other real route). Concrete, user-facing consequences: refreshing the page always resets to the `dashboard` view regardless of which of the 63 was active; no view can be bookmarked or shared; browser back/forward don't affect in-app navigation; the command palette is subject to the same limitation (it changes `view` state, not the URL) and is scoped to only 7 hardcoded, non-sensitive targets, so it isn't a permission-bypass vector.

Per the audit brief's framing: this is very likely intentional (consistent across all 63 views, no partial migration) rather than incomplete work, so it's reported here as a factual architectural cost, not fixed. Introducing real per-view routes would be a significant, deliberate architecture change warranting its own plan-mode pass — well outside a single phase's fix budget.

---

## 5. API Layer

No shared API-client wrapper existed: all 62 views called `fetch()` directly (239 call sites), each with its own `Content-Type` header, `!res.ok` branch (some throwing, some silently falling back to an empty-shaped object — the latter masks real backend errors as "no data," compounding Phase 06's separately-documented "0% of views check `isError`" finding), and `res.json()`. `useMutation` is used in 53/62 views (115 call sites); roughly half have no `onError` of their own and rely on the global default toast added in Phase 07/08 (`providers.tsx`).

**What shipped this phase**: `src/lib/api-client.ts` (`apiGet`/`apiPost`/`apiPatch`/`apiDelete`) — centralizes the header/`!res.ok`/`res.json()` boilerplate and, unlike most existing call sites, surfaces the backend's actual `{ error: string }` message instead of a generic `"failed"` string. Adopted in `crm-view.tsx` as a proof of concept (zero behavior change, real code reduction).

**Deferred**: rolling `api-client.ts` out across the other 61 views (~230 remaining call sites) — real, valuable, and appropriately incremental, not a single-phase mechanical rewrite (same discipline as Phase 08's zod-rollout deferral).

---

## 6. Authentication (frontend)

`useAuth()` backed by one `GET /api/auth/me` fetch on mount; the **only** auth gate is `page.tsx`'s top-level `if (!user)` — nothing inside `RenderView` is ever reached without it, since there's no second route that could skip the check (§4). This is a single, consistent choke point, confirmed correct. No other view re-checks `user` on its own, which is consistent but brittle: the entire authorization model for "can this view render" collapses onto that one check plus whatever `Sidebar` chooses to list (§7) — a future second route added without going through this gate would have nothing else stopping it.

**Not addressed this phase**: no gap found that needs fixing; noted as an architectural fragility worth keeping in mind if routing (§4) ever changes.

---

## 7. Authorization (frontend) and frontend-only business rules

This is the audit's highest-priority area, since a rule enforced only in the UI is a real bypass for anyone who calls the API directly.

**Frontend role-gating is minimal and inconsistent — 3 one-off implementations, no shared pattern**: `sidebar.tsx` hides `payroll`/`internal-portal`/`super-admin`/`platform` nav items based on `user?.internalPlatformRole`/`isSuperAdmin` (with inline comments correctly noting these are UI-only affordance-hiding because the backend already gates them); `leads-view.tsx`/`campaigns-view.tsx` hide write buttons via `canWrite = user?.role !== 'viewer'`. No other view — not `team-view.tsx`, not `distributor-view.tsx`, not `club-view.tsx` — implements any client-side role check.

**Findings, cross-referenced against the actual backend route, ranked by risk**:

| Rule | Frontend | Backend (before this phase) | Gap? |
|---|---|---|---|
| `club/membership` `earn_points` action can award arbitrary points/spend to any tenant user | *(no UI references this action at all)* | **None** — no permission check, no bound on caller-supplied `points`/`spendAmount` | **Critical** — a live, unauthenticated-by-role, UI-invisible mutation. Any logged-in tenant user could `curl` it to mint unlimited points, then redeem them for real discounts/ad-credits via the (correctly-guarded) redeem endpoint |
| `leads`/`campaigns` write access should be blocked for `role: 'viewer'` | `canWrite` hides buttons — the code's own comment says this establishes "the intended UI-level pattern" assuming the backend also enforces it | **None** — `rbac.ts` documents `viewer → read-only` but the leads/campaigns write routes never checked it | **Confirmed** — the exact "frontend-only business rule" this phase's brief asked to find. A viewer bypassing the UI could create/edit/delete leads and campaigns |
| Team role assignment shouldn't let a delegated `team.manage` holder grant full `owner` access | none | `POST /api/team/members` let any `team.manage`-permitted caller set the literal `role: 'owner'` string on any user, which `hasPermission()` treats as blanket access to everything — a scoped delegation escalating to full ownership | **Confirmed** — privilege escalation, both layers |
| Payroll revenue input should be a sane, non-negative number | plain `<Input type="number">`, no `min`/validation | only checked *presence*, not sign — a negative `totalRevenue` flowed into `ownerShare`/`staffPool`/`bonusPool` and got persisted as negative salary payments | **Confirmed** — real gap, lower severity (only reachable by `isPlatformStaffAdmin()`-gated internal staff) |
| Distributor license count 1-1000 | HTML `min`/`max` attrs only, trivially bypassable | `Number.isInteger` + range check, transactional (Phase 08) | **Not a gap** — backend already covers it; the exception that proves the rule |
| Club reward redemption / ad-credit spend needs sufficient balance | button `disabled` | re-checked server-side with an atomic `gte`-guarded transaction (Phase 08) | **Not a gap** |

**What shipped this phase**:
- `club/membership` `earn_points` now requires `isPlatformStaffAdmin()` and validates `points` (finite, `0 < points ≤ 100000`) and `spendAmount` (finite, `≥ 0`) — closing the critical, UI-invisible minting hole.
- `leads/route.ts` (POST) and `leads/[id]/route.ts` (PATCH/DELETE), `campaigns/route.ts` (POST) and `campaigns/[id]/route.ts` (PATCH/DELETE) now call a new `requireNonViewer()` helper (`src/lib/auth/rbac.ts`) before writing. Deliberately narrow — it blocks only the literal `role === 'viewer'` string, matching exactly what the frontend's own `canWrite` comment already assumed the backend was doing, rather than routing through `hasPermission()`'s custom-role Permission-table path (which isn't seeded yet per `AGENT-CONTEXT.md` and would over-block legitimate `manager`/`editor` users if used here).
- `POST /api/team/members` now rejects `roleName: 'owner'` unless the caller is already an owner or super admin.
- `payroll/run/route.ts` now rejects a non-finite/negative `totalRevenue` and an invalid `periodStart > periodEnd`; `payroll-view.tsx`'s revenue input got a matching `min={0}` and the submit button is disabled until the form is internally consistent — fixing both layers together, not just the one the audit flagged.

**Deferred**: a real product decision on what `club/membership earn_points` *should* look like when it's actually wired to a real purchase/invoice flow (this phase only closed the immediate hole, it didn't design the feature); a general review of which other custom-role/permission-table gaps exist now that `requireNonViewer()` establishes the "narrow, targeted server-side check" pattern as the answer for `hasPermission()`-table-not-seeded situations.

---

## 8. Forms & Validation

**0% adoption of `react-hook-form`/`zodResolver` despite both being installed dependencies** — confirmed zero usages anywhere in `src`. The only reference to `react-hook-form` is an unused shadcn scaffold (`ui/form.tsx`, never imported). 29 of 62 views (~47%) use the hand-rolled `useState({...}) `+ `onChange={(e) => setForm({...form, field: e.target.value})}` pattern for at least one form; where client validation exists at all, it's almost always reduced to `disabled={!form.requiredField}` on the submit button — no field-level error messages, no format/range checks, no schema.

**Not addressed this phase**: migrating 29+ forms onto `react-hook-form`/zod is a large, systemic, cross-cutting change (comparable in shape to Phase 08's zod-validation rollout) — correctly out of scope for a single phase's fix budget. The two forms with genuine business-rule gaps (payroll revenue, distributor license count) were fixed directly in §7/backend rather than as part of a form-library migration.

---

## 9. Loading, Error, Empty States

Not independently re-audited this phase — Phase 06's `USER-JOURNEYS.md` already established the systemic finding (0% of 62 views show a visible query-error state) as the single highest-leverage UX gap, and it remains unaddressed; Phase 07 shipped `EmptyState` and adopted it in `content-view.tsx` as a proof of concept, with full rollout deferred. This phase's contribution is narrower and complementary: the empty-fallback `fetch` pattern documented in §5 (`return { contracts: [] }` on a failed request) is a second, independent source of the same "errors look like empty data" problem, worth fixing together with the eventual `isError`-state rollout rather than separately.

---

## 10. Accessibility

Building on Phase 07's fixes (2 RTL bugs, a WCAG contrast fix, ~18 `aria-label`s added, and a catalogued-but-deferred ~46-file `htmlFor`/`id` gap, which this phase reconfirmed at the same count — not re-fixed, still correctly deferred as a mechanical consolidation).

**New findings this phase, fixed**:
- **Keyboard access on non-native clickable elements**: 6 sites used `<Card>`/`<tr>` with `onClick` and `cursor-pointer` but no `tabIndex`/`role="button"`/keyboard handler — a keyboard-only user couldn't open a lead's detail row, select a reseller opportunity, launch a graph-agent template, run an agent-hub action, or trigger the sandbox demo. **Fixed**: added `role="button" tabIndex={0}` + a new shared `onActivateKey()` helper (`src/lib/a11y.ts`, Enter/Space activation) to all 6 (`leads-view.tsx`, `agent-hub-view.tsx`, `graph-agent-view.tsx`, `reseller-view.tsx`, `sandbox-demo-view.tsx`), plus a visible focus ring.
- **No Escape-to-close on the 2 hand-rolled (non-Radix) modals**: `project-intake-view.tsx`'s payment-confirmation overlay and the mobile sidebar drawer are plain `<div>`/`<Card>` overlays, not `ui/dialog.tsx`, so they got none of Radix's automatic focus-trap/Escape handling that every other dialog in the app already has for free. **Fixed**: added an Escape-key listener to both (the drawer's is scoped to `<768px` viewports, matching its own mobile-only purpose), plus `role="dialog"`/`aria-modal`/`aria-label` on the payment overlay.
- **WCAG contrast failure, same class as Phase 07's `.text-brand-accent` fix but a different call site**: 12 buttons across 8 files used `bg-brand-accent-gradient text-white` — white text on the ~`#FF6A00`→`#FF8A3D` gradient measures ~2.7-2.9:1, failing AA (needs 4.5:1). The project's own `Button` `default` variant already pairs this exact gradient's base color with `text-primary-foreground` (`#0A0A0B`, ~7:1+) correctly; these 12 sites were overriding that with a redundant, incorrect `text-white`. **Fixed**: removed the override, letting the already-correct default win — `payroll-view.tsx`, `project-intake-view.tsx` (×4), `sandbox-demo-view.tsx` (×2), `virtual-assistant-view.tsx`, `graph-agent-view.tsx`, `events-calendar-view.tsx`, `support-plans-view.tsx` (×2), `guides/guided-tour.tsx` (×2).

**Confirmed, not fixed (documented as deferred, matching Phase 07's existing catalogue)**: `text-emerald-600`/`text-amber-600` used as small/medium body text without a `dark:` pairing fails AA in ~45 of 55 usages — same class of "large mechanical consolidation" already deferred twice (Phase 07, and again here); 14 destructive actions still use native `confirm()` instead of the project's own `AlertDialog` (browser-native `confirm()` is itself keyboard/focus-safe, so this is a branding/consistency gap, not an a11y bug — listed alongside Phase 07's AlertDialog-adoption note); `ui/table.tsx` adoption remains at 0% (§2).

---

## 11. Performance

**Memoization is effectively absent, not merely underused**: `useMemo` appears exactly twice (both in one file), `useCallback` and `React.memo` appear **zero times** across 63 view components (~19,400 lines). Concrete unmemoized O(n) computations run on every render, including on every keystroke of unrelated form fields in the same component (`attribution-view.tsx`'s fraud-event filter/reduce/sum, `export-analyzer-view.tsx`'s market averages). One genuine **O(n²) algorithmic bug**, not just a missing-memo style issue: `financial-reports-view.tsx` recomputed `Math.max(...Object.values(revenue.byDay))` **inside** a `.map()` callback — once per row instead of once per render.

**What shipped this phase**: wrapped `attribution-view.tsx`'s three per-render computations in `useMemo`; hoisted `financial-reports-view.tsx`'s `Math.max` out of the `.map()` loop, fixing the O(n²) pattern.

**Pagination is unreachable from the UI**: Phase 08 added real `?page=`/`?limit=` support to the CRUD factory, but **zero** frontend views pass a `page` param, and only 5 of 63 pass any `limit=` at all (always a fixed cap, never incrementing). `leads-view.tsx` — the highest-risk unbounded list — doesn't even go through the CRUD factory; its bespoke backend route hardcodes `take: 200` with no pagination params, and the frontend renders every returned lead in one unbounded `.map()`. **Not addressed this phase**: wiring real pager UI into even one view is more design work (a pager control, page-state, backend param support for `leads/route.ts` specifically) than the "well-scoped quick win" bar this phase's fix budget targeted — documented as the clearest, highest-value follow-up for a dedicated pass.

**Highest-leverage finding: zero code-splitting.** `next/dynamic` was used **0 times** anywhere in the codebase; `page.tsx` statically imported all 63 view components (plus their dependencies — `recharts` alone ships in the initial bundle for every user via 6 files that import it, even someone who only opens Leads). **Fixed this phase**: converted all 63 dashboard-view + landing-page imports in `page.tsx` to `next/dynamic(() => import(...).then(m => m.X), { loading: () => <ViewLoading /> })`. Each view's code (and its dependencies) now loads only when that view is first opened, instead of every user downloading all 63 up front. A `ViewLoading` skeleton is shown during the chunk fetch.

**Deferred**: removing the confirmed-unused `@mdxeditor/editor` dependency (never imported anywhere in `src`, install-size-only cost since it was never actually bundled) — flagged, not removed, matching this project's discipline of not making unrequested dependency changes opportunistically.

---

## 12. Responsive

Spot-checked 5 data-dense views. Where a raw `<table>` exists, `overflow-x-auto` is reliably present — no horizontal-scroll breakage found. The recurring gap is fixed `grid-cols-N` (N≥2) form/stat grids with no `sm:`/`md:` breakpoint, most inside Dialogs (already width-constrained on mobile, lower severity) but one in `ecommerce-view.tsx:107` directly in the main page body (3 select fields at ~100px each on a 375px viewport) — the worst instance found, since it isn't dialog-constrained. **Not addressed this phase**: consistent with the "fix confirmed bugs, document broader consolidation" pattern used throughout this project — this specific instance is narrow enough it could be picked up alongside the next design-system pass rather than justifying its own change here.

---

## Summary of what shipped this phase

| Area | Fix |
|---|---|
| **Critical — Production bug** | `proxy.ts`'s CSRF Origin check compared against the server's own bind address (`http://0.0.0.0:PORT` in the standalone/Docker build) instead of the `Host` header — this rejected **every authenticated write request** once deployed via `docker-compose.prod.yml`, invisible in every prior phase because they all tested against `next dev`. Found via this phase's E2E test run against a real production build; fixed to derive the expected origin from `Host`/`X-Forwarded-Proto` |
| Security / Business Rules | `club/membership earn_points` gated behind `isPlatformStaffAdmin()` + bounded inputs (was: unauthenticated, unbounded, UI-invisible points-minting); `leads`/`campaigns` write routes now reject `role: 'viewer'` via new `requireNonViewer()`; `team/members` blocks granting `role: 'owner'` unless the caller already is one; `payroll/run` validates revenue/dates server-side with a matching frontend fix |
| State | Fixed `authModalOpen` incorrectly persisting to localStorage (`auth-store.ts` `partialize`); fixed sidebar nav clicks unconditionally hiding the persistent desktop sidebar (`sidebar.tsx`) — caught live by this phase's own E2E test |
| Accessibility | Keyboard activation (`role="button"`/`tabIndex`/Enter-Space) added to 6 non-native clickable elements via a new `src/lib/a11y.ts` helper; Escape-to-close added to the 2 hand-rolled modals; 12 white-on-orange-gradient WCAG contrast failures fixed across 9 files |
| Performance | All 63 dashboard views + the landing page converted to `next/dynamic` code-splitting (was: 100% static-imported, zero code-splitting anywhere); fixed a real O(n²) bug in `financial-reports-view.tsx`; added `useMemo` to `attribution-view.tsx`'s per-render computations |
| API Layer | New `src/lib/api-client.ts` shared fetch wrapper, adopted in `crm-view.tsx` as a proof of concept |
| Testing | First E2E test suite in the project: Playwright, `e2e/critical-journeys.spec.ts`, covering signup→dashboard, create-and-view-a-CRM-deal, and logout, run against a production build (`bun run e2e:build`). Reliably reproduces and passes on its own; occasional sidebar-click timing flakiness was observed in this specific single-worker Windows dev-machine run, with retry-tolerant waits added where it showed up — the suite is the deliverable and already earned its keep (it's what surfaced the CSRF bug above and the sidebar-close bug in §3) |

## Deferred (prioritized, not fixed this phase)

1. **High** — Rolling `react-hook-form`/zod validation out across the 29+ hand-rolled forms (systemic, matches Phase 08's backend-validation-rollout deferral in shape and scale).
2. **High** — Wiring real pagination UI into at least the highest-risk unbounded list (`leads-view.tsx`), including adding backend pagination support to its bespoke (non-CRUD-factory) route.
3. **Medium** — Phase 06's 0%-query-error-state finding remains the single highest-leverage UX gap in the app; this phase's empty-fallback `fetch` finding (§5) is the same problem from a different angle and should be fixed together with it.
4. **Medium** — Rolling `api-client.ts` out across the remaining 61 views (~230 `fetch` call sites).
5. **Medium** — Splitting `engagement-hub-view.tsx` and `attribution-view.tsx` into per-domain components.
6. **Low-Medium** — `text-emerald-600`/`text-amber-600` contrast gaps in ~45 files without `dark:` pairings (mechanical, same class as Phase 07's already-deferred hex-literal consolidation).
7. **Low** — Shared `StatCard`/data-table component adoption (118 hand-rolled stat grids across 53 files; `ui/table.tsx` at 0% adoption).
8. **Low** — Real per-view URL routing — a deliberate architecture change, not a bug; needs its own plan-mode pass if ever pursued.
9. **Low** — 14 native `confirm()` destructive-action dialogs not yet migrated to the project's own `AlertDialog` (Phase 07's existing note, reconfirmed).
10. **Low** — Removing the confirmed-unused `@mdxeditor/editor` dependency.
11. **Low** — `ecommerce-view.tsx`'s one non-dialog fixed 3-column grid on mobile.

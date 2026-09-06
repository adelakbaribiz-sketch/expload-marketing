# Search, Reporting & Analytics — Phase 14

## 1. Search Engine

Two distinct search mechanisms exist:

- **Semantic search** (`src/lib/vector/qdrant.ts`, `POST /api/vector-search`) — real vector similarity search (Qdrant when configured, in-DB cosine-similarity fallback otherwise, `AI-STACK-AUDIT.md`'s pseudo-embedding fallback when no embedding key is set). Already had filtering (`sourceType`, `tenantId`), a relevance threshold, and a result-count limit — no changes needed.
- **List/keyword search** — `?q=` substring matching scattered across a handful of routes (`leads`, a few others). `leads/route.ts` only matched against `name`, missing a lead whose company name didn't contain the term but whose description/industry did. **Fixed**: now matches across `name`/`description`/`industry`/`website` (OR'd), and gained real pagination (`buildListPagination`, previously just a hardcoded `take: 200` with no `page`/`skip`) — live-verified: `?q=dining` found a lead whose only match was in its `description` field.

## 2. Filtering, Sorting, Pagination

Already standardized for the 91 CRUD-factory domains and several bespoke routes in Phase 08. `leads/route.ts` (the highest-traffic search surface, and a bespoke non-factory route) was the one gap — fixed above. No other bespoke list route was found still missing all three during this pass's `findMany` audit (see §6).

## 3. Full Text Search — honest finding, not implemented

There is no true full-text search (inverted index, ranking, stemming, prefix matching) anywhere in this app — every keyword search is `LIKE '%term%'` substring matching. SQLite supports real FTS via FTS5 virtual tables, but building one requires `CREATE VIRTUAL TABLE` + sync triggers, which needs a real migration — and this project still has no `prisma/migrations/` history (`adr/0006`, tracked as the longest-standing deferred item since Phase 04). Implementing FTS5 now, without a migration system, would mean hand-running DDL outside Prisma's schema — the same class of risk `adr/0006` exists to prevent. **Not implemented this phase**; the multi-field substring search in §1 is a real, honest improvement within that constraint, not a substitute for true FTS — documented as the next step once `adr/0006` lands.

## 4. Internationalization

- **Search correctness**: SQLite's `LIKE` operates on UTF-8 bytes, so a Persian/Arabic/multi-byte search term is matched correctly (verified — no mangling). Its case-insensitivity is ASCII-only, which only matters for accented Latin scripts (e.g. "café" vs "CAFÉ") — Persian/Arabic have no case distinction, so this isn't a functional gap for this app's primary non-English audience.
- **Report labels/UI**: this app already has a mature 29-language i18n system (`src/i18n/`, RTL support) — any report UI built on the data this phase's endpoints expose should route its labels through the existing `t()` system, not hardcode English, the same convention already established for every other dashboard view. No backend-side i18n gap was found in the reporting data itself (JSON field names, not user-facing strings).

## 5. Reporting — the 6 requested categories, mapped to what exists

| Category | Endpoint(s) | Status |
|---|---|---|
| Financial | `GET /api/reports`, `GET /api/finance/reports` | Real, now export-capable (§7). Two independent implementations still exist (`BACKEND-ARCHITECTURE.md` §2's deferred item — which is canonical is a product decision, not re-litigated here); both are now independently permission-safe (§6) |
| Operational | `GET /api/queue` (job-queue health, surfaced in `super-admin-view.tsx`) | Real. **Had zero authorization — fixed this phase (§6)** |
| Business | `GET /api/dashboard/unified` (cross-phase KPIs: leads, deals, campaigns, SEO, ads, social, content — one query per phase, already tenant-scoped) | Real, already correctly scoped — no gap found |
| User | `GET /api/admin/audit` (`AuditLogEntry`, security/action audit trail) | Real, already correctly superadmin-gated — no gap found |
| Performance | `analytics-view.tsx`'s backing routes (per-domain metrics: SEO scores, campaign ROI, ad ROAS — folded into `dashboard/unified` and domain-specific routes, not a single unified "performance" endpoint) | Exists distributed across domains, not consolidated — a genuine design choice (marketing performance spans every phase), not treated as a gap |
| Custom | — | **Doesn't exist.** A full ad-hoc report builder is a real feature, not a bug fix — out of scope for an audit-and-fix phase. The closest existing primitive is the CRUD factory's `filterableFields`/`sortableFields` (Phase 08) — a caller can already build an arbitrary filtered/sorted view of any of the 91 factory-backed domains via query params, which is most of the way to "custom reporting" without a dedicated UI. Documented as the foundation to build a report-builder on, not built this phase (§8) |

## 6. Permission-awareness audit (the phase's core security finding)

Every "report/stats/audit"-shaped endpoint was checked for whether it actually enforces the scope it implies. Four real gaps found; two fixed, two confirmed-intentional-not-fixed after checking their actual callers:

| Endpoint | Finding | Resolution |
|---|---|---|
| `GET /api/reports` | `?audience=admin` (or `platform`) was honored as-is from any authenticated user — `generateFinancialReport`'s admin branch computes platform-wide tenant/user/distributor counts with no authorization check of its own, trusting the caller. A second, independent gap: `?scopeId=<any distributor id>` was also trusted as-is, letting any tenant request another distributor's financial report. | **Fixed** — an unauthorized admin/platform request is downgraded to `affiliate` instead of honored; `scopeId` is only trusted from a superadmin, everyone else's resolves to their own regardless of what the query string claims. Live-verified: `?audience=admin` from a regular tenant returns `audience: "affiliate"` in the response, not admin data |
| `GET /api/queue` | **No authorization check of any kind** — not even "is logged in" beyond what `proxy.ts`'s blanket auth gate provides. Any authenticated user of any tenant could see every job across the entire platform (email-campaign sends, lead-enrichment/document-extraction payloads for every other tenant), despite this being surfaced only in `super-admin-view.tsx` (itself correctly nav-gated, per `FRONTEND-ARCHITECTURE.md`) — the backend never enforced what the frontend assumed | **Fixed** — requires `isSuperAdmin()`. Live-verified: `403` for a regular tenant user |
| `GET /api/llm/providers` | Only "logged in" required; returns platform-wide provider quota/priority/failure-count config | **Confirmed intentional, not changed** — its sole caller (`llm-settings-view.tsx`) is shown to every tenant, not gated in the sidebar, and no secret is ever included (`hasApiKey` is a boolean, never the key). POST/DELETE on the same route are already correctly superadmin-gated; only the read side is deliberately shared, since AI infrastructure is a platform-wide shared resource and tenants reasonably see its status |
| `GET /api/llm/audit` | Same "logged in only" gate; `LlmAuditEvent` has no `tenantId` field at all (provider rate-limit/quota is inherently a shared, not per-tenant, resource) | **Confirmed intentional, not changed** — same sole caller, same page, same reasoning as `llm/providers` above |

The `llm/providers`/`llm/audit` pair is flagged explicitly rather than silently left alone, because a first pass at this audit *did* lock both down to platform-staff-only before checking their frontend callers — and would have broken `llm-settings-view.tsx` for every regular tenant user. Reverted after confirming the actual intended design, not shipped as a regression.

## 7. Export (CSV / PDF)

No export capability of any kind existed anywhere in the app before this phase — confirmed via a dependency scan (no `xlsx`/`csv`/`pdfkit`/`jspdf` package installed).

- **`src/lib/export/csv.ts`** — dependency-free (CSV is just delimited text), UTF-8 BOM-prefixed so Excel opens non-Latin text (Persian/Arabic report data) correctly instead of mangling it. Wired into `GET /api/leads/export` (capped at 5,000 rows — see §8) and `GET /api/reports?format=csv`.
- **`src/lib/export/pdf.ts`** — added `pdfkit` (a real new dependency; deliberately *not* reused Playwright, which is only a devDependency for E2E tests, Phase 09, and not reliably present at runtime). Generates a titled table report — scoped to what this app's reports actually need, not general HTML-to-PDF rendering. Wired into `GET /api/reports?format=pdf`.
- **Excel (.xlsx)**: not added. The CSV output already opens natively in Excel; true `.xlsx` (native styling, formulas, multi-sheet) would need another new dependency (`exceljs`) for a narrower incremental benefit than CSV or PDF — deferred, low priority, until there's a concrete ask for it.
- Both exports are live-verified: `GET /api/leads/export` returns a correctly-formatted CSV; `GET /api/reports?format=pdf` returns a valid PDF (`%PDF-` magic bytes confirmed).
- **Not rolled out further**: only leads (list export) and the financial report (report export) got export endpoints this phase, as the representative pattern — matching this project's established "fix/build the highest-value example, document the rest as a rollout" discipline (same as Phase 08's CRUD-factory hooks, Phase 09's `api-client.ts`). Any other list/report can reuse `toCsv()`/`buildPdfReport()` directly.

## 8. Preventing heavy/unbounded queries

Audited every `findMany()` call in `src/app/api/**` for a `take` limit anywhere in its call site. **7 bespoke routes had none at all** (previously unbounded, could return every matching row regardless of table size): `distributors/finance`, `investors/match`, `marketplace/products`, `reseller/opportunities`, `support-plans/subscriptions`, `distributors/contracts`, `distributors/territories`. **Fixed** — each capped at 200-500 rows (500 for `distributors/finance`'s per-distributor financial history, since that's naturally larger; 200 elsewhere, matching the CRUD factory's own default), with `orderBy` added where missing so the cap doesn't return an arbitrary subset.

**One case deliberately left unbounded, with reasoning**: `finance/reports/route.ts`'s manual-report POST (`revenue_summary`/`commission_summary`/etc.) loads all matching rows into memory to sum them in JS. Capping this with `take: N` would silently **truncate the aggregation and produce an incorrect financial total** for any period with more than N matching rows — a worse outcome than a slow query for a financial report. The correct fix is rewriting these sums with Prisma's `aggregate()`/`groupBy()` (computed in the database, no truncation risk), not a `take` cap — flagged as deferred (§9), not falsely "fixed" with a change that would have introduced a real correctness bug. This endpoint is superadmin-only and manually triggered (not automatic/frequent), which is why it wasn't escalated further this phase.

`leads/export`'s CSV export is separately capped at 5,000 rows (higher than the 200-item UI page size, appropriate for a bulk-export use case) with an `X-Export-Truncated: true` response header when the cap is hit, so a caller can tell the export wasn't complete.

## 9. Deferred (prioritized, not fixed this phase)

1. **Medium** — `finance/reports/route.ts`'s manual-report aggregations should be rewritten with `db.aggregate()`/`groupBy()` instead of loading all matching rows into memory — correctness risk on a very wide date range, not just a performance one (§8).
2. **Medium** — Full-text search (real FTS5) — blocked on `adr/0006` (real migrations) landing first.
3. **Low-Medium** — A "Custom" report builder — the CRUD factory's `filterableFields`/`sortableFields` (Phase 08) is the foundation; no dedicated UI/endpoint built this phase.
4. **Low** — Excel (.xlsx) export — CSV already covers the "open in Excel" case; true `.xlsx` deferred until there's a concrete need for native styling/multi-sheet.
5. **Low** — Rolling CSV/PDF export out to more list/report endpoints beyond the two representative ones built this phase.
6. **Low** — `finance/reports.ts` vs `reports/route.ts` duplication (`BACKEND-ARCHITECTURE.md` §2's original deferred item) — still a product decision on which is canonical, not resolved by this phase's permission fixes (both are now independently safe regardless of which wins).

## Verified

`bun run typecheck` / `bun run lint` / `next build` clean. `bun test`: 61/61 pass (56 pre-existing + 5 new CSV tests). Live-verified against the dev server: `/api/queue` returns `403` for a non-superadmin; `/api/reports?audience=admin` from a regular tenant returns `audience: "affiliate"` in its own response, not admin data; `/api/leads?q=dining` finds a lead via its description field, not just its name; `/api/leads?page=1&limit=1` returns exactly 1 row with correct `pagination` metadata; `/api/leads/export` and `/api/reports?format=pdf` both download correctly-formatted files.

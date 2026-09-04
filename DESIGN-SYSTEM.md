# DESIGN-SYSTEM.md — Expload Marketing SaaS

Generated 2026-09-05, Phase 07 (UI System). Full audit of the existing design token system, a consistency audit across all ~65 dashboard views, and the fixes applied this pass. The project already has a genuinely mature Tailwind v4 CSS-first token system (`src/app/globals.css`) — this document makes it the documented single source of truth, closes the highest-value gaps found, and catalogues the rest as prioritized, deferred work rather than attempting a blind mechanical rewrite of 60+ files in one pass.

## How to read this document

Each of the 16 requested areas gets its own section: **current state** (what exists, verified against real code) → **findings** (duplication/inconsistency/bugs, evidence-cited) → **status** (Fixed this pass / Documented, deferred). A **Consistency Audit** summary closes the document with the full prioritized fix list and its implementation status.

---

## 1. Color

**Current state**: `src/app/globals.css`'s `@theme inline` block + `:root`/`.dark` blocks define the complete semantic palette — `--background`, `--foreground`, `--card`, `--popover`, `--primary` (`#FF6A00`, neon orange), `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-1` through `--chart-5`, `--sidebar*` (8 keys), plus named brand tokens `--color-brand-primary/accent/light/bg/muted/dark` and utility classes `.text-brand-*`/`.bg-brand-*`/`.bg-brand-gradient`/`.bg-brand-accent-gradient`. Both light and dark values are defined for every token. `tailwind.config.ts`'s `theme.extend.colors` (wrapping every token in `hsl(var(--x))`) is **dead code** — confirmed live in a running browser that `bg-primary` resolves via `@theme inline`'s raw-hex definition (`rgb(255, 106, 0)`), not the config file's `hsl()`-wrapped version (which would be invalid CSS, since these tokens are hex strings, not HSL triples — Tailwind v4's CSS-first `@theme` is the actual source of truth, and no `@config` directive anywhere loads the old file). **[Fixed: `tailwind.config.ts` removed.]**

**Findings — the real gap is adoption, not definition**:
- **136+ raw hex color literals** in `className` arbitrary values (`bg-[#FF6A00]`, `text-[#0A0A0B]`, `border-[#C9CDD3]`, etc.) across ~40 files, almost all exact duplicates of existing tokens.
- **79 inline `style={{ color: '#...' }}`** usages across 45 files, same redundancy.
- **45 separate hardcoded `Record<string,string>` status/type color-map constants** scattered across dashboard views (`STATUS_COLORS`, `SEVERITY_COLORS`, `RISK_COLORS`, `CATEGORY_COLORS`, `PRIORITY_COLORS`, `TIER_COLORS`, `PLAN_COLORS`, `PHASE_COLORS`, `SOURCE_COLORS`, and 9 more one-off names) — this is the clearest duplication pattern found in the whole audit. Proof of exact duplication: `RISK_COLORS` is byte-for-byte identical in `src/components/dashboard/ecommerce-view.tsx:34` and `src/components/dashboard/reseller-view.tsx:25`. Proof of *semantic drift* (worse than duplication — actual inconsistency): the same label means different colors in different files — `SEVERITY_COLORS.info` is `#0A0A0B` in `finance-view.tsx`/`super-admin-view.tsx` but `#3b82f6` in `notification-center-view.tsx`/`seo-view.tsx`; "pending/draft" gray is `#64748b` in 5 files but `#6b7280` in another; "critical" red is `#dc2626` in some files, `#ef4444` in most others, neither matching the actual `--destructive: #DC2626` token.
- **7 hand-rolled gradients duplicate the existing `.bg-brand-gradient`/`.bg-brand-accent-gradient` utility classes** verbatim (e.g. `bg-gradient-to-br from-[#0A0A0B] to-[#1F1F23]` in 4 files instead of `.bg-brand-gradient`).
- **Charts never reference `--chart-1..5`** — every `recharts`-using file (5 files) hardcodes its own unrelated hex palette (see §14).

**Status**:
- **[Fixed]** `src/lib/design/status-colors.ts` created — canonical `STATUS_COLORS`, `SEVERITY_COLORS`, `RISK_COLORS` derived from the actual CSS tokens (not new arbitrary hexes), exported for reuse.
- **[Fixed, proof-of-concept]** `ecommerce-view.tsx` and `reseller-view.tsx`'s duplicate `RISK_COLORS` now import from the shared module.
- **[Fixed]** `.text-brand-accent` (light mode) changed from raw `#FF6A00` (fails WCAG contrast as text, see §17) to `#C2410C` — reuses the already-contrast-checked `--accent-foreground` value, verified ≈5.4:1 against white/`#FAFAFA` (passes AA). Dark mode now explicitly uses `#FF8A3D` (was implicitly the same `#FF6A00` in both modes before — verified ≈7.1:1, passes).
- **[Deferred, P2]** Full replacement of the remaining 130+ raw hex literals, 45−2 remaining color maps, and 7−0 remaining duplicate gradients — mechanical, low-risk-per-edit, but a 130+-file-touching change; better suited to a dedicated cleanup pass (or a codemod/lint rule, see §18) than folding into a broader phase.

## 2. Typography

**Current state**: `--font-sans: var(--font-vazirmatn), var(--font-geist-sans), system-ui, sans-serif` — Vazirmatn (a Persian-first typeface with full Latin support) is the primary font, correct for a 29-language RTL-heavy app. `--font-mono` for code/monospace contexts. No explicit named type scale beyond Tailwind's defaults (`text-xs` through `text-4xl`).

**Findings**: **`text-[10px]` appears 211 times across 56 of the 65 dashboard files**, plus `text-[9px]` (70×, 22 files) and `text-[11px]` (40×, 22 files) — a de facto "micro" type tier that was never named as a token, with three adjacent ad hoc sizes doing the same conceptual job (badges, hints, table meta text) inconsistently per file.

**Status**:
- **[Fixed]** Added `text-2xs` (10px/14px line-height) as a real named utility in `globals.css`'s `@theme inline` block — Tailwind's smallest built-in step is `text-xs` (12px); this fills the gap the codebase was already reaching for 211 times via arbitrary values.
- **[Deferred, P2]** Mechanically replacing the 211+70+40 = 321 existing arbitrary-value usages with `text-2xs` (consolidating `9px`/`11px` into the one new `10px` step, a ~1px visual delta unlikely to be noticeable) — same reasoning as §1, large mechanical diff better suited to a dedicated pass.

## 3. Spacing

**Current state**: Standard Tailwind spacing scale (4px increments), used consistently — the hardcoded-style audit found **zero arbitrary `p-[`/`m-[`/`gap-[` abuse** beyond one stray instance, confirming spacing itself is disciplined (unlike color/typography). `--radius: 0.75rem` with `--radius-sm/md/lg/xl` derived via `calc()`.

**Findings**: None beyond typography's `text-[Npx]` overlap (already covered in §2). Spacing is the one area the audit found genuinely clean.

**Status**: No action needed.

## 4. Grid

**Current state**: Tailwind's `grid`/`grid-cols-N` utilities, always combined with a responsive prefix for the 1-column→N-column transition (see §7 Breakpoints).

**Findings**: No dedicated grid-token system exists (e.g. a named "dashboard grid" component) — every view defines its own `grid grid-cols-1 md:grid-cols-N` inline. This is consistent *usage* (see §7), just not abstracted into a shared layout primitive.

**Status**: No action needed — the pattern is already consistent; introducing a wrapper component for a 2-word Tailwind class pair would be over-abstraction, not simplification.

## 5. Breakpoints

**Current state**: Standard Tailwind breakpoints (`sm`/`md`/`lg`/`xl`/`2xl`).

**Findings**: `md:` is the de facto, near-universal standard for the 1-column→N-column grid transition across dashboard views (194 occurrences) — genuinely consistent, confirmed via **zero** instances of `sm:grid-cols` anywhere in the dashboard directory. `sm:` (14 occurrences) is isolated entirely to `landing-page.tsx` (a marketing page, not an authenticated view) for `flex-col sm:flex-row` button/footer rows — not a competing convention, a different context. `lg:` (50 occurrences) is layered on top of `md:` as a third progressive-disclosure step (e.g. `hidden md:table-cell` → `hidden lg:table-cell` for hiding table columns on progressively narrower viewports) — a deliberate pattern, not drift. `xl:` is essentially unused (1 occurrence).

**Status**: No action needed — this is the cleanest, most consistent category in the entire audit. Documented here as the **canonical convention going forward**: use `md:` for the primary mobile→desktop layout shift; layer `lg:`/`xl:` only for progressive column-hiding on data-dense tables, never as an alternative to `md:` for the same decision.

## 6. Components

**Current state**: shadcn/ui (Radix UI primitives) — `Button`, `Card`, `Dialog`, `AlertDialog`, `Table`, `Tabs`, `Select`, `DropdownMenu`, `Skeleton`, `Badge`, `Input`, `Label`, `Textarea`, `Sheet`, and more, all in `src/components/ui/*.tsx`.

**Findings**:
- **`ui/table.tsx` exists as a complete, correct primitive (including automatic `overflow-x-auto` wrapping) but is imported by zero files.** 5 dashboard views hand-roll `<table>`/`<thead>`/`<tbody>` markup instead (`backlinks-view.tsx`, `crm-view.tsx`, `dashboard-view.tsx`, `ecommerce-view.tsx`, `leads-view.tsx`) — 4 of the 5 happen to have copy-pasted identical header styling (`text-right text-xs text-muted-foreground border-b`), so the *visual* result is mostly consistent by accident, but the horizontal-scroll-wrapping correctness (`overflow-x-auto scroll-thin`) had to be manually re-derived and repeated 5 times instead of inherited for free from the shared component. A larger set of other "tabular" views skip `<table>` semantics entirely and render `.map()`'d `<div>` rows with no header row (`campaigns-view.tsx`, `tenants-view.tsx`, `team-view.tsx`, `finance-view.tsx`, and others) — conceptually similar list data rendered with structurally different markup depending on the file.
- **`Card` is used near-universally (63/65 files)** for top-level panels — genuinely consistent. One layer down, list items *inside* a Card hand-roll `rounded-lg border p-3` divs (reasonable, avoids nested-Card DOM bloat) but with padding/radius drift: a `rounded-lg`/`p-3` majority vs. a `rounded`/`p-2` minority in 5 files (`financial-reports-view.tsx`, `negotiation-view.tsx`, `project-intake-view.tsx`, `sandbox-demo-view.tsx`, `payment-gateways-view.tsx`).
- **`Dialog` used correctly in 29 files; `Sheet` used in exactly 1 file (`leads-view.tsx`) for the identical conceptual job** (view/edit a record) that every other file does with `Dialog` — a direct pattern split for the same purpose.
- **`AlertDialog` is used by zero files.** 100% of destructive-action confirmation goes through the bare browser `confirm()` (18 call sites across 15 files, including the 14 added in Phase 06). This is a real, confirmed gap — the correct shared primitive exists and is never used.
- **`Tabs` is the best-behaved shared component**: 25 files use it, 100% via the identical `<TabsList className="grid w-full grid-cols-N">` convention, and **zero files** apply a custom `className` to `TabsTrigger` — fully inherited default styling everywhere, no drift at all.

**Status**:
- **[Documented as canonical pattern, not force-migrated this pass]** `ui/table.tsx` should be the standard for any new tabular view; `Dialog` (not `Sheet`) is the standard for record view/edit; `AlertDialog` (not `confirm()`) is the standard for destructive-action confirmation going forward. Retrofitting the 5 hand-rolled tables, 1 `Sheet` outlier, and 18 `confirm()` call sites is real, contained, mechanical work — **[Deferred, P2]**, since none of these are actively broken (they all work correctly today), just inconsistent with the shared primitives that already exist.
- **[Fixed]** New `src/components/dashboard/empty-state.tsx` shared component (see §8 States) — this one genuinely didn't exist before, unlike Table/Dialog/AlertDialog which existed but weren't adopted.

## 7. States (loading / empty / error)

**Current state**: `Skeleton` (`ui/skeleton.tsx`) is imported by 52/65 files — the dominant loading-state primitive.

**Findings**:
- **No shared loading-skeleton composite exists** — every file invents its own ad-hoc dimensions/counts (`h-12`, `h-16`, `h-20`, `h-24`, `h-32`, `h-40` all appear as one-off choices with no shared "3-row table skeleton" or "stat-card skeleton" component), and one file (`tenants-view.tsx`) imports no `Skeleton` at all. Everyone uses the *primitive*, nobody shares a *pattern*.
- **No shared `EmptyState` component existed** (the one `EmptyState` function in the repo, `src/app/page.tsx:390`, is page-local and not exported/reused). At least 4 distinct hand-written flavors coexist: (1) bare centered paragraph, no icon, inconsistent `py-4`/`py-8`; (2) `Card` + icon + message with `p-12`; (3) `Card`, no icon, `p-8`; (4) unstyled raw `<div>` text with no centering/color at all (`ai-decisions-view.tsx`). Copy tone also drifts ("No X yet." vs. "No X yet. Click Y to create your first Z." vs. bare "No X.").
- **Query-level error state: confirmed 0% coverage.** Not one of the 62 dashboard views checks `isError` on its primary data-fetch query (already the headline finding of Phase 06's `USER-JOURNEYS.md` — restated here since it's equally a design-system gap, not just a UX one). A failed initial load is indistinguishable from "you have zero items."

**Status**:
- **[Fixed]** New `src/components/dashboard/empty-state.tsx` — a single `<EmptyState icon={...} message="..." action={...} />` component matching the audit's identified majority pattern (Card + icon + message + optional CTA button, `p-12`). This is genuinely new shared infrastructure, not a re-documentation of something that already existed.
- **[Deferred, P2]** Retrofitting all ~20+ hand-written empty-state blocks to use the new shared component, and building a shared loading-skeleton composite — both are real, contained, mechanical follow-ups.
- **[Deferred, P1 — tracked, not newly discovered]** The systemic 0%-error-state gap remains the single highest-leverage UX/design-system item overall; already flagged as the top follow-up in `USER-JOURNEYS.md` and `docs/PROJECT-CONTROL.md`, not re-solved here since it needs a shared `<QueryErrorState>` pattern adopted across all 62 views — real design-system work, appropriately sized for its own pass.

## 8. Icons

**Current state**: `lucide-react` exclusively (confirmed via `package.json`, no other icon library found anywhere).

**Findings**: This is the **most consistent category in the entire audit**. Delete actions use `Trash2` universally (14+ files, zero variants like `Trash`/`XCircle` found). Add/create actions use `Plus` universally (26 files, zero variants). Refresh uses `RefreshCw` universally (4 files). Close/dismiss uses bare `X` universally (10 files). Edit is used in only 2 files, but both consistently use `Settings2` — technically consistent between the two, though a gear/settings icon for "edit a record" is a semantically unusual choice (most design systems reserve gear icons for configuration, not content editing) worth reconsidering if a third "edit" affordance is ever added. Icon *sizing* has a rough but real convention (`h-4 w-4` standard inline/button icon — 299 occurrences, the clear majority; `h-5 w-5` for section headers; `h-8` through `h-16` square for avatar/icon-tile containers) but the "small badge icon" tier (`h-3 w-3` vs `h-3.5 w-3.5` vs `h-2.5 w-2.5`) is used interchangeably even within single files for what looks like the same purpose.

**Status**:
- **[Documented as canonical convention]**: `h-4 w-4` for standard inline icons, `h-3.5 w-3.5` for small/badge icons (recommend standardizing on this one size, dropping `h-3`/`h-2.5` as one-offs going forward), `h-5 w-5` for section-header icons, `Trash2`/`Plus`/`RefreshCw`/`X` as the fixed vocabulary for their respective actions. **[Deferred, P3]** — normalizing the small-icon-size tier across existing files is cosmetic, very low priority.

## 9. Forms

**Current state**: `Label` (`ui/label.tsx`) imported by 46/65 files; a react-hook-form-integrated `FormLabel` (`ui/form.tsx`) exists and correctly auto-wires `htmlFor`/`id` via `useFormField` — but no dashboard view actually uses react-hook-form (all are plain `useState` forms), so this correct mechanism is unused where it matters.

**Findings**:
- **`htmlFor`/`id` association exists in only 3 files in the entire `src` tree** (`auth-modal.tsx`, `onboarding-wizard-view.tsx`, `ui/form.tsx`). Everywhere else, `<Label>` is a plain visual sibling of its `<Input>` with no programmatic association — a real accessibility gap (clicking label text doesn't focus the input; screen readers get no field name). Confirmed the gap is *inconsistency*, not unfamiliarity: `auth-modal.tsx`'s own login tab does this correctly (`htmlFor="login-email"` / `id="login-email"`) while its signup tab in the *same file* reverts to the unassociated pattern.
- **Zero inline field-validation-error UI anywhere** — confirmed absent, not merely unsampled. All required-field validation is `toast.error('X is required')` fired from the submit handler; no per-field red border or inline "this field is required" text exists in any dashboard view.
- **Field label font-size drift**: `leads-view.tsx`'s edit form sizes every `Label` at `text-xs`, while `crm-view.tsx`/`campaigns-view.tsx`/`tenants-view.tsx` use the default (unsized) `Label` for the same conceptual "form field label."
- 4 files bypass the shared `Label` component entirely with a raw `<label>` (`financial-reports-view.tsx`, `onboarding-wizard-view.tsx`, `payment-gateways-view.tsx`, `reseller-view.tsx`).

**Status**:
- **[Deferred, P1 — real accessibility gap, large surface]** `htmlFor`/`id` association across the ~46 files using `Label` is genuinely important (it's an accessibility bug, not just cosmetic drift) but touches dozens of forms; sized appropriately for its own dedicated pass with real per-form verification, not a blind find-replace.
- **[Documented as canonical convention]**: unsized (default) `Label` for primary form fields — `leads-view.tsx`'s `text-xs` sizing is the outlier to fix if that file is touched again.

## 10. Tables

Covered in depth under §6 Components. **Status**: `overflow-x-auto scroll-thin` wrapping is consistently present on all 5 hand-rolled tables (a genuine positive finding — no horizontal-scroll breakage on narrow viewports today), but had to be manually re-derived 5 times instead of inherited from the unused `ui/table.tsx`. See §6 for the adoption recommendation.

## 11. Cards

Covered in depth under §6 Components.

## 12. Dialogs

Covered in depth under §6 Components. **Canonical pattern going forward**: `Dialog` for create/edit forms, `AlertDialog` for destructive-action confirmation. Neither `Sheet` nor bare `confirm()` should be used for new features matching these two jobs.

## 13. Navigation

Already covered in depth by Phase 06's `SITEMAP.md` (sitemap/screen map/IA) and `USER-JOURNEYS.md`. This phase's incremental finding: in-view tab navigation (`Tabs`, 25 files) is the single most consistent shared-component category found anywhere in the codebase — see §6.

## 14. Notifications

**Current state**: `sonner` (`toast.*`) used in 57/65 files.

**Findings**: **171 `useMutation(` calls exist across dashboard views, but only 61 have an `onError` handler** — roughly two-thirds of all mutations have no failure-path user feedback at all. The global `QueryClient` (`src/components/providers.tsx`) only configures `defaultOptions.queries` (staleTime/retry) — there is no `defaultOptions.mutations.onError` fallback, so any mutation lacking its own explicit `onError` fails completely silently: the button click does nothing visible if the underlying request throws. Concrete example: `crm-view.tsx`'s `createMutation`/`deleteMutation` both have a `toast.success` in `onSuccess` but no `onError` — a failed create or delete produces zero user-facing signal. The success-path pattern (`toast.success` + `queryClient.invalidateQueries` + form reset) is itself consistent everywhere it exists — the gap is entirely on the failure path.

**Status**:
- **[Fixed]** Added `defaultOptions.mutations.onError` to the shared `QueryClient` in `src/components/providers.tsx` — a single, small, high-leverage fix that gives **all 171 mutations** a generic "Something went wrong. Please try again." toast fallback whenever they don't define their own `onError`, without touching any of the 65 individual view files. Mutations with an existing specific `onError` are unaffected (React Query calls the mutation-level handler, not the global default, when one is defined).

## 15. Charts

**Current state**: `recharts` used in 5 dashboard files. `--chart-1` through `--chart-5` tokens are defined in both light and dark mode (`#0A0A0B`/`#FF6A00`/`#9AA0A8`/`#52525B`/`#FFAD66` in light).

**Findings**: **Zero chart-using files reference the `--chart-*` tokens.** Every file hardcodes its own unrelated hex palette — `dashboard-view.tsx`'s `STATUS_COLORS` (green/blue/purple/green/red, no overlap with chart tokens), `unified-dashboard-view.tsx`'s 10-entry ad hoc palette, `analytics-view.tsx`'s single unrelated violet, `attribution-view.tsx`'s `STAGE_COLORS` array mixing 3 real brand hexes with 5 unrelated ones. Where the *correct* brand color does appear (`platform-promotion-view.tsx`, `finance-view.tsx`), it's a copy-pasted literal (`text-[#FF6A00]`), never a token reference.

**Status**: **[Deferred, P2]** — consolidating 5 files' chart palettes onto the `--chart-*` tokens (or a documented, deliberate exception where a status color legitimately needs to differ from the categorical chart palette, e.g. red for "lost"/"failed" which chart-1..5 doesn't include) needs a short design decision per file, not a blind swap; sized for a small dedicated follow-up.

## 16. Responsive Rules

Covered in depth under §5 Breakpoints — the cleanest category in the audit, no changes needed.

---

## Dark Mode

**Confirmed working correctly, live-verified**: toggling the `.dark` class resolves `--background` to `#0A0A0B` and every other token to its dark-mode value as expected (checked via `getComputedStyle` in a running browser). The theme toggle itself (`src/components/dashboard/header.tsx`) is wired correctly with a proper `aria-label`.

**Findings**: The codebase does **not** use raw neutral-gray Tailwind utilities (`text-gray-*`/`bg-slate-*`/`border-zinc-*`) anywhere in `src/components/dashboard` — confirmed zero matches — it consistently uses the semantic tokens (`text-foreground`, `bg-card`, `border-border`) for neutrals, which is genuinely good practice. The real gap: **198 raw semantic-color Tailwind utilities** (`text-emerald-600`, `text-red-500`, `text-blue-600`, etc., used for status/metric text and icons) across 59 files, against only **14 total `dark:`-prefixed color variants** anywhere in the dashboard directory. These mid-tone 500/600 shades generally remain legible against the near-black `#0A0A0B` dark background (this is not a black-on-black catastrophe), but they're unverified for dark-mode contrast and several sit at a borderline visual weight.

**Status**: **[Deferred, P2]** — auditing and adding `dark:` variants (or replacing with theme-token-based semantic colors, which is the more correct long-term fix) across 59 files is real, contained work; not attempted this pass given the risk profile is "somewhat dim, not illegible."

## RTL / LTR

**Findings — this is where the audit found the most consequential, genuinely-a-bug-not-just-drift issues**:

- **`src/components/dashboard/sidebar.tsx`'s nav-item label was hardcoded `text-right` unconditionally** (`sidebar.tsx`, inside the nav item button), regardless of the active locale's direction. This looked "correct" only by coincidence for RTL locales — every one of the 24 LTR locales (the `en` default included) got right-aligned nav text sitting oddly against a left-side icon. **[Fixed]** — changed to the logical `text-start` utility, which resolves to left for LTR and right for RTL automatically based on `dir`.
- **`src/components/auth/auth-modal.tsx`'s form-field leading icons were hardcoded to the right side** (`absolute right-3`, input `pr-9`) across all 7 icon+input pairs (email/password/name/org/domain across login and signup tabs), regardless of locale direction — the reverse of standard LTR form UX for the `en`-default majority of users, "correct" only for RTL by accident of the original RTL-first authoring. **[Fixed]**, with a deliberate split: the 5 fields that force `dir="ltr"` on their `<Input>` (email ×2, password ×2, domain — content that's inherently LTR regardless of UI language) now use *physical* `left-3`/`pl-9`, since their text content's direction is fixed and the icon should stay pinned to its actual start (left) rather than following the ambient page direction; the 2 fields with no forced direction (name, organization name — content that can itself be Persian/Arabic) now use *logical* `start-3`/`ps-9`, which correctly follows whichever direction is active.
- **Directional icons don't flip for RTL anywhere except one file.** `src/components/ui/calendar.tsx` correctly uses Tailwind's `rtl:` variant to flip its prev/next chevrons (`rtl:**:[.rdp-button_next>svg]:rotate-180`) — proving the team knows how to do this. Everywhere else — 40 files using `ChevronLeft`/`ChevronRight`/`ArrowLeft`/`ArrowRight` for pagination, back-links, and carousel controls — there is no direction-aware icon flipping. **[Deferred, P2]** — real, but each of the 40 files needs a judgment call on whether its specific icon usage is actually directional (a "back" cue that should flip) vs. incidental (like sidebar's expand/collapse chevron, which rotates based on state, not direction, and is correctly RTL-safe as-is) — not a blind sweep.
- **Spacing utilities are 100% physical (`ml-`/`mr-`/`pl-`/`pr-`), 0% logical (`ms-`/`me-`/`ps-`/`pe-`)** — confirmed via exact count (113 physical occurrences across `src/components`, versus zero real logical-property usage; an initial "0 logical" grep hit was a false positive matching inside `items-start`). Physical utilities do not auto-flip under `dir="rtl"`, meaning every one of those 113 instances is a place where spacing sits on the wrong side for RTL locales. **[Deferred, P2]** — the two fixes applied this pass (sidebar, auth-modal) are the highest-traffic, most-visible instances; the remaining 113 need the same file-by-file treatment, real but large-surface work.
- `html[dir='rtl'] body { font-feature-settings: ... }` (typography only) plus `document.documentElement.dir` set centrally in `src/i18n/provider.tsx` are confirmed correct and sufficient for the *automatic* block/inline mirroring the browser provides for free — the gaps above are specifically the places the app opted into *physical* positioning that the browser's automatic mirroring cannot fix on its own.

## Accessibility

**Findings**:
- **Icon-only buttons**: of ~20 sampled across 10 files, only 4 have an `aria-label`, ~2 have a `title` (an acceptable fallback), and **~16+ have neither** — a screen reader announces these as bare "button" with no indication of what they do. This pattern (delete/edit/copy/terminate icon buttons with no accessible name) repeats near-identically across essentially every dashboard view with a data table or list. **[Fixed, representative subset]** — added `aria-label` to the icon-only buttons in the 7 files already touched during Phase 06's destructive-action-confirmation work (`team-view.tsx`, `webhooks-view.tsx`, `approvals-view.tsx`, `internal-portal-view.tsx`, `promo-link-view.tsx`, `attribution-view.tsx`, `crm-view.tsx`) — natural overlap with files already under active edit, ~18 buttons fixed. **[Deferred, P1]** — the remaining icon-only buttons across the other ~55 files, same fix pattern, large surface.
- **Color contrast**: `.text-brand-accent`/raw `#FF6A00` used as small/normal body text on a light background genuinely **fails WCAG AA** (≈2.87:1, below the 4.5:1 threshold for normal text and even the 3:1 floor for large text) — not a borderline/theoretical finding. **[Fixed]** — see §1, the token itself was corrected to a verified-passing shade (≈5.4:1).
- **Keyboard navigation**: `Dialog`/`DropdownMenu`/`Select`/`Tabs` are all genuinely Radix-backed (confirmed via import lines), which means focus-trap/Escape/roving-tabindex work correctly for free — not a concern. **Zero instances of the `<div onClick>` anti-pattern** exist anywhere in `src/components/dashboard` or `src/components` (a genuinely clean result, confirmed by exact grep). One real gap: `src/components/dashboard/project-intake-view.tsx`'s "Payment modal" is a plain conditionally-rendered `<Card>` with a fixed backdrop, not a real `Dialog` — no focus trap, no Escape-to-close, no `role="dialog"`. **[Deferred, P1]** — converting it to a real `Dialog` is a contained, real fix; not attempted this pass to avoid touching payment-flow UI without dedicated testing time.

## Consistency Audit — summary and prioritized fix list

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `tailwind.config.ts` dead/conflicting with the real `@theme inline` token source | Medium (confusion risk) | **Fixed** — removed |
| 2 | Sidebar nav text hardcoded `text-right` regardless of locale direction (bug for 24/29 LTR locales) | High (real bug) | **Fixed** |
| 3 | Auth modal form icons hardcoded to the right side regardless of direction | High (real bug, default-locale-affecting) | **Fixed** |
| 4 | `.text-brand-accent` text genuinely fails WCAG AA contrast | High (real a11y bug) | **Fixed** |
| 5 | 171 mutations, only 61 with `onError` — silent failures | High (real bug, systemic) | **Fixed** via one shared `QueryClient` default |
| 6 | No shared `EmptyState` component (4 hand-written flavors) | Medium | **Fixed** — new component created |
| 7 | `text-2xs` token missing despite 311 arbitrary-value uses | Medium | **Fixed** — token added |
| 8 | 45 scattered status-color-map constants, semantic drift between files | Medium-High (real inconsistency) | **Fixed, proof-of-concept** (`status-colors.ts` + 2 files migrated); **Deferred, P2** for the remaining 43 |
| 9 | Icon-only buttons missing `aria-label` | High (real a11y bug) | **Fixed, representative subset** (~18 buttons/7 files); **Deferred, P1** for the rest |
| 10 | `htmlFor`/`id` label association almost never present | High (real a11y bug, large surface) | **Deferred, P1** |
| 11 | Custom payment modal bypasses `Dialog`, no keyboard accessibility | High (real a11y bug) | **Deferred, P1** |
| 12 | `ui/table.tsx` unused, 5 hand-rolled tables + inconsistent div-list tables elsewhere | Medium | **Documented as canonical pattern; Deferred, P2** |
| 13 | `AlertDialog` unused, 100% of confirms via `window.confirm()` | Medium | **Documented as canonical pattern; Deferred, P2** |
| 14 | `Sheet` vs `Dialog` split for the same conceptual job | Low | **Documented as canonical pattern; Deferred, P3** |
| 15 | Charts never reference `--chart-*` tokens | Medium | **Deferred, P2** |
| 16 | 113 physical (non-RTL-safe) spacing utilities beyond the 2 fixed this pass | Medium (real RTL bug, large surface) | **Deferred, P2** |
| 17 | Directional icons don't flip for RTL except in 1 file | Medium | **Deferred, P2** |
| 18 | 198 raw semantic-color utilities with only 14 `dark:` variants | Low-Medium (not illegible, unverified) | **Deferred, P2** |
| 19 | 136+ raw hex literals, 79 inline-style hex colors beyond what's covered above | Low (cosmetic duplication, not a bug) | **Deferred, P2/P3** |
| 20 | Icon small-size tier (`h-3`/`h-3.5`/`h-2.5`) used interchangeably | Low (cosmetic) | **Documented as canonical convention; Deferred, P3** |

**What this phase deliberately did not attempt**: a blind, mechanical, all-at-once rewrite of every hardcoded style across 60+ files. The token *system* was already well-designed before this phase (a genuine strength worth stating plainly, not just a list of gaps) — what was missing was (a) a few real, high-value bugs (RTL layout, contrast, silent failures) now fixed, (b) 2 genuinely-new pieces of shared infrastructure (`EmptyState`, `status-colors.ts`) that didn't exist before, and (c) this document, so every future addition has one place to check for "is there already a token/pattern for this" instead of re-deriving one per file. The large mechanical-consolidation items (§1's remaining hex literals, §7's remaining empty-state retrofits, §9's remaining label associations, §16's remaining RTL spacing) are real, prioritized, and explicitly not silently dropped — each has a documented severity and defer reason above, consistent with this project's established "fix the highest-value subset now, document the rest" discipline from every prior phase.

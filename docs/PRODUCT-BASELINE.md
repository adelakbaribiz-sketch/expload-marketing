# PRODUCT-BASELINE.md

Generated 2026-09-04. Synthesizes everything recoverable from the owner, existing documentation, code, and UI (`PRD.md`, `worklog.md`, `TECHNICAL_SPECIFICATION.md`) with supplementary market research done for this pass, to answer the governing question of the "Product Discovery Retrofit" step: **has this product drifted from a coherent purpose, or does its current, very broad feature set actually make sense as one product?**

## Market research finding, stated up front

The closest real-market comparable is **GoHighLevel** — an all-in-one CRM/funnel/email/SMS/automation/AI platform built specifically for marketing agencies, whose defining feature (distinct from CRM-native tools like HubSpot or ActiveCampaign) is that **agencies white-label and resell the platform itself** as a second revenue stream, not just use it to run their own marketing. GoHighLevel's Agency Pro tier explicitly sells "resell the whole platform under your own brand" as a product feature. This is the single most useful comparison, because it directly validates this project's most unusual architectural choice: bundling a full marketing-automation suite *together with* a wholesale-distribution/white-label business model in one codebase is not scope creep — it's a recognized, commercially real category, and this project's Distributor/License/Territory/White-Label modules map cleanly onto exactly that pattern (license packages ≈ GHL's sub-account reselling; territory exclusivity and tiered distributor levels are a more formal/B2B-enterprise version of the same reseller idea GHL implements more informally).

Where this project genuinely diverges from that comparable, in ways worth naming explicitly:
- **An AI-negotiated pricing/proposal engine** (6-round automatic concession negotiation) — not a feature found in GHL, HubSpot, or ActiveCampaign. This looks like a deliberate differentiator specific to this product's own sales motion (selling *itself* to new customers via AI negotiation), not a copy of an existing pattern.
- **A virtual-assistant staffing marketplace and internal payroll system** — genuinely unusual. GHL and comparable platforms sell software; they don't also run a staffing agency or pay their own internal staff through the same product surface a customer uses. This is the one area worth a real product-scope question (see "Out of Scope" below) — not because it's badly built (the payroll formula is real and functioning, per `BUSINESS-RULES.md`), but because it's a fundamentally different kind of feature (internal operations tooling for the platform *operator*, not a marketing capability for a *customer*) bundled into the same customer-facing product surface.
- **Support-plan SLA tiers and internal HR/department structure** — also internal-operations-flavored rather than customer-marketing-flavored, same observation as above.

**Conclusion on drift**: the core marketing-automation + wholesale-reseller combination is coherent and matches a validated market category — no meaningful drift there. The AI negotiation engine is a deliberate, reasonable differentiator. The payroll/HR/internal-portal cluster is the one area that reads as a different product bolted onto this one (internal company-operations software, not marketing SaaS) — not wrong to have, since a business running this platform genuinely needs payroll and HR somewhere, but worth the product owner explicitly deciding whether it belongs in the *same* customer-facing dashboard shell (currently, it's reachable from the same sidebar as marketing features, gated only by internal-employee role) or should be a separate internal tool. This audit surfaces the question; it isn't this audit's place to answer it unilaterally.

---

## 1. Product purpose

A multi-tenant B2B SaaS platform that runs a customer's marketing operation end-to-end (lead generation through retention), while simultaneously functioning as a wholesale/reseller business platform for selling the software itself to other agencies/distributors — plus an internal operations layer (payroll, HR, support SLAs) for the company operating the platform.

## 2. Target users

See `PRD.md` §2 for the full recovered persona table. Summary: **Tenant Owner/team** (the direct marketing-SaaS customer), **Distributor** (buys and resells the platform wholesale), **SuperAdmin/Internal Employee** (the platform operator's own staff), **Support-plan customer** and **Virtual-assistant client** (paid add-on service consumers), **Anonymous visitor** (top-of-funnel, converts via the sandbox demo or direct signup).

## 3. Core problem being solved

For the direct customer (tenant): "running a full marketing operation requires stitching together many separate tools (lead gen, CRM, email, SEO, social, ads, analytics) — this platform is meant to be the one tool." For the distributor persona: "reselling marketing software as a business requires wholesale pricing, license management, and territory protection — this platform provides that layer natively rather than requiring a separate reseller-management system."

## 4. Value proposition

- **For tenants**: one platform instead of 10+ point tools, with AI woven throughout (enrichment, content generation, strategy advice, autonomous execution) rather than bolted on.
- **For distributors**: a real wholesale/territory/license business model, not just a reseller discount code.
- **Differentiator vs. the closest comparable (GoHighLevel)**: AI-negotiated sales proposals as a first-class feature of how the product itself is sold, and a more formal B2B distributor/territory model (vs. GHL's flatter agency-reseller model).

## 5. Core features (see `REQUIREMENTS-TRACEABILITY.md` for full status detail per feature)

Lead generation & enrichment · CRM · Email/social/ad campaign management · SEO tooling · Content planning · Attribution & fraud detection · Funnel/journey builders · AI agents, advisor, and autonomous execution · AI negotiation engine · Onboarding wizard · Project intake with AI-generated pricing · Multi-gateway payments (card + crypto) · Wholesale distribution (license packages, territories, payouts) · White-label/reseller branding · Marketplace (sell API access) · Approval workflows · Webhooks · 29-language i18n with RTL.

## 6. Main workflows

See `USE-CASES.md` for the 9 fully detailed flows (signup, team invite, lead discovery, negotiation, distributor licensing, payroll, support SLA, sandbox conversion, approval submission) — these are the product's own most complex, highest-value user journeys, already documented step-by-step there rather than repeated here.

## 7. Business rules

Fully catalogued in `BUSINESS-RULES.md` — every formula, threshold, and state machine found in the actual code (negotiation concession percentages, payroll revenue split, club tier thresholds, LLM quota/cooldown numbers, rate limits, RBAC permission lists), each tagged live-vs-dead.

## 8. Differentiators (confirmed against market research)

1. AI-negotiated sales proposals (6-round automatic concession engine) — not found in comparable platforms.
2. A more formal, B2B-distributor-grade wholesale program (tiered distributor levels, territory exclusivity with minimum sales commitments, structured payout workflow) vs. flatter agency-reseller models elsewhere.
3. A genuinely broad AI layer woven through many modules (agents, advisor, autonomous graph orchestration, semantic search) rather than a single "AI assistant" bolt-on.
4. 29-language i18n including full RTL support as a first-class concern, not an afterthought — unusual breadth for a platform this feature-dense.

## 9. Future features (recovered signals, not commitments)

Signals found but not built: real backlink/competitor/social analytics (currently fabricated data, per `KNOWN-ISSUES.md` #8 — the schema and UI already anticipate a real version); real WhatsApp/SMS sending (currently CRUD-only); a working document-parsing path for onboarding uploads (code exists, isn't wired in, per `MODULE-BOUNDARIES.md`); real card-payment processing (11 gateways currently stubbed).

## 10. Out of scope / needs a product decision

- **Whether internal HR/payroll/support-SLA/internal-portal modules belong in the same customer-facing product shell** as the marketing tooling, or should be a separate internal system — flagged above, not resolved by this audit.
- **The `Cohort` Prisma model** (`DEAD-CODE.md` §5) — no code anywhere references it; its intended purpose (retention cohorts? marketing segments? something else) needs a product decision before any implementation, not a guess.
- **Testing and CI/CD investment level** — genuinely absent today (`PROJECT-PHASE-MATRIX.md` phases 18-19); whether that's an accepted trade-off for this project's current stage or a gap to close is a product/resourcing decision, not something this audit can determine from the code alone.

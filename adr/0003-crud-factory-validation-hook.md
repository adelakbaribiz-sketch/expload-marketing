# ADR-0003: Give the CRUD factory an optional validation hook instead of special-casing it

**Status**: Proposed
**Date**: 2026-09-04

## Current

`src/lib/crud/domain-handler.ts`'s `createDomainHandlers`/`createDomainItemHandlers` power ~46 of the 76 API domains. Confirmed genuinely generic (Phase 3 audit: no `if (config.model === 'X')` branching anywhere in its 118 lines) — it validates only that submitted fields are in a name allowlist (`DomainConfig.fields`), with no type/format/enum checking, and applies `sanitizeText`/`JSON.stringify` uniformly.

## Problem

Several factory-built domains have genuine business rules with nowhere to live: Funnel/Journey creation has no validation at all (any string accepted for `stages`/`steps` JSON); the distributor-payout domain (bespoke, not factory, but the same underlying gap) accepts caller-supplied `platformShare`/`distributorShare` with no formula computing them (`BUSINESS-RULES.md` §5). As more factory domains mature, more of them will hit this same wall — and the tempting fix (special-case the factory for one model) would turn a currently clean, reused abstraction into the "god module" this audit specifically confirmed doesn't exist yet.

## Target

Extend `DomainConfig` with two optional, generic hooks that stay domain-agnostic at the factory level:

```typescript
interface DomainConfig {
  // ...existing fields...
  validate?: (body: unknown) => { valid: true; data: Record<string, any> } | { valid: false; error: string }
  beforeWrite?: (data: Record<string, any>, tenantId: string) => Record<string, any> | Promise<Record<string, any>>
}
```

`validate` runs before the field-allowlist step and can reject with a proper 400 (this is also the natural place to adopt zod per-domain, addressing `KNOWN-ISSUES.md` #10's ~96%-unvalidated-routes finding for at least the 46 factory domains in one change). `beforeWrite` runs after allowlisting, letting a domain compute a derived field or apply a business rule without the factory itself knowing what that rule is.

## Migration strategy

1. Add the two optional hooks to `DomainConfig` and wire them into `postItem`/`patchItem` — backward compatible, every existing call site keeps working unchanged since both are optional.
2. Do not retrofit all 46 domains at once. Start with the ones already known to need it: Funnel/Journey (add a zod schema for `stages`/`steps` shape), and evaluate whether the distributor-payout domain should move onto the factory with a `beforeWrite` hook computing the share formula (once that formula itself is decided — this ADR only unblocks *where* such logic could live, it doesn't design the formula, which needs a product decision per `KNOWN-ISSUES.md`).
3. Treat this as the default answer whenever a factory domain needs a rule, going forward (`DEPENDENCY-RULES.md` Rule 3) — not a one-time cleanup pass.

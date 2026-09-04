# ADR-0010: Introduce real Prisma `enum` types for fixed-value-set string fields

**Status**: Proposed
**Date**: 2026-09-04

## Current

`prisma/schema.prisma` defines **zero** `enum` types across 150 models. 226 fields carry a `// value1 | value2 | value3` comment documenting a fixed value set (`Tenant.plan`, `User.role`, `Lead.status`, `Deal.stage`, `Task.priority`, `Distributor.tier`, `NegotiationSession.currentState`, and 220 more) while being typed as plain `String`, enforced by nothing at the database or Prisma-client level.

## Problem

Nothing stops an application bug, a manual `db.studio` edit, or a future migration from writing a value outside the documented set — the comment is the only enforcement, and comments don't run. This is a real data-integrity gap, not just a style preference: a typo'd status value (`"activ"` instead of `"active"`) silently breaks every filter that queries for the correct spelling, with no error at write time.

## Target

Real Prisma `enum` types for the highest-value fields, replacing the plain-`String` + comment pattern.

## Migration strategy

1. **Pilot on 3-4 fields first, not all 226.** Start with `Tenant.plan`, `User.role`, `Lead.status` — high-traffic, well-understood, low-ambiguity value sets.
2. For each field, **before touching the schema**: run `SELECT DISTINCT <field> FROM <table>` (or the Prisma equivalent) against the real data and confirm every existing distinct value is a member of the proposed enum. A single stray legacy value (a deprecated status, a typo that was never cleaned up) will make the schema change fail outright on `db push`/`migrate` — this check is mandatory, not optional, per this project's "no important data lost in refactoring" rule.
3. Add the `enum` type, change the field's type from `String` to the enum, run `db push` (dev) or a generated migration with an explicit Postgres `USING` cast (prod, once `adr/0006` is adopted — doing this before real migrations exist means `db push` is the only available path, which is acceptable for dev/pilot but should not be how this ships to a real production database).
4. Update every TypeScript call site that currently treats the field as `string` — Prisma will regenerate the client with the literal union type, so most call sites will just get stricter type-checking for free, but any code that constructs the value dynamically (e.g. from user input) needs an explicit validation/cast step.
5. Only after the pilot fields are confirmed working (typecheck clean, no runtime enum-validation errors in the affected routes, live smoke-test of create/update on each pilot model) should the remaining ~220 fields be converted, in further small batches — never all at once.

## Rollback

Per field: revert the field's type back to `String`, drop the `enum` type declaration. No data loss either direction, since enum values in SQLite/Postgres are stored as their string representation.

## Data Migration

None required if step 2's distinct-value check passes cleanly (the existing string data already conforms to the enum's members). If it doesn't pass, the mismatched rows need a decision (correct the typo, map the deprecated value to its replacement) made explicitly with the product owner before conversion — never silently coerced.

## Validation

`SELECT DISTINCT` check before each field; `db push`/migration succeeds with no data-loss warning; `bun run typecheck` clean; a live create/update smoke-test against the newly-enum'd model.

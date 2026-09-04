# ADR-0006: Adopt Prisma migration history instead of `db push` for schema evolution

**Status**: Proposed — confirmed and expanded by the Phase 04 database audit (2026-09-04), see `DATABASE-AUDIT.md` §10 / `DATABASE-TARGET.md` DB-09. Not implemented this pass; needs its own dedicated pass with a real staging environment (DB-10, automated backups, is a prerequisite and is itself still deferred).
**Date**: 2026-09-04

## Current

No `prisma/migrations/` directory exists anywhere in the repo. Development uses `prisma db push` (schema-sync, no history). **Three**, not two, deploy-time scripts independently and inconsistently handle this: `scripts/deploy.sh` runs `prisma migrate deploy`, which has nothing to apply against a fresh database (`KNOWN-ISSUES.md` #16); `scripts/deploy-vps.sh` independently discovered this and hedges with a `db push` fallback that `deploy.sh` lacks; `scripts/migrate-prod.sh` (found in the Phase 04 audit) branches on `DATABASE_URL` itself — Postgres gets `migrate deploy`, SQLite gets `db push` — with its own independent logic, unaware of the other two scripts.

## Problem

`db push` is a dev-convenience tool, not a production schema-change mechanism: it can silently drop/recreate columns that lose data on a mismatch, has no rollback, and leaves no record of what changed and why between deployments. With 150 models, the risk of an unreviewed, unrecorded destructive schema sync in production grows every time the schema is touched. This is as much an architecture gap as a deploy-script bug — the data layer (layer 4 in `MODULE-BOUNDARIES.md`) currently has no safe evolution path.

## Target

Real Prisma migration history (`prisma/migrations/`), generated via `prisma migrate dev` in development and applied via `prisma migrate deploy` in production — matching what `scripts/deploy.sh` already assumes exists.

## Migration strategy

1. **Do this on a maintenance branch, not alongside feature work.** Run `prisma migrate dev --name init` locally against a representative copy of the current schema to generate a baseline migration capturing the current 150-model state as migration zero.
2. Verify the generated migration applies cleanly to a fresh empty database and produces an identical schema to the current `db push`-managed one (diff `prisma db pull` output before/after, or equivalent).
3. Update `README-DEPLOY.md` and `scripts/dev-setup.sh` to use `prisma migrate dev` going forward instead of `db push` for any future schema change — this is now the required workflow for anyone touching `schema.prisma`, not optional.
4. Fix `scripts/deploy.sh` to genuinely have something to apply (it already calls the right command; it just needs the migration history this ADR produces to exist).
5. Existing production/staging databases (if any exist outside this dev environment) need a one-time `prisma migrate resolve --applied <baseline>` to mark the baseline as already-applied without re-running it, so `migrate deploy` doesn't try to recreate tables that already exist. Coordinate this step carefully if a real production database is running — do not run migration commands against it without a backup first, per this project's own "no destructive operation without a safer alternative considered" standard.

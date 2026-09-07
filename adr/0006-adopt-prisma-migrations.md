# ADR-0006: Adopt Prisma migration history instead of `db push` for schema evolution

**Status**: Implemented 2026-09-07, Phase 19 (DevOps & Deployment) — see `DEVOPS-DEPLOYMENT.md` §1 and the "Implementation note" at the end of this file for one real deviation from the plan below (a second schema file, not the single-file migration this ADR originally described).
**Date**: 2026-09-04 (proposed), 2026-09-07 (implemented)

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

## Implementation note (2026-09-07)

Step 1 above implicitly assumed one schema file, migrated wholesale onto
whatever `prisma migrate dev` targets. That doesn't actually work here:
Prisma's `datasource.provider` is a static string that must match the real
migration history's own recorded provider (`migration_lock.toml`), and this
project's local dev workflow deliberately stays on SQLite (`bun run
db:push`) — 18 phases of established convention, zero reason to disrupt it.
One file can't be "SQLite in dev, PostgreSQL in prod" while also having a
real, deployable migration history.

**What was actually built**: `prisma/schema.prisma` (SQLite) stays exactly
as step 3 above did NOT want it to — `db:push`, not `migrate dev`, remains
its dev workflow, unchanged. A second file, `prisma/schema.production.prisma`
(PostgreSQL), is what the baseline migration and all future
`db:migrate`/`db:migrate:prod` commands actually target. New
`scripts/check-schema-sync.ts` (`bun run db:schemas-in-sync`, a CI gate)
byte-diffs the two files outside their `datasource` blocks, so they can't
silently drift the way a single-file plan wouldn't have needed to guard
against. Steps 2, 4, and 5 above were followed as written, against
`schema.production.prisma`.

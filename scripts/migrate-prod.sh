#!/bin/bash
# ============================================================================
# Database migration script — provider-aware wrapper.
#
# Usage:
#   DATABASE_URL=... ./scripts/migrate-prod.sh
#
# Detects the provider from DATABASE_URL and delegates to the one
# canonical command for that provider (package.json's db:migrate:prod /
# db:push) rather than re-implementing the migrate-vs-push branching a
# third time — this script, scripts/deploy.sh, and scripts/deploy-vps.sh
# used to each have their own independent (and inconsistent) version of
# this logic (adr/0006). This version also fixes a real bug the old one
# had: it always ran `bun run db:generate` (which targets schema.prisma,
# sqlite) before branching, so even the "postgresql" branch below was
# generating a sqlite-flavored Prisma Client and then running a bare
# `prisma migrate deploy` (also defaulting to schema.prisma) against a
# postgresql:// DATABASE_URL — a provider mismatch Prisma would reject
# outright. Found while implementing Phase 19's real migration history.
# ============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Database Migration ==="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is not set"
  exit 1
fi

if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
  echo "✓ Detected PostgreSQL — running real migrations (prisma/schema.production.prisma)"
  bun run db:generate:prod
  bun run db:migrate:prod
  echo "✓ Migration complete!"
  echo ""
  echo "To create a new migration after a schema change: bun run db:migrate"
elif [[ "$DATABASE_URL" == file:* ]]; then
  echo "✓ Detected SQLite (dev-only — no migration history for this provider by design)"
  bun run db:generate
  bun run db:push
  echo "✓ Schema pushed!"
else
  echo "✗ Unknown database provider in DATABASE_URL"
  exit 1
fi

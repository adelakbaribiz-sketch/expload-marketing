#!/bin/bash
# ============================================================================
# Database migration script for production.
#
# Usage:
#   ./scripts/migrate-prod.sh
#
# This script:
#   1. Detects the database provider from DATABASE_URL
#   2. If PostgreSQL, creates a migration from the current schema
#   3. Runs prisma migrate deploy
# ============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Production Database Migration ==="

# Check DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is not set"
  exit 1
fi

# Detect provider
if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
  echo "✓ Detected PostgreSQL database"
  PROVIDER="postgresql"
elif [[ "$DATABASE_URL" == file:* ]]; then
  echo "✓ Detected SQLite database"
  PROVIDER="sqlite"
else
  echo "✗ Unknown database provider in DATABASE_URL"
  exit 1
fi

# Generate Prisma client
echo "→ Generating Prisma client..."
bun run db:generate

if [ "$PROVIDER" = "postgresql" ]; then
  # For PostgreSQL, use migrate deploy (applies existing migrations)
  echo "→ Running prisma migrate deploy..."
  npx prisma migrate deploy

  echo ""
  echo "✓ Migration complete!"
  echo ""
  echo "To create a new migration after schema changes:"
  echo "  DATABASE_URL=postgresql://... npx prisma migrate dev --name your_migration_name"
else
  # For SQLite, just push the schema
  echo "→ Running prisma db push..."
  bun run db:push
  echo "✓ Schema pushed!"
fi

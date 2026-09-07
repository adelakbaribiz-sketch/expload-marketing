#!/usr/bin/env bash
# ============================================================================
# PostgreSQL restore — Phase 20 (Production Readiness). Pairs with
# scripts/backup.sh.
#
# Live-verified as a real restore-drill (DATABASE-TARGET.md DB-10's own
# acceptance criteria: "back up, then actually restore into a scratch DB
# and diff"), not just written and assumed to work — see
# PRODUCTION-READINESS.md for the exact drill and its result.
#
# Usage:
#   ./scripts/restore.sh <backup-file.sql.gz> [compose-project-name]
#
# By default restores into the SAME database the backup came from (the
# real disaster-recovery case: your production DB is gone or corrupted,
# restore it in place).
#
# For a verification drill (prove a backup is actually restorable without
# touching the live database at all), set RESTORE_TARGET_DB to a different
# name — this script creates it fresh and restores there, leaving the
# original database completely untouched. Live-verified: restoring into
# the SAME database while its own `app` container was still connected to
# it correctly failed outright ("database is being accessed by other
# users") rather than silently corrupting anything — Postgres itself
# refuses a same-name drop/recreate under an active connection, which is
# exactly why a separate RESTORE_TARGET_DB is the safer default for a
# drill, not a DROP-the-live-database flag.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_FILE="${1:-}"
COMPOSE_PROJECT="${2:-expload-marketing}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Usage: $0 <backup-file.sql.gz> [compose-project-name]${NC}"
  exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-marketing}"
POSTGRES_DB="${POSTGRES_DB:-marketing_saas}"
TARGET_DB="${RESTORE_TARGET_DB:-$POSTGRES_DB}"

if [ "$TARGET_DB" != "$POSTGRES_DB" ]; then
  echo -e "${YELLOW}RESTORE_TARGET_DB set — restoring into a separate scratch database '$TARGET_DB', not touching '$POSTGRES_DB'${NC}"
  docker compose -f docker-compose.prod.yml -p "$COMPOSE_PROJECT" exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";"
  docker compose -f docker-compose.prod.yml -p "$COMPOSE_PROJECT" exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";"
fi

echo -e "${YELLOW}Restoring ${BACKUP_FILE} → ${TARGET_DB} (project: ${COMPOSE_PROJECT})${NC}"
gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml -p "$COMPOSE_PROJECT" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1

echo -e "${GREEN}✓ Restore complete${NC}"
echo ""
echo "  Verify with:"
echo "    docker compose -f docker-compose.prod.yml -p $COMPOSE_PROJECT exec postgres \\"
echo "      psql -U $POSTGRES_USER -d $TARGET_DB -c 'SELECT count(*) FROM information_schema.tables WHERE table_schema='\\''public'\\'';'"

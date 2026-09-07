#!/usr/bin/env bash
# ============================================================================
# PostgreSQL backup — Phase 20 (Production Readiness).
#
# DATABASE-TARGET.md DB-10 flagged this as a real, missing gap ("Manual
# pg_dump/SQLite-copy documented in DEPLOY.md, nothing automated") and
# deliberately deferred it behind DB-09 (real Prisma migrations) as a
# prerequisite — adr/0006 implemented that in Phase 19, so this is no
# longer blocked. Pairs with scripts/restore.sh; see that script's own
# comment for the restore-drill this was built and live-verified against.
#
# Usage:
#   ./scripts/backup.sh [compose-project-name] [output-dir]
#
# Defaults to project name "expload-marketing" (matches a plain
# `docker compose -f docker-compose.prod.yml up` with no -p flag) and
# ./backups. Pass the project name explicitly if you deployed with
# `-p <name>` (e.g. `-p expload-staging`, per .env.staging.example).
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE_PROJECT="${1:-expload-marketing}"
OUTPUT_DIR="${2:-backups}"
mkdir -p "$OUTPUT_DIR"

# docker compose -p <name> names containers <name>_<service>_1 or (v2)
# <name>-<service>-1 depending on version — `docker compose ... exec` with
# -p resolves this correctly without us needing to guess the exact name.
POSTGRES_USER="${POSTGRES_USER:-marketing}"
POSTGRES_DB="${POSTGRES_DB:-marketing_saas}"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUTFILE="$OUTPUT_DIR/${COMPOSE_PROJECT}-${POSTGRES_DB}-${TIMESTAMP}.sql.gz"

echo -e "${YELLOW}Backing up ${POSTGRES_DB} (project: ${COMPOSE_PROJECT}) → ${OUTFILE}${NC}"

# --clean --if-exists: the resulting dump is directly restorable over an
# existing (possibly non-empty) database, which is what the restore-drill
# in scripts/restore.sh actually exercises — a plain dump without these
# flags would fail to restore into a database that already has the schema.
docker compose -f docker-compose.prod.yml -p "$COMPOSE_PROJECT" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$OUTFILE"

SIZE=$(du -h "$OUTFILE" | cut -f1)
echo -e "${GREEN}✓ Backup complete: ${OUTFILE} (${SIZE})${NC}"
echo ""
echo "  Restore with: ./scripts/restore.sh $OUTFILE [compose-project-name]"

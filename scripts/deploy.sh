#!/usr/bin/env bash
# ============================================================================
# Expload Marketing SaaS — Production Deployment
# ============================================================================
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#
# What this script does:
#   1. Verifies .env.production exists with required variables
#   2. Builds the production Docker image
#   3. Runs database migrations
#   4. Brings up the full stack (Postgres + Redis + App) via docker-compose
#   5. Verifies health checks
# ============================================================================

set -e

# This repo's root, regardless of where the script is invoked from — the
# previous hardcoded /home/z/my-project was leftover scaffold boilerplate
# that never matched a real checkout (found while auditing this script for
# Phase 19; same bug existed in deploy-vps.sh's rsync source path).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Expload Marketing SaaS — Production Deploy${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1. Check Docker
echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Install Docker: https://docs.docker.com/get-docker/${NC}"
  exit 1
fi
if ! docker compose version &> /dev/null; then
  echo -e "${RED}✗ Docker Compose v2 not found. Install: https://docs.docker.com/compose/install/${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
echo -e "${GREEN}✓ Docker Compose v2${NC}"

# 2. Verify .env.production
echo -e "\n${YELLOW}[2/5] Verifying environment...${NC}"
if [ ! -f ".env.production" ]; then
  # .env.production.example (Postgres + Caddy/DOMAIN + REDIS_PASSWORD), not
  # .env.example (the SQLite/no-Caddy local-dev template) — the latter is
  # missing several vars docker-compose.prod.yml hard-fails without.
  echo -e "${YELLOW}  → .env.production not found. Creating from .env.production.example${NC}"
  cp .env.production.example .env.production
  echo -e "${RED}  ✗ Edit .env.production and fill in production values, then re-run.${NC}"
  echo -e "${YELLOW}    Required: DOMAIN, NEXTAUTH_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD${NC}"
  exit 1
fi

# Generate NEXTAUTH_SECRET if not set
if ! grep -q "NEXTAUTH_SECRET=.\+" .env.production || grep -q "NEXTAUTH_SECRET=change-this" .env.production; then
  SECRET=$(openssl rand -base64 32)
  sed -i.bak "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env.production
  echo -e "${GREEN}✓ Generated NEXTAUTH_SECRET${NC}"
fi

# Verify required vars
source .env.production
for var in DOMAIN NEXTAUTH_SECRET POSTGRES_PASSWORD REDIS_PASSWORD; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}  ✗ $var is required in .env.production${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✓ Environment verified${NC}"

# 3. Build Docker images
echo -e "\n${YELLOW}[3/5] Building production Docker image (this may take 5-10 minutes)...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production build
echo -e "${GREEN}✓ Image built${NC}"

# 4. Start services
echo -e "\n${YELLOW}[4/5] Starting services...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for postgres to be healthy
echo -e "${YELLOW}  → Waiting for PostgreSQL...${NC}"
for i in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-marketing}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL ready${NC}"
    break
  fi
  sleep 2
  [ $i -eq 30 ] && { echo -e "${RED}  ✗ PostgreSQL failed to start${NC}"; exit 1; }
done

# Run database migrations — against schema.production.prisma (postgresql).
# A real prisma/migrations/ history now exists (Phase 19) so this is a
# real migration run, not the no-op it used to be against an empty
# migrations folder.
echo -e "${YELLOW}  → Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy --schema=prisma/schema.production.prisma 2>&1 | tail -10
echo -e "${GREEN}✓ Migrations complete${NC}"

# Demo/sample-data seeding (scripts/seed.ts, seed-distributor.ts, etc.) is
# deliberately NOT run here — those create fake example.com leads/
# companies for local dev/demo convenience (see scripts/dev-setup.sh),
# which has no place in a real production database. This line used to
# call `docker compose exec app npx tsx scripts/seed-distributor.ts`,
# which was *always* a silent no-op anyway (only `|| true`'d past the
# real error): the production runtime image never copies `scripts/` or
# installs `bun`/`tsx` (see Dockerfile's runner stage) — found while
# implementing Phase 19's migration fix.

# 5. Verify health
# Checked from *inside* the app container, not the host — Phase 19 removed
# the app's host port publish entirely (only Caddy binds 80/443 now; see
# docker-compose.prod.yml's header comment), so `curl http://localhost:3000`
# from the host has nothing to connect to any more. The container itself
# still listens on 3000 internally, which is all `docker compose exec` needs
# — via 127.0.0.1, not `localhost`: confirmed live against a real running
# container that Alpine resolves "localhost" to ::1 first, and the
# HOSTNAME=0.0.0.0 fix in the Dockerfile only binds the IPv4 socket (see
# that file's own comment on this exact failure mode).
echo -e "\n${YELLOW}[5/5] Verifying health...${NC}"
sleep 5
for i in $(seq 1 30); do
  HEALTH=$(docker compose -f docker-compose.prod.yml exec -T app curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
  if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✓ App healthy${NC}"
    break
  fi
  sleep 2
  [ $i -eq 30 ] && { echo -e "${RED}  ✗ Health check failed${NC}"; }
done

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 Production deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n  → App: ${YELLOW}https://\${DOMAIN} (via Caddy — see .env.production)${NC}"
echo -e "  → Postgres: ${YELLOW}internal network only, no host port (docker compose exec postgres psql ...)${NC}"
echo -e "  → Redis: ${YELLOW}internal network only, no host port${NC}"
echo -e "\n  Useful commands:"
echo -e "    ${YELLOW}docker compose -f docker-compose.prod.yml logs -f app${NC}  # view app logs"
echo -e "    ${YELLOW}docker compose -f docker-compose.prod.yml down${NC}         # stop services"
echo -e "    ${YELLOW}docker compose -f docker-compose.prod.yml restart app${NC}  # restart app"
echo -e ""

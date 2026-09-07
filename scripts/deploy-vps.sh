#!/usr/bin/env bash
# ============================================================================
# Expload Marketing SaaS — Remote VPS Deployment
# ============================================================================
# Deploys to a fresh Ubuntu 22.04+ VPS via SSH.
# Works with: DigitalOcean, Hetzner, Vultr, Linode, AWS EC2, Contabo, etc.
#
# Usage:
#   1. Provision a fresh Ubuntu 22.04+ VPS (2GB RAM minimum, 4GB recommended)
#   2. Point your domain (e.g. marketing.example.com) to the VPS IP via DNS A record
#   3. Run: ./scripts/deploy-vps.sh user@your-server-ip your-domain.com
#
# Example:
#   ./scripts/deploy-vps.sh root@143.198.50.10 marketing.mycompany.com
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ $# -lt 2 ]; then
  echo "Usage: $0 <ssh-target> <domain>"
  echo "Example: $0 root@1.2.3.4 marketing.example.com"
  exit 1
fi

SSH_TARGET="$1"
DOMAIN="$2"
PROJECT_DIR="/opt/marketing-saas"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploying to VPS: $SSH_TARGET${NC}"
echo -e "${GREEN}  Domain: $DOMAIN${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1. Install Docker on remote
echo -e "\n${YELLOW}[1/6] Installing Docker on remote server...${NC}"
ssh -o StrictHostKeyChecking=no "$SSH_TARGET" 'bash -s' << 'REMOTE_EOF'
set -e
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed."
else
  echo "Docker already installed: $(docker --version)"
fi
REMOTE_EOF
echo -e "${GREEN}✓ Docker ready on remote${NC}"

# 2. Copy project to remote
echo -e "\n${YELLOW}[2/6] Copying project to remote...${NC}"
ssh "$SSH_TARGET" "mkdir -p $PROJECT_DIR"
# SCRIPT_DIR/.. is this repo's root, regardless of where the script is
# invoked from — the previous hardcoded /home/z/my-project/ source path was
# leftover scaffold boilerplate that never matched a real checkout of this
# repo, so every rsync/scp call here had always synced nothing (or someone
# else's project) rather than this codebase.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if command -v rsync &> /dev/null; then
  rsync -az --progress \
    --exclude 'node_modules' --exclude '.next' --exclude 'db/*.db' \
    --exclude '.git' --exclude 'upload/' --exclude 'download/' \
    --exclude '.env' --exclude '.env.production' \
    "$REPO_ROOT/" "$SSH_TARGET:$PROJECT_DIR/"
else
  scp -r "$REPO_ROOT"/* "$SSH_TARGET:$PROJECT_DIR/"
fi
echo -e "${GREEN}✓ Files synced${NC}"

# 3. Generate production env on remote (from .env.production.example, the
# real Postgres/Caddy-in-Docker template — not .env.example, which is the
# SQLite/no-Caddy local-dev file and doesn't even declare REDIS_PASSWORD or
# DOMAIN, both `:?`-required by docker-compose.prod.yml).
echo -e "\n${YELLOW}[3/6] Generating production environment...${NC}"
POSTGRES_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

ssh "$SSH_TARGET" "bash -s" << REMOTE_EOF
set -e
cd $PROJECT_DIR
cp .env.production.example .env.production

sed -i 's|^DEPLOY_ENV=.*|DEPLOY_ENV=production|' .env.production
sed -i 's|^DOMAIN=.*|DOMAIN=$DOMAIN|' .env.production
sed -i 's|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|' .env.production
sed -i 's|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|' .env.production
sed -i 's|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|' .env.production
sed -i 's|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|' .env.production
sed -i 's|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|' .env.production

echo "Production env created."
REMOTE_EOF
echo -e "${GREEN}✓ Environment configured${NC}"

# 4. Build & start on remote
echo -e "\n${YELLOW}[4/6] Building Docker image on remote (5-10 min)...${NC}"
ssh "$SSH_TARGET" "cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml --env-file .env.production build" 2>&1 | tail -10
echo -e "${GREEN}✓ Image built${NC}"

# 5. Start services
echo -e "\n${YELLOW}[5/6] Starting services...${NC}"
ssh "$SSH_TARGET" "cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
sleep 10
echo -e "${GREEN}✓ Services started${NC}"

# Run migrations — against schema.production.prisma (postgresql), no more
# db-push fallback: a real prisma/migrations/ history exists now (Phase
# 19), so `migrate deploy` is a real, repeatable operation, not a no-op
# needing a silent fallback to schema-sync. Demo-data seeding
# (seed-distributor.ts etc.) is deliberately not run here — see
# scripts/deploy.sh's comment on why that line was always a silent no-op
# in this container anyway, and why production shouldn't seed fake demo
# data in the first place.
echo -e "${YELLOW}  → Running migrations...${NC}"
ssh "$SSH_TARGET" "cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy --schema=prisma/schema.production.prisma" 2>&1 | tail -10

# 6. Reverse proxy + HTTPS: nothing to do here — Caddy runs as the `caddy`
# service inside docker-compose.prod.yml (Phase 19) and was already started
# in step 5 along with the rest of the stack. It reads $DOMAIN from
# .env.production and requests its own Let's Encrypt certificate on first
# request; no host-level `apt install caddy` or SSH-heredoc-generated
# /etc/caddy/Caddyfile is needed (or wanted — a host-level Caddy would fight
# the containerized one for ports 80/443). See Caddyfile's own header
# comment for the containerization rationale.
echo -e "\n${YELLOW}[6/6] Reverse proxy (Caddy, containerized)${NC}"
echo -e "${GREEN}✓ Caddy is running as part of the compose stack — requesting HTTPS cert for $DOMAIN on first request${NC}"

# Final verification
echo -e "\n${YELLOW}Verifying deployment...${NC}"
sleep 15
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health/ready" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ App is live and healthy at https://$DOMAIN${NC}"
else
  echo -e "${YELLOW}! Health check returned $HTTP_CODE — app may still be starting. Check logs:${NC}"
  echo -e "  ssh $SSH_TARGET 'cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml logs -f app'"
fi

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 Production deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n  → URL: ${YELLOW}https://$DOMAIN${NC}"
echo -e "  → Server: $SSH_TARGET"
echo -e "  → Project dir: $PROJECT_DIR"
echo -e "\n  Next steps:"
echo -e "  1. Edit ${YELLOW}.env.production${NC} on the server to add LLM API keys:"
echo -e "     ssh $SSH_TARGET 'nano $PROJECT_DIR/.env.production'"
echo -e "     ssh $SSH_TARGET 'cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml restart app'"
echo -e "  2. View logs:"
echo -e "     ssh $SSH_TARGET 'cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml logs -f'"
echo -e "  3. Update code (redeploy): just re-run this script — it re-syncs"
echo -e "     the repo, rebuilds, and re-applies migrations idempotently. Or,"
echo -e "     to redeploy without touching the env file:"
echo -e "     rsync -az --exclude='node_modules' --exclude='.next' --exclude='db/*.db' --exclude='.env.production' $REPO_ROOT/ $SSH_TARGET:$PROJECT_DIR/"
echo -e "     ssh $SSH_TARGET 'cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml up -d --build app'"
echo -e ""

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
# Use rsync if available, fallback to scp
if command -v rsync &> /dev/null; then
  rsync -az --progress \
    --exclude 'node_modules' --exclude '.next' --exclude 'db/*.db' \
    --exclude '.git' --exclude 'upload/' --exclude 'download/' \
    --exclude '.env' --exclude '.env.production' \
    /home/z/my-project/ "$SSH_TARGET:$PROJECT_DIR/"
else
  ssh "$SSH_TARGET" "cd $PROJECT_DIR"
  scp -r /home/z/my-project/* "$SSH_TARGET:$PROJECT_DIR/" 2>/dev/null || true
fi
echo -e "${GREEN}✓ Files synced${NC}"

# 3. Generate production env on remote
echo -e "\n${YELLOW}[3/6] Generating production environment...${NC}"
POSTGRES_PASSWORD=$(openssl rand -hex 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

ssh "$SSH_TARGET" "bash -s" << REMOTE_EOF
set -e
cd $PROJECT_DIR
cp .env.example .env.production

# Set critical vars
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://marketing:$POSTGRES_PASSWORD@postgres:5432/marketing_saas?schema=public|' .env.production
sed -i 's|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|' .env.production
sed -i 's|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|' .env.production
sed -i 's|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|' .env.production
sed -i 's|^REDIS_URL=.*|REDIS_URL=redis://redis:6379|' .env.production

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

# Run migrations
echo -e "${YELLOW}  → Running migrations...${NC}"
ssh "$SSH_TARGET" "cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy" 2>&1 | tail -10 || \
  ssh "$SSH_TARGET" "cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml exec -T app npx prisma db push" 2>&1 | tail -10
ssh "$SSH_TARGET" "cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml exec -T app npx tsx scripts/seed-distributor.ts" 2>&1 | tail -5 || true

# 6. Setup Caddy reverse proxy with automatic HTTPS
echo -e "\n${YELLOW}[6/6] Setting up Caddy with automatic HTTPS for $DOMAIN...${NC}"
ssh "$SSH_TARGET" "bash -s" << REMOTE_EOF
set -e

# Install Caddy
if ! command -v caddy &> /dev/null; then
  echo "Installing Caddy..."
  apt update -qq
  apt install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl > /dev/null 2>&1
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
  apt update -qq
  apt install -y -qq caddy > /dev/null 2>&1
fi

# Configure Caddy with auto-HTTPS
cat > /etc/caddy/Caddyfile << CADDY_EOF
$DOMAIN {
  reverse_proxy localhost:3000 {
    header_up Host {host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
    header_up X-Real-IP {remote_host}
  }
  
  # Security headers
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
    Referrer-Policy strict-origin-when-cross-origin
  }
  
  # Compression
  encode gzip zstd
  
  # Cache static assets
  @static path /_next/static/* /fonts/* /images/* /favicon.ico
  header @static Cache-Control "public, max-age=31536000, immutable"
  
  log {
    output file /var/log/caddy/\$DOMAIN.log
    format json
  }
}
CADDY_EOF

systemctl restart caddy
systemctl enable caddy
echo "Caddy configured with auto-HTTPS for $DOMAIN"
REMOTE_EOF
echo -e "${GREEN}✓ HTTPS configured${NC}"

# Final verification
echo -e "\n${YELLOW}Verifying deployment...${NC}"
sleep 15
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
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
echo -e "  3. Update code (redeploy):"
echo -e "     rsync -az --exclude='node_modules' --exclude='.next' --exclude='db/' /home/z/my-project/ $SSH_TARGET:$PROJECT_DIR/"
echo -e "     ssh $SSH_TARGET 'cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml up -d --build app'"
echo -e ""

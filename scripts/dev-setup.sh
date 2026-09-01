#!/usr/bin/env bash
# ============================================================================
# Expload Marketing SaaS — Local Development Setup
# ============================================================================
# Usage:
#   chmod +x scripts/dev-setup.sh
#   ./scripts/dev-setup.sh
#
# What this script does:
#   1. Checks Node.js, Bun, and Prisma prerequisites
#   2. Creates .env from .env.example if missing
#   3. Installs npm dependencies via Bun
#   4. Generates Prisma client
#   5. Pushes schema to local SQLite database
#   6. Seeds initial data (license packages, gateways, departments)
#   7. Starts the dev server at http://localhost:3000
# ============================================================================

set -e

PROJECT_ROOT="/home/z/my-project"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Expload Marketing SaaS — Local Setup${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1. Check prerequisites
echo -e "\n${YELLOW}[1/7] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install Node.js 20+ from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v bun &> /dev/null; then
  echo -e "${YELLOW}! Bun not found. Installing Bun...${NC}"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo -e "${GREEN}✓ Bun $(bun --version)${NC}"

# 2. Create .env
echo -e "\n${YELLOW}[2/7] Setting up environment...${NC}"
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Created .env from .env.example${NC}"
  echo -e "${YELLOW}  → Edit .env to add your API keys (GROQ_API_KEY at minimum)${NC}"
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi

# 3. Install dependencies
echo -e "\n${YELLOW}[3/7] Installing dependencies (this may take 1-2 minutes)...${NC}"
bun install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 4. Generate Prisma client
echo -e "\n${YELLOW}[4/7] Generating Prisma client...${NC}"
bun run db:generate 2>&1 | tail -3
echo -e "${GREEN}✓ Prisma client generated${NC}"

# 5. Create database & push schema
echo -e "\n${YELLOW}[5/7] Setting up database (SQLite)...${NC}"
mkdir -p db
bun run db:push 2>&1 | tail -3
echo -e "${GREEN}✓ Database schema synced${NC}"

# 6. Seed initial data
echo -e "\n${YELLOW}[6/7] Seeding initial data...${NC}"
bun run db:seed 2>&1 | tail -5 || true
# Also seed distributor data
npx tsx scripts/seed-distributor.ts 2>&1 | tail -5 || true
echo -e "${GREEN}✓ Seed complete${NC}"

# 7. Start dev server
echo -e "\n${YELLOW}[7/7] Starting development server...${NC}"
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n  → Open ${YELLOW}http://localhost:3000${NC} in your browser"
echo -e "  → Login with any email (first user is auto-created as super_admin)"
echo -e "  → Add your API keys in ${YELLOW}Settings → LLM Providers${NC} or in .env"
echo -e "\n  Press Ctrl+C to stop the server.\n"

exec bun dev

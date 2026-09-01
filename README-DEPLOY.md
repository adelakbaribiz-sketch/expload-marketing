# Expload Marketing — Deployment Guide

## 📦 What's in this ZIP

This package contains the complete source code for the Expload Marketing platform.

### Excluded (you'll need to install/regenerate these on the server):
- `node_modules/` — install via `bun install` or `npm install`
- `.next/` — build cache, regenerated on `bun run build`
- `db/custom.db` — SQLite dev database, regenerated on `prisma db push`
- `.env` — your environment variables (use `.env.example` as template)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js 20+** — https://nodejs.org
- **Bun** (recommended) — `curl -fsSL https://bun.sh/install | bash`
- **Git** (optional)

### Steps

```bash
# 1. Extract the ZIP
unzip expload-marketing.zip -d expload-marketing
cd expload-marketing

# 2. Create .env from template
cp .env.example .env

# 3. Edit .env — at minimum set:
#    - GROQ_API_KEY (free at https://console.groq.com/keys)
#    - NEXTAUTH_SECRET (run: openssl rand -base64 32)

# 4. Install dependencies
bun install
# OR: npm install

# 5. Generate Prisma client + create database
bun run db:generate
bun run db:push

# 6. Seed initial data
bun run db:seed
npx tsx scripts/seed-distributor.ts
npx tsx scripts/seed-support.ts
npx tsx scripts/seed-events.ts
npx tsx scripts/seed-gateways-extra.ts

# 7. Start dev server
bun dev
```

Open **http://localhost:3000** in your browser.

### Default Login
- **Email**: `admin@expload.io`
- **Password**: `admin123`

---

## 🌍 Production Deployment

### Option A: Docker Compose (Recommended for VPS)

```bash
# 1. Extract ZIP on your server
unzip expload-marketing.zip -d /opt/expload-marketing
cd /opt/expload-marketing

# 2. Create production env
cp .env.example .env.production
# Edit .env.production with production values:
#   - DATABASE_URL=postgresql://...  (use Postgres for prod)
#   - NEXTAUTH_SECRET=<strong random string>
#   - GROQ_API_KEY=<your key>
#   - All other API keys

# 3. Build & start
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This starts:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **App** (port 3000)

### Option B: Remote VPS Deployment (One Command)

From your local machine:

```bash
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh root@YOUR_SERVER_IP your-domain.com
```

This script:
1. Installs Docker on the VPS
2. Syncs files via rsync
3. Generates production env
4. Builds Docker image
5. Configures **Caddy** with automatic HTTPS (Let's Encrypt)
6. Runs migrations + seeds

**Requirements**:
- Fresh Ubuntu 22.04+ VPS (2GB RAM min, 4GB recommended)
- DNS A record pointing to your VPS IP
- SSH access as root

### Option C: Manual Deployment

```bash
# 1. Install dependencies
bun install --production

# 2. Build
bun run build

# 3. Set production env vars
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export NEXTAUTH_SECRET="..."

# 4. Run migrations
npx prisma migrate deploy

# 5. Start the server
bun start
# OR: node .next/standalone/server.js
```

Use a reverse proxy (Nginx/Caddy) for HTTPS.

---

## 🔑 Required Environment Variables

See `.env.example` for the full list. **Minimum required**:

| Variable | Purpose | Where to get |
|----------|---------|-------------|
| `DATABASE_URL` | Database connection | SQLite for dev, PostgreSQL for prod |
| `NEXTAUTH_SECRET` | Session signing secret | `openssl rand -base64 32` |
| `GROQ_API_KEY` | Free LLM API | https://console.groq.com/keys |

### Optional but recommended:

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | More free LLM models |
| `CEREBRAS_API_KEY` | Ultra-fast LLM inference |
| `SERPER_API_KEY` | Google search for lead generation |
| `STRIPE_SECRET_KEY` | Credit card payments |
| `NOWPAYMENTS_API_KEY` | Crypto payments |
| `QDRANT_URL` | Vector database for semantic search |
| `REDIS_URL` | Job queue + caching |

---

## 📊 Post-Deployment Checklist

- [ ] Health check: `curl https://your-domain.com/api/health` → 200 OK
- [ ] Create super admin user (first user becomes super_admin)
- [ ] Add LLM API keys in Settings → Multi-LLM Aggregator
- [ ] Configure payment gateways in Payment Gateways section
- [ ] Run seed scripts to populate initial data
- [ ] Test login + dashboard
- [ ] Set up SSL/HTTPS (automatic with Caddy)
- [ ] Configure backup for database

---

## 🆘 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "Database connection failed"
- Check `DATABASE_URL` in `.env`
- For SQLite: ensure the `db/` directory exists
- For PostgreSQL: ensure the server is running

### "Port 3000 already in use"
```bash
# Change port in package.json: "dev": "next dev -p 3001"
# OR kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Build fails with TypeScript errors
```bash
# Clear cache and rebuild
rm -rf .next
bun run build
```

### LLM features not working
- Ensure at least one API key is set (Groq is free & easiest)
- Check `/api/llm/providers` endpoint — provider should show `hasApiKey: true`
- Check `/api/llm/audit` for error logs

---

## 📁 Project Structure

```
expload-marketing/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # 236+ API routes
│   │   ├── page.tsx            # Main dashboard
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles + 3D animations
│   ├── components/
│   │   ├── dashboard/          # 61 dashboard views
│   │   ├── guides/             # Guided tour + tooltips
│   │   ├── ui/                 # shadcn/ui components
│   │   └── auth/               # Auth components
│   ├── lib/
│   │   ├── ai/                 # AI agents
│   │   ├── auth/               # Authentication
│   │   ├── campaign-scheduler/ # Smart date suggestions
│   │   ├── events-calendar/    # Global events
│   │   ├── finance/            # Financial reports
│   │   ├── graph/              # Graph Agent orchestrator
│   │   ├── llm/                # Multi-LLM aggregator (5 providers)
│   │   ├── negotiation/        # 6-round negotiation engine
│   │   ├── payment/            # Crypto + gateway router
│   │   ├── project-intake/     # Brief → roadmap → pricing
│   │   ├── prompts/            # Professional system prompts
│   │   ├── security/           # Auth, rate limit, headers
│   │   └── vector/             # Qdrant vector search
│   ├── messages/               # 30 language translations
│   └── i18n/                   # Internationalization
├── prisma/
│   └── schema.prisma           # 120+ models
├── scripts/                    # Seed + deployment scripts
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.prod.yml     # Production stack
├── .env.example                # Environment template
└── package.json
```

---

## 📈 Scale & Performance

- **Multi-tenant**: supports unlimited tenants with RBAC
- **Database**: SQLite for dev, PostgreSQL for production (100+ models)
- **Vector DB**: Qdrant for semantic search (optional)
- **Redis**: for job queue + rate limiting (production)
- **LLM**: 5 free-tier providers with auto-fallback
- **Payments**: 40 gateways including crypto
- **i18n**: 30 languages including RTL (Arabic, Persian, Hebrew)

---

## 📞 Support

- **Documentation**: see `DEPLOY.md` for additional details
- **Scripts**: `scripts/dev-setup.sh` for automated local setup
- **Issues**: check the worklog at `worklog.md` for implementation details

---

**Built with**: Next.js 16 · Prisma · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · z-ai-web-dev-sdk

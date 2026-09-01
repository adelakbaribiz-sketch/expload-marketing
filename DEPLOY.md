# Production Deployment Guide

This guide covers deploying Expload Marketing SaaS to production using Docker Compose.

## Prerequisites

- Docker 24+ and Docker Compose v2+
- A domain name with DNS access
- SMTP credentials (Gmail App Password, SendGrid, Amazon SES, etc.)
- Optional: Serper API key for live Google search

## Quick Start (Docker Compose)

### 1. Clone and configure

```bash
git clone <your-repo-url> expload-marketing
cd expload-marketing

# Create production env file
cp .env.production.example .env.production
```

### 2. Edit `.env.production`

Fill in all required values:

```bash
# Generate a strong NextAuth secret
openssl rand -base64 32

# Set a strong PostgreSQL password
# Update DATABASE_URL with the same password
```

### 3. Start the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

This starts:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **App** (port 3000)

### 4. Run database migrations

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### 5. Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"status":"healthy","checks":{"database":{"ok":true},...}}
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `NEXTAUTH_SECRET` | Session signing secret (32+ chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app's public URL | `https://yourapp.com` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |

### SMTP (Email)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` (STARTTLS) or `465` (SSL) |
| `SMTP_USER` | SMTP username | `you@gmail.com` |
| `SMTP_PASS` | SMTP password / app password | `your-app-password` |
| `SMTP_FROM` | From email address | `"Expload <noreply@yourapp.com>"` |

**Gmail setup:**
1. Enable 2-Factor Authentication
2. Go to https://myaccount.google.com/apppasswords
3. Generate a 16-character app password
4. Use it as `SMTP_PASS`

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `SERPER_API_KEY` | Google Search API key | (not set → mock mode) |
| `PLAYWRIGHT_ENABLED` | Enable browser scraping | `false` |
| `PLAYWRIGHT_EXTRACT_REVIEWS` | Extract Google Maps reviews | `false` |
| `SIEM_WEBHOOK_URL` | Forward audit logs to SIEM | (not set) |

## Local Development with PostgreSQL

### 1. Start PostgreSQL + Redis

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Update `.env`

```bash
DATABASE_URL=postgresql://marketing:marketing_dev@localhost:5432/marketing_saas?schema=public
REDIS_URL=redis://localhost:6379
```

### 3. Push schema and start dev server

```bash
bun run db:push
bun run dev:webpack  # Use webpack for stability
```

## Building without Docker

### Production build

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Build with webpack (NOT Turbopack)
bun run build:webpack

# Start production server
bun run start
```

### Why webpack?

Next.js 16 defaults to Turbopack for dev, which can be unstable with heavy
API routes (next-auth, nodemailer, bcryptjs). For production builds, webpack
is more stable and produces smaller bundles.

## Health Check

The `/api/health` endpoint returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-07-15T10:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": { "ok": true, "latency": 5 },
    "redis": { "ok": true, "latency": 2 },
    "smtp": { "ok": true }
  }
}
```

Use this for:
- Docker health checks (configured in Dockerfile)
- Load balancer probes (AWS ALB, nginx, Caddy)
- Kubernetes liveness/readiness probes

## Testing Email Configuration

```bash
# Send a test email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"to":"you@example.com","subject":"Test","body":"Hello!"}'
```

## Database Migrations

### Create a new migration

After changing `prisma/schema.prisma`:

```bash
# Generate migration
DATABASE_URL=postgresql://... npx prisma migrate dev --name your_migration_name

# The migration file is created in prisma/migrations/
```

### Apply migrations in production

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

## Backup

### PostgreSQL backup

```bash
# Backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U marketing marketing_saas > backup.sql

# Restore
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U marketing marketing_saas < backup.sql
```

### Redis backup

Redis data is persisted in the `redis_data` volume. For a snapshot:

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE
```

## Scaling

### Horizontal scaling

The app is stateless (sessions in cookies, queue in Redis). To scale:

1. Put multiple app instances behind a load balancer
2. All instances share the same PostgreSQL + Redis
3. The queue worker runs on all instances (jobs are distributed via Redis BRPOP)

### Queue worker scaling

For high-throughput email campaigns, run dedicated queue workers:

```bash
# In a separate container/process
QUEUE_WORKER_ONLY=true node worker.js
```

(Worker-only mode — coming soon)

## Monitoring

### Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View app logs only
docker compose -f docker-compose.prod.yml logs -f app

# View database logs
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Audit logs

All sensitive operations are logged to the `Activity` table and stdout:

```json
{
  "ts": "2026-07-15T10:00:00Z",
  "type": "created",
  "message": "Lead created",
  "tenantId": "...",
  "userId": "...",
  "ip": "...",
  "ua": "..."
}
```

Forward to SIEM by setting `SIEM_WEBHOOK_URL`.

## Troubleshooting

### Database connection refused

```bash
# Check if postgres is healthy
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs postgres
```

### Redis connection refused

```bash
# Test Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Should return: PONG
```

### Email not sending

1. Check SMTP config: `curl http://localhost:3000/api/health | jq .config.smtp`
2. Send test email: see "Testing Email Configuration" above
3. Check app logs for errors

### Build fails

```bash
# Check TypeScript errors
bun run typecheck

# Check ESLint
bun run lint

# Build with verbose output
next build --webpack 2>&1 | tee build.log
```

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is set to a 32+ char random string
- [ ] `POSTGRES_PASSWORD` is strong (16+ chars)
- [ ] HTTPS is enabled (use Caddy, nginx, or a CDN)
- [ ] `NEXTAUTH_URL` points to your HTTPS domain
- [ ] Firewall blocks direct access to PostgreSQL (5432) and Redis (6379)
- [ ] Regular database backups are scheduled
- [ ] `SERPER_API_KEY` is set for live search (or intentionally in mock mode)
- [ ] SMTP credentials use app passwords, not account passwords

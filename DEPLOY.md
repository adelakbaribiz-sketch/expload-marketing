# Production Deployment Guide

This guide covers deploying Expload Marketing SaaS across all four
environments (Development / Testing / Staging / Production) and the CI/CD
pipeline that builds, checks, and (optionally) ships every change. Standing
architecture decisions this guide assumes are documented in `adr/0006-adopt-prisma-migrations.md`
(why two Prisma schema files exist) and `docker-compose.prod.yml`'s own
header comment (why Caddy is a container, why the app publishes no host
port).

## Environments at a glance

| Environment | Database | How it runs | Config file |
|---|---|---|---|
| **Development** | SQLite (`prisma/schema.prisma`) | `bun run dev:webpack` on your machine | `.env` (from `.env.example`) |
| **Testing** (CI) | SQLite, in-memory-ish (`db:push`, fresh per run) | GitHub Actions (`.github/workflows/ci.yml`) | inline `env:` block in the workflow — mirrored in `.env.test.example` for local reproduction |
| **Staging** | PostgreSQL (`prisma/schema.production.prisma`) | `docker-compose.prod.yml`, separate domain/secrets/data from prod | `.env.staging` (from `.env.staging.example`) |
| **Production** | PostgreSQL (`prisma/schema.production.prisma`) | `docker-compose.prod.yml` | `.env.production` (from `.env.production.example`) |

Staging and production run the **identical** Docker image and compose file —
that's the entire point of having a staging environment. Only the env file
differs. See each `.env.*.example` file's own header comment before copying
it.

## Prerequisites (staging/production)

- Docker 24+ and Docker Compose v2+
- A domain name with DNS access (Caddy requests its own Let's Encrypt
  certificate — it needs a real, resolvable domain, not a bare IP)
- SMTP credentials (optional — falls back to console-logging if unset)

## Quick Start (Docker Compose)

### 1. Clone and configure

```bash
git clone https://github.com/adelakbaribiz-sketch/expload-marketing.git
cd expload-marketing
cp .env.production.example .env.production   # or .env.staging.example for staging
```

### 2. Edit `.env.production`

Every `REQUIRED` variable in the file is hard-enforced — `docker-compose.prod.yml`
refuses to start with a clear error naming the missing variable, rather than
silently falling back to an insecure default. At minimum:

```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -hex 24      # POSTGRES_PASSWORD
openssl rand -hex 24      # REDIS_PASSWORD
```

Set `DOMAIN` to your real domain — Caddy needs it for the TLS certificate.

### 3. Start the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This starts four services, all on an internal Docker network:
- **postgres** — no host port published (reachable only from `app`)
- **redis** — password-protected, no host port published
- **app** — the Next.js server, no host port published either (see below)
- **caddy** — the *only* service publishing ports (80/443), reverse-proxying to `app:3000` and terminating TLS

The app deliberately has no host-facing port of its own — everything goes
through Caddy. This isn't just tidiness: it makes `X-Forwarded-For` spoofing
(`src/lib/security/rate-limit.ts`'s `getClientId()` trusts that header)
structurally impossible rather than merely discouraged by a loopback bind,
since nothing outside the compose network can reach `app:3000` directly.

### 4. Run database migrations

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy --schema=prisma/schema.production.prisma
```

(`--schema` is required — this image ships two Prisma schema files; see
"Two schema files" below.)

### 5. Verify

```bash
curl https://your-domain.com/api/health/ready
# {"status":"ready","checks":{"database":{"ok":true},...}}
```

## Scripted deployment (recommended over the manual steps above)

- **`./scripts/deploy.sh`** — run *on* the target host, from a checkout of
  this repo. Verifies Docker is installed, verifies/bootstraps
  `.env.production`, builds the image, starts the stack, waits for Postgres,
  runs migrations, and health-checks the result (from inside the `app`
  container, since the host itself can't reach port 3000 any more).
- **`./scripts/deploy-vps.sh user@host your-domain.com`** — run from your
  *local* machine against a fresh Ubuntu 22.04+ VPS. Installs Docker
  remotely, rsyncs this repo, generates `.env.production` with random
  secrets, then runs the same build/start/migrate flow as `deploy.sh`. Caddy
  needs no separate setup — it's already part of the compose stack `deploy.sh`
  brings up.
- Both scripts resolve their own project root from `$BASH_SOURCE`, so they
  work regardless of where the repo is checked out — re-running either one
  is the redeploy path (rsync/git-pull the new code, rebuild, re-migrate,
  idempotently).

## Two schema files — why, and the rule for changing a model

`prisma/schema.prisma` (SQLite) is what local dev uses via `bun run db:push`
— unchanged, zero disruption to that workflow. `prisma/schema.production.prisma`
(PostgreSQL) is what staging/production migrations are generated and applied
against, because Prisma's `datasource.provider` is a static string that has
to match the real migration history's recorded provider — one file can't be
"SQLite in dev, PostgreSQL in prod" while also having a real, deployable
`prisma/migrations/` history. See `adr/0006-adopt-prisma-migrations.md`.

**Rule:** change a model in `schema.prisma` first, then copy the identical
change (everything except the `datasource` block) into
`schema.production.prisma`. Run `bun run db:schemas-in-sync` to verify —
it's also a CI gate (`.github/workflows/ci.yml`'s `quality` job), so a
drifted pair fails the build with a line-numbered diff, not a silent
surprise at migration time.

```bash
# After editing prisma/schema.prisma:
bun run db:schemas-in-sync                 # confirms (or diffs) the drift
DATABASE_URL=postgresql://... bun run db:migrate --name your_migration_name
# commits prisma/migrations/<timestamp>_your_migration_name/
```

## Environment Variables

See `.env.production.example` / `.env.staging.example` / `.env.example` /
`.env.test.example` — each file's own header comments explain what's
required vs. optional and what changes between environments. Do not
duplicate that list here; it drifts. The short version:

| Variable | Required in | Purpose |
|---|---|---|
| `DOMAIN` | staging, production | Caddy's TLS certificate + all the URL defaults below |
| `POSTGRES_PASSWORD` | staging, production | hard-fails startup if unset (`:?` guard in `docker-compose.prod.yml`) |
| `REDIS_PASSWORD` | staging, production | same — Redis is no longer unauthenticated even on the internal network |
| `NEXTAUTH_SECRET` | staging, production, CI | session signing — `src/lib/auth/simple-session.ts` refuses to boot without it (except during the `next build` phase itself — see that file's comment on `NEXT_PHASE`) |
| `DEPLOY_ENV` | all | tags every structured log line `development`/`test`/`staging`/`production` — distinct from `NODE_ENV`, which Next.js always sets to `production` for any production build, staging included |

## CI/CD Pipeline (`.github/workflows/ci.yml`)

Every push/PR to `main` runs, in order:

1. **`quality`** — Lint, Typecheck, unit/integration tests (`bun test`), DB
   integrity check, static security checks, **dependency vulnerability scan**
   (`bun audit`, two known build-tool-only Prisma CLI advisories explicitly
   ignored — see the workflow's own comment and `SECURITY-BASELINE.md` §23),
   and the schema drift check above.
2. **`build`** — real production build (`bun run build:webpack`), same
   command the Dockerfile's builder stage runs.
3. **`api-and-security-live`** and **`e2e`** (parallel, both need `build`) —
   boot the actual server and run live adversarial security checks, API
   integration checks, and the Playwright suite against it.
4. **`docker-image`** (Artifact — main branch pushes only, after every job
   above passes) — builds the real Dockerfile and pushes it to
   `ghcr.io/adelakbaribiz-sketch/expload-marketing`, tagged by commit SHA and
   `latest`. The SHA tag is what a future rollback would reference.
5. **`deploy`** — SSH's into whatever host `DEPLOY_SSH_HOST` (a repository/
   environment secret) names, checks out the just-built commit, and runs
   `./scripts/deploy.sh` there, then polls `/api/health/ready` until it
   returns 200. **No-ops (not fails) when `DEPLOY_SSH_HOST` isn't
   configured** — there is no real target host wired up in this repo yet;
   configure `DEPLOY_SSH_HOST` / `DEPLOY_SSH_USER` / `DEPLOY_SSH_KEY`
   (secrets) and `DEPLOY_DOMAIN` / `DEPLOY_PROJECT_DIR` (repository
   variables) under the `production` GitHub Environment to turn this on.

### Rollback (`.github/workflows/rollback.yml`)

Manually triggered (`workflow_dispatch`, needs a commit SHA input). SSHes to
the same target, checks out the given commit instead of `HEAD`, rebuilds,
and health-checks. **Important:** this reverts application code only, not
the database — Prisma migrations already applied by the bad deploy are not
auto-reverted (there's no auto-generated "down" migration). Only roll back
across a migration boundary after confirming the older code tolerates the
current schema, or restore a database snapshot first.

## Health Checks

Three endpoints, each for a different purpose (see each route's own header
comment):
- **`/api/health/live`** — "is the process up" (liveness — restart if this fails)
- **`/api/health/ready`** — "can it serve traffic right now" (DB/Redis/SMTP
  reachable — use this for deploy verification and load-balancer routing
  decisions)
- **`/api/health`** — combined, plus full config detail for an authenticated
  SuperAdmin caller (anonymous callers get booleans only — this endpoint
  used to leak masked DB/Redis URLs and integration config to anyone; fixed
  in Phase 15)

## Backup

```bash
# Postgres
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U marketing marketing_saas > backup.sql
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U marketing marketing_saas < backup.sql

# Redis (AOF is already on — `redis_data` volume persists it across restarts)
docker compose -f docker-compose.prod.yml exec redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE
```

Uploaded files live in the `storage_data` volume (`/app/storage/private` —
this had no volume at all before Phase 19, so every redeploy silently lost
every uploaded file; fixed).

## Local Development with PostgreSQL (optional)

Dev defaults to SQLite (`bun run db:push`, no containers needed). To test
against Postgres locally instead:

```bash
docker compose -f docker-compose.dev.yml up -d
# .env: DATABASE_URL=postgresql://marketing:marketing_dev@localhost:5432/marketing_saas?schema=public
bun run db:generate:prod   # generates the client against schema.production.prisma
bun run dev:webpack
```

## Building without Docker

```bash
bun install
bun run db:generate:prod           # against schema.production.prisma, for a Postgres target
NODE_ENV=production NEXTAUTH_SECRET=... bun run build:webpack
NODE_ENV=production NEXTAUTH_SECRET=... DATABASE_URL=postgresql://... bun run start
```

Webpack, not Turbopack — Next.js 16 defaults to Turbopack for dev, which has
had stability issues with this app's heavier API routes; production builds
always use webpack (`bun run build:webpack`).

## Scaling

The app is stateless (sessions in signed cookies, job queue in Redis) — put
multiple `app` instances behind Caddy's `reverse_proxy` (a plain space-
separated list of upstreams) or an external load balancer, all pointed at
the same Postgres + Redis.

## Troubleshooting

**"Cannot find module '@prisma/client'"** — `bun run db:generate` (dev,
SQLite) or `bun run db:generate:prod` (staging/prod, Postgres). Generating
against the wrong schema is a real, provider-specific mismatch, not just a
missing file — see `prisma/schema.production.prisma`'s header comment.

**Database connection refused** — `docker compose -f docker-compose.prod.yml ps`
to check Postgres is healthy; `docker compose -f docker-compose.prod.yml logs postgres`.

**Redis connection refused** — `docker compose -f docker-compose.prod.yml exec redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping` should return `PONG`. A bare `redis-cli ping` with no `-a` will get `NOAUTH` — that's Redis correctly requiring the password Phase 19 added, not a broken deployment.

**Build fails** — `bun run typecheck && bun run lint`, then `rm -rf .next && bun run build:webpack` for full output.

**"Port 3000 already in use" (dev only)** — `next dev -p 3001`, or `lsof -ti:3000 | xargs kill -9`. In staging/production this can't happen — the app publishes no host port at all.

## Security Checklist

- [ ] `NEXTAUTH_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD` are all real random values, not left at any placeholder
- [ ] `DOMAIN` is a real, DNS-resolvable domain (Caddy's Let's Encrypt request will not work for a bare IP)
- [ ] `.env.production` / `.env.staging` are never committed (already `.gitignore`d — verify before a manual `git add`)
- [ ] Postgres and Redis are never exposed on a host port (they aren't, by default — don't add a `ports:` override)
- [ ] `bun audit` is clean of anything beyond the two documented, build-tool-only Prisma CLI advisories (CI gates this)
- [ ] Regular `pg_dump` backups are scheduled somewhere outside the host itself

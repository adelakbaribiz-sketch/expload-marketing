# DevOps & Deployment Audit — Phase 19

Scope: standardize Development/Testing/Staging/Production environments;
standardize Docker/Environment/Secrets/Reverse-Proxy/SSL/Database/Cache/
Queue/Storage; build out CI/CD (Lint/TypeCheck/Test/Security-Scan/Build/
Artifact/Deploy/Health-Check/Rollback); make deployment repeatable.

Starting state (confirmed by re-reading the code, not assumed from prior
docs): no `prisma/migrations/` history at all (`adr/0006`, Proposed since
Phase 04); a `docker-compose.prod.yml` with real gaps (no Redis password, no
persistent volume for uploaded files, ~20 environment variables from Phases
10-15 never wired in); a Dockerfile that generated its Prisma Client from
the wrong (SQLite) schema; two deploy scripts (`deploy.sh`, `deploy-vps.sh`)
that had accumulated dead/broken steps over several phases without ever
being run end-to-end; a CI pipeline (`ci.yml`, built Phase 18) that covered
Lint/TypeCheck/Test/Build but not Security-Scan/Artifact/Deploy/Health-Check/
Rollback.

## 1. Database — real migrations (`adr/0006`, implemented)

`prisma/schema.prisma` (SQLite) is unchanged — still the file `bun run
db:push` uses for local dev, zero disruption. New `prisma/schema.production.prisma`
(PostgreSQL) exists solely because Prisma's `datasource.provider` is a
static string that must match the real migration history's own recorded
provider; one file cannot be "SQLite in dev, PostgreSQL in prod" while also
having a real, deployable `prisma/migrations/` history.

- Baseline migration (`prisma/migrations/20260906230558_init/`, 4892 lines)
  generated via `prisma migrate diff --from-empty --to-schema-datamodel
  prisma/schema.production.prisma --script` — pure schema introspection, no
  live database connection needed. Confirmed: 152 `CREATE TABLE`, 176
  foreign keys, 351 indexes; correctly captures Phase 18's `Activity→Tenant`
  cascade and `CryptoPayment→Payment` relation fixes.
- New `scripts/check-schema-sync.ts` (`bun run db:schemas-in-sync`, CI gate)
  byte-diffs both schema files after stripping each one's own `datasource`
  block — any drift fails with a line-numbered diff instead of silently
  shipping a migration that doesn't match what dev has been testing against.
  Live-verified both ways: passes on the real in-sync files, and correctly
  fails (with the right diff) when a temporary drift was introduced.
- `package.json` scripts reorganized: `db:generate`/`db:push` stay
  SQLite/dev; new `db:generate:prod`/`db:migrate`/`db:migrate:prod`/
  `db:migrate:status` all target `schema.production.prisma` explicitly.

## 2. Docker — three real, previously-latent bugs fixed

1. **Provider mismatch**: both the builder and runner stages of `Dockerfile`
   generated the Prisma Client from the default `schema.prisma` (SQLite)
   even though this image only ever talks to Postgres at runtime — Prisma's
   generated query engine is provider-specific, so this was a real defect,
   not a style issue. Fixed: both stages now pass
   `--schema=prisma/schema.production.prisma` explicitly.
2. **Storage ownership**: `docker-compose.prod.yml` had no volume at all for
   uploaded files (`src/lib/storage/index.ts`'s `LocalStorageAdapter`,
   `PRIVATE_ROOT = storage/private`) — every redeploy silently lost every
   uploaded file. Fixed with a `storage_data` volume; the Dockerfile now
   pre-creates and `chown`s the mount point (`RUN mkdir -p
   /app/storage/private && chown -R nextjs:nodejs /app/storage`) — a fresh
   named volume mounted onto a path not already present with correct
   ownership in the image is created `root:root` by Docker, which would
   have `EACCES`'d the app's first write.
3. **Unpinned, unreliable runtime tooling install** (found only by watching
   a live build run slowly — 9 minutes on its final layer, not by reading
   the Dockerfile): the runner stage's `npm install prisma @prisma/client`
   had no lockfile and no version specifiers, meaning it installed whatever
   npm's "latest" happened to be on build day. Two builds of the exact same
   commit, days apart, could silently run different Prisma CLI versions
   against the same migration history — a direct violation of "deployment
   must be repeatable." First fix attempt (pinning exact versions via a
   Dockerfile `ARG`) looked right but wasn't: the very next build failed
   with `Cannot find module 'effect'` — a transitive dependency of
   `@prisma/config` (itself a `prisma` dependency, several levels down
   through `c12`) that a version-pinned but lockfile-less `npm install`
   still resolved inconsistently. The real fix: copy `bun.lock` into the
   runner stage too and run `bun install --frozen-lockfile --production` —
   the exact same lockfile the builder stage already resolved successfully,
   instead of a second, parallel, unreliable resolution path for just two
   named packages. Confirmed by re-running the full `docker build` after
   this change, not assumed from the reasoning alone.

Also fixed, found the same way as #3 (a slow, real `docker build`, not code
reading alone): `src/lib/auth/simple-session.ts` and `src/proxy.ts` both
throw at module-load time when `NEXTAUTH_SECRET` is unset in production —
correct behavior at actual runtime, but Next.js's build-time "collecting
page data" phase also sets `NODE_ENV=production` while importing every
route module, with no secrets injected yet (they're supplied later, at
container start). This meant `bun run build:webpack` inside the Dockerfile
had likely never actually completed successfully before this phase. Fixed
by excluding `NEXT_PHASE=phase-production-build` from the check — the
real-runtime guard is unweakened, verified by a full `docker build` that
now completes end-to-end.

## 3. Environment / Secrets — closing the drift

**Headline finding**: `.gitignore`'s blanket `.env*` pattern excluded every
`.env*.example` **template** file too, not just real `.env` files with real
secrets. `git log --all -- .env.example` confirms zero `.env*` file has ever
been committed to this repo, in its entire history — a fresh `git clone`
would have none of the files every deploy script and every doc (including
this one) tells you to `cp`. Fixed with a negation rule
(`!.env*.example`) — confirmed working: all four example files
(`.env.example`, `.env.production.example`, `.env.staging.example`,
`.env.test.example`) now show as trackable, not silently swallowed.


Cross-referenced every `${VAR}` `docker-compose.prod.yml` actually reads
against `.env.example`'s full variable list (`comm -23` on sorted names).
Found ~20 variables accumulated across Phases 10-15 — LLM providers (Groq/
Cerebras/OpenRouter/Mistral/HuggingFace), Qdrant, NOWPayments + platform
wallets, SMS, and every Phase 15 observability variable
(`LOG_LEVEL`/`ALERT_WEBHOOK_URL`/`METRICS_TOKEN`) — that had **never** been
wired into the production compose file. Every prior deployment using this
file ran with all of them silently off, not by any deliberate choice. All
now present.

`REDIS_PASSWORD` is newly required (`:?` hard-fail, no default) — Redis
previously had no authentication at all, relying solely on "no host port
published" as its only protection. New `DEPLOY_ENV` variable
(`getDeployEnv()`, `src/lib/config/env.ts`) tags every structured log line
`development`/`test`/`staging`/`production`, distinct from `NODE_ENV` (which
Next.js always reports as `production` for any production build, staging
included — there was previously no way to tell a staging alert from a real
one).

New `.env.staging.example` and `.env.test.example` (alongside the existing,
now-corrected `.env.production.example`) make the four-environment matrix
concrete rather than implied. `.env.staging.example` documents running the
*identical* `docker-compose.prod.yml`/Dockerfile as production (the actual
point of a staging environment) via the `-p expload-staging` project-name
flag for full container/volume isolation on a shared host.

## 4. Reverse Proxy / SSL — containerized

Caddy is now a real `docker-compose.prod.yml` service (`caddy:2-alpine`,
depends on `app`, reads `DOMAIN` for its automatic Let's Encrypt
certificate) rather than a script-installed host package. This was a
deliberate, larger architectural decision made because the previous
approach — `scripts/deploy-vps.sh` running `apt install caddy` and
generating `/etc/caddy/Caddyfile` via an SSH heredoc — sat outside the
`docker compose up` reproducibility story every other service already had,
directly conflicting with the explicit "deployment must be repeatable"
requirement. `Caddyfile` updated to proxy `app:3000` (was `localhost:3000`)
and to read `{$DOMAIN}` (Caddy's own env-substitution syntax) instead of a
hardcoded `example.com`.

**Direct consequence**: the app's host port binding (previously
`127.0.0.1:3000:3000`) was removed entirely — Caddy reaches it at `app:3000`
over the internal Docker network, so the app now has no host-facing port at
all. This is a strict security improvement, not just a simplification:
`src/lib/security/rate-limit.ts`'s `getClientId()` trusts `X-Forwarded-For`,
and that header is now structurally impossible to spoof from outside the
compose network, rather than merely discouraged by a loopback-only bind.

## 5. Database / Cache / Queue / Storage — standardized

- **Database**: Postgres, no host port (was already correct); real
  migrations now exist (§1).
- **Cache/Queue**: Redis, password-protected (§3), no host port; used for
  both the job queue and caching per existing `src/lib/queue/`/
  `src/lib/cache/` modules — unchanged code, only the compose-level auth
  gap closed.
- **Storage**: `storage_data` named volume for uploaded files (§2) — the
  single biggest standardization gap found (silent data loss on every
  redeploy, previously).

## 6. CI/CD (`.github/workflows/ci.yml`, `.github/workflows/rollback.yml`)

Phase 18 already built Lint/TypeCheck/Test/Build (`quality`/`build` jobs)
plus live API/security checks and E2E (`api-and-security-live`/`e2e`). This
phase added the remaining explicitly-requested stages:

- **Security Scan**: `bun audit` as a new `quality` job step. Found 76
  vulnerabilities on first run (42 high, 29 moderate, 5 low) — resolved 65
  via `bun audit fix` (mostly a `next` patch bump within the already-declared
  `^16.1.1` range), then manually bumped `next` to `16.3.4` and `sharp` to
  `0.35.4` (still within existing semver ranges) to clear the remaining
  `postcss`/libvips CVEs `audit fix` alone didn't reach, and removed two
  dependencies — `@mdxeditor/editor`, `react-syntax-highlighter` — that
  Phase 18's own `DEPENDENCY-AUDIT.md` had already confirmed were fully dead
  code with zero imports anywhere, which cleared the last `prismjs`/`js-yaml`
  findings. **Down to 2 remaining**, both transitive to Prisma's CLI-only
  `@prisma/config` (build/migrate-time tooling, never in the runtime
  `@prisma/client` bundle this app ships) with no fix available short of a
  Prisma 7.x major bump — explicitly `--ignore`d by GHSA ID in the CI step
  (not silenced globally), so any *new* advisory still fails the build.
  Full verification after every dependency change: typecheck clean, lint
  clean, all 84 tests pass, and a live `docker build` (see §2) completed
  successfully.
- **Schema drift gate**: `bun run db:schemas-in-sync` (§1) as a `quality`
  job step.
- **Artifact**: new `docker-image` job — builds the real production
  Dockerfile and pushes to `ghcr.io/adelakbaribiz-sketch/expload-marketing`,
  tagged by commit SHA (the rollback reference) and `latest`. Runs only on
  `main` pushes, only after every quality/build/live/e2e gate passes.
- **Deploy**: new `deploy` job — SSHes into a configured target host,
  checks out the built commit, runs `./scripts/deploy.sh` there (same
  source-build-on-host model the manual deploy scripts already use — see
  "What wasn't live-tested" below for why this doesn't yet pull the pushed
  Artifact instead). Gated behind a `production` GitHub Environment.
  **Deliberately no-ops, not fails, when `DEPLOY_SSH_HOST` isn't
  configured** — no real target host exists for this repo today in any
  environment this workflow runs in.
- **Health Check**: polls `/api/health/ready` (checks DB/Redis/SMTP
  reachability — see that route's own header comment for why it's the right
  endpoint for this, distinct from `/api/health/live`) after deploy, with
  retries; fails the job (pointing at the Rollback workflow) if the app
  never returns 200.
- **Rollback**: new `.github/workflows/rollback.yml`, `workflow_dispatch`
  with a commit-SHA input. Same SSH/checkout/health-check flow, targeting an
  arbitrary earlier commit instead of `HEAD`. Documented explicitly: this
  reverts application code only, not forward-applied database migrations —
  there is no auto-generated "down" migration (Prisma doesn't produce one),
  so rolling back across a migration boundary needs a compatibility check or
  a separate DB snapshot restore first.

Two more previously-undiscovered, never-actually-working bugs found while
reading the deploy scripts closely enough to wire them into CI:

- `deploy.sh` and `deploy-vps.sh` both called `npx tsx
  scripts/seed-distributor.ts` after every deploy. The runtime image never
  copies `scripts/` or installs `bun`/`tsx` (confirmed by re-reading the
  Dockerfile's runner stage) — this command had **always** failed, silently
  masked by a trailing `|| true`. Removed from both scripts (production
  shouldn't seed fake `example.com` demo data anyway).
- Both scripts also had `/home/z/my-project` hardcoded as their project
  root / rsync source — leftover scaffold boilerplate that never matched a
  real checkout of this repo. Now resolved from `$BASH_SOURCE` at run time,
  so either script works regardless of where the repo actually lives.
- `deploy.sh`'s health check curled `http://localhost:3000` on the **host**
  — broken by this same phase's own change (§4: the app no longer publishes
  any host port). Fixed to check from inside the `app` container instead.

## What was live-verified vs. what wasn't

**Live-verified in this sandbox**:
- `docker compose -f docker-compose.prod.yml config` (with an isolated env
  file, not the auto-loaded dev `.env`) — confirmed nested variable defaults
  resolve correctly, and every `:?`-required secret hard-fails with a clear
  message when unset.
- The built image was actually run (`docker run`), not just built: without
  `NEXTAUTH_SECRET`/`DATABASE_URL`, the container correctly refuses to start
  at all (Phase 15's `instrumentation.ts` → `logEnvStatus()` guard —
  confirmed still intact and unweakened by this phase's `NEXT_PHASE`
  build-time exception); with a real secret and an unreachable `DATABASE_URL`,
  it boots and `GET /api/health/ready` correctly returns `503` with
  `{"status":"not_ready","checks":{"database":{"ok":false},...}}` — graceful
  degradation, not a crash — with a properly structured, redaction-safe
  `db.error` log line on stdout.
- `caddy validate` (the real `caddy:2-alpine` image, not a syntax guess)
  against `Caddyfile` — confirmed valid.
- `scripts/seed.ts` — idempotent (verified twice: creates on first run,
  reports "already existed, skipped" on the second).
- `scripts/check-schema-sync.ts` — passes on real files, correctly fails
  (with the right diff) on an introduced drift.
- A full `docker build` of the production image — failed twice on real bugs
  (§2's `NEXTAUTH_SECRET` build-phase issue, then confirmed fixed), and
  succeeded end-to-end after all fixes landed.
- `bun run typecheck`, `bun run lint`, `bun test` (84/84 pass), all re-run
  after every dependency change in this phase.
- Both new GitHub Actions workflow files (`ci.yml` additions,
  `rollback.yml`) parse as valid YAML.

**Also live-verified — the full four-service stack, actually brought up**
(`docker compose -f docker-compose.prod.yml --env-file <isolated test env>
-p e2etest up -d`, a real Postgres/Redis/app/Caddy, not a config dry-run):

- A real `prisma migrate deploy --schema=prisma/schema.production.prisma`
  against a live, empty Postgres 15 container — applied cleanly, created
  **153 tables** (152 models + Prisma's own `_prisma_migrations`), matching
  the baseline migration's expected count exactly.
- `GET /api/health/ready` from inside the running `app` container returned
  `{"status":"ready","checks":{"database":{"ok":true},"redis":{"ok":true},...}}`
  — a real authenticated Redis connection (password-protected, per this
  phase's own fix) and a real Postgres connection, not mocks.
- **Two more real bugs found only by this live run**, neither visible from
  reading the Dockerfile: (1) Next.js's standalone `server.js` binds to
  `$HOSTNAME` if set, and Docker *always* auto-sets `HOSTNAME` to the
  container's own hostname — which resolves to the container's external
  network IP, not loopback. Left unset, the server listened only on that
  external IP, unreachable via `localhost`/`127.0.0.1` from inside the very
  same container. This meant the Dockerfile's own `HEALTHCHECK` and
  `scripts/deploy.sh`'s post-deploy check had both always silently failed —
  invisible in normal operation because Caddy's `reverse_proxy app:3000`
  resolves `app` via Docker DNS to that same external IP, so production
  traffic was never actually affected, only the container's self-check.
  Fixed: `ENV HOSTNAME="0.0.0.0"`. (2) Even after that fix, `wget
  http://localhost:3000/...` *still* failed — confirmed live that Alpine
  resolves "localhost" to `::1` first, and an IPv4-only `0.0.0.0` bind
  doesn't cover it. Fixed by using `127.0.0.1` explicitly (not `localhost`)
  in both the Dockerfile's `HEALTHCHECK` and `scripts/deploy.sh`. After both
  fixes, `docker compose ps` shows the app container genuinely
  `Up ... (healthy)` — Docker's own healthcheck passing, not just a manual
  curl from outside it.
- Caddy, brought up against the same stack with `DOMAIN=localhost.test` (a
  deliberately fake domain, since this sandbox has no real registered one):
  started cleanly, correctly read `DOMAIN` from the environment, and made a
  real ACME request to Let's Encrypt's production API — which correctly
  rejected `localhost.test` (`"Domain name does not end with a valid public
  suffix"`) and retried with backoff rather than crash-looping. This
  confirms the entire Caddy config/env-substitution/ACME pipeline is wired
  correctly; only a real, DNS-resolvable domain is needed for the
  certificate to actually issue.

**Not live-tested (no real target host exists in this sandbox)**:
- The `deploy`/`rollback` GitHub Actions jobs' SSH path — no real host, so
  these are config-reviewed and will no-op cleanly (verified by the
  `if: secrets.DEPLOY_SSH_HOST != ''` guards) rather than run for real.
- GHCR image push — requires actual GitHub Actions execution with real
  `GITHUB_TOKEN` permissions; the workflow syntax is correct but unexercised.

**Known, accepted limitation, not a bug**: the Deploy job rebuilds the image
from source on the target host (`./scripts/deploy.sh`'s existing model)
rather than pulling the image the Artifact job just pushed to GHCR. The
pushed image is a real registry artifact today — useful for traceability,
manual inspection, and vulnerability scanning of an exact historical build —
but isn't yet consumed by the deploy path itself. Moving to a registry-pull
deploy (faster rollback, no per-deploy rebuild) is a reasonable future step,
deferred rather than built now since it would need a `docker-compose.prod.yml`
image-vs-build overlay that couldn't be live-tested against a real registry
in this sandbox.

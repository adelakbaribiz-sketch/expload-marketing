# ============================================================================
# Multi-stage Dockerfile for Expload Marketing SaaS
# ============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app

# Install bun for faster dependency installation
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment to production for the build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client — against schema.production.prisma (postgresql),
# NOT the default schema.prisma (sqlite, dev-only). This image is only
# ever meant to run against Postgres in staging/production; generating
# the client from the sqlite schema here was a real, previously-unnoticed
# provider mismatch (Prisma Client's generated query engine is
# provider-specific) — found while implementing real migrations for
# Phase 19. See prisma/schema.production.prisma's own header comment for
# why two schema files exist at all.
RUN bunx prisma generate --schema=prisma/schema.production.prisma

# Build the Next.js app with webpack (not Turbopack)
RUN bun run build:webpack

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next.js's standalone server.js binds to $HOSTNAME if set, defaulting to
# "localhost" otherwise — but Docker itself always auto-sets HOSTNAME to the
# container's own hostname (e.g. "8a9ba48cb606"), which resolves to the
# container's external network IP, not loopback. Left unset, the server
# ends up listening ONLY on that external IP — unreachable via `localhost`
# or `127.0.0.1` from inside the very same container. Found and confirmed
# live (Phase 19, against a real docker-compose stack with a real Postgres):
# this HEALTHCHECK below, and scripts/deploy.sh's post-deploy check, had
# both always failed silently for this reason. Caddy's `reverse_proxy
# app:3000` still worked fine (Docker DNS resolves `app` to that same
# external IP), which is exactly why this went unnoticed for so long —
# production traffic was fine, only the container's own self-check never
# passed.
ENV HOSTNAME="0.0.0.0"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Pre-create the upload storage directory, owned by the non-root user this
# container runs as. Without this, docker-compose.prod.yml's storage_data
# volume mount creates its root as root:root on first use (Docker only
# inherits the image layer's ownership for a fresh named volume if the
# mount point already exists in the image) — the app would then get
# EACCES the first time it tried to write an uploaded file.
RUN mkdir -p /app/storage/private && chown -R nextjs:nodejs /app/storage

# Copy Prisma files for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Install the Prisma CLI for `prisma migrate deploy` at runtime, using the
# SAME frozen bun.lock the builder stage already resolved successfully
# (`bunx prisma generate` ran clean there) — not a fresh, standalone
# `npm install prisma@X @prisma/client@X`. That approach was tried first and
# found to be genuinely unreliable, not just imprecise: pinning exact
# versions still resolved a broken dependency subset one build later,
# failing with `Cannot find module 'effect'` (a transitive dependency of
# `@prisma/config`, itself a dependency of `prisma`, several levels down
# through `c12`) — npm's own on-the-fly resolution for two named packages,
# in a directory with no lockfile, isn't reliably reproducing the same
# dependency graph bun.lock already pins byte-for-byte. Repeatable
# deployment (Phase 19: "Deployment باید Repeatable باشد") needs the one
# lockfile this project actually trusts, not a second, parallel resolution
# path for just these two packages.
RUN npm install -g bun
COPY --chown=nextjs:nodejs package.json bun.lock ./
RUN bun install --frozen-lockfile --production && \
    npx prisma generate --schema=prisma/schema.production.prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check — 127.0.0.1, deliberately not `localhost`: Alpine resolves
# "localhost" to ::1 first, but HOSTNAME=0.0.0.0 above only binds the IPv4
# socket, so `wget http://localhost:3000` still fails with connection
# refused even after that fix. Confirmed live: 127.0.0.1 works, localhost
# doesn't, on the exact same running container.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start the app
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

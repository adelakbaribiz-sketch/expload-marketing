import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for Critical User Journeys (Phase 09). Runs against a
 * production build (`next build --webpack`, then the generated
 * `.next/standalone/server.js`) rather than the dev server: dev mode's
 * webpack HMR does a full `location.reload()` whenever a `next/dynamic`
 * chunk (re)compiles, which repeatedly reset React state mid-test and
 * proved impossible to wait out reliably (confirmed while writing these
 * tests). That reload doesn't happen in a production build. The
 * standalone output's relative SQLite path resolves against
 * `.next/standalone/`, not the project root, so `prisma/db/` must be
 * copied there too — see `scripts/e2e-build.sh`.
 */
export default defineConfig({
  testDir: './e2e',
  // Generous: the dev server (not a production build — see below) compiles
  // each route/chunk on first hit, and a dev-mode HMR reload (see gotoView
  // in the spec) can chain several of those cold compiles back to back.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Build first with `bun run e2e:build` (next build --webpack + copying
    // static/public/prisma-db into .next/standalone/ — see package.json).
    command: 'node .next/standalone/server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})

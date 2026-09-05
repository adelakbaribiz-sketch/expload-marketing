import { test, expect, type Page } from '@playwright/test'
import { db } from '../src/lib/db'

/**
 * E2E tests for Critical User Journeys (Phase 09), run against a real
 * production build per this project's established live-verification
 * discipline — not mocked. Journeys run serially in ONE browser session
 * (one signup) rather than each creating its own account: `/api/auth/login`
 * and `/api/auth/signup` share the same `auth` rate-limit bucket (5 req/min,
 * see src/lib/security/rate-limit.ts), and 3 independent signup+login pairs
 * blow through that budget in a single test run (confirmed while writing
 * this test — a real 429 rate_limited response, not a fluke). One signup
 * for the whole suite keeps this at 2 auth-tier calls total.
 *
 * Deliberately run against `.next/standalone/server.js` (`bun run
 * e2e:build` first), not the dev server: dev mode's webpack HMR does a
 * full `location.reload()` whenever a `next/dynamic` chunk (re)compiles,
 * which repeatedly reset React state mid-test and proved impossible to
 * wait out reliably. That reload doesn't happen in a production build.
 */

const runId = Date.now()
const email = `e2e-${runId}@example.com`
const password = 'TestPass123!'
const name = 'E2E Tester'
const orgName = `E2E Test Org ${runId}`
const domain = `e2e-${runId}.test`
const dealTitle = `E2E Test Deal ${runId}`

test.describe.serial('Critical User Journeys', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await page.close()
    // Clean up everything this run created — no test data left in the DB.
    const tenant = await db.tenant.findUnique({ where: { domain } })
    if (tenant) {
      await db.deal.deleteMany({ where: { tenantId: tenant.id } })
      await db.user.deleteMany({ where: { tenantId: tenant.id } })
      await db.tenant.delete({ where: { id: tenant.id } })
    }
  })

  test('signup creates an account and reaches the dashboard', async () => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Get Started Free' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Get Started Free' }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByPlaceholder('John Doe').fill(name)
    await dialog.getByPlaceholder('you@company.com').fill(email)
    await dialog.getByPlaceholder('••••••••').fill(password)
    await dialog.getByPlaceholder('Acme Inc').fill(orgName)
    await dialog.getByPlaceholder('acme.com').fill(domain)
    await dialog.getByRole('button', { name: 'Create Account' }).click()

    // Signup logs in, then does `setTimeout(() => location.reload(), 500)`
    // (see auth-modal.tsx) to enter the fully-configured dashboard — wait
    // for that actual reload's `load` event, not just the pre-reload SPA
    // state, since this call starts before the 500ms timer fires.
    await page.waitForLoadState('load', { timeout: 20_000 })
    await expect(page.getByRole('contentinfo').getByText(email)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'CRM Pipeline' })).toBeVisible()
  })

  test('create and view a CRM deal', async () => {
    const crmNav = page.getByRole('button', { name: 'CRM Pipeline' })
    const crmHeading = page.getByRole('heading', { name: 'CRM Pipeline' })
    await crmNav.click()
    try {
      await expect(crmHeading).toBeVisible({ timeout: 5_000 })
    } catch {
      // Occasional first-click miss on this sidebar button in this
      // environment; a second click reliably lands.
      await crmNav.click()
      await expect(crmHeading).toBeVisible()
    }

    const newDealButton = page.getByRole('button', { name: 'New Deal' })
    const dialog = page.getByRole('dialog')
    await newDealButton.click()
    try {
      await expect(dialog).toBeVisible({ timeout: 5_000 })
    } catch {
      await newDealButton.click()
      await expect(dialog).toBeVisible()
    }
    await dialog.getByPlaceholder('Enterprise subscription').fill(dealTitle)
    const createButton = dialog.getByRole('button', { name: 'Create', exact: true })
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/crm/deals') && r.request().method() === 'POST', { timeout: 10_000 }).catch(() => null),
      createButton.click(),
    ])
    if (!response) {
      console.log('no POST /api/crm/deals observed within 10s of clicking Create')
    } else if (!response.ok()) {
      console.log(`create deal failed: ${response.status()} ${await response.text()}`)
    }

    await expect(page.getByText(dealTitle)).toBeVisible({ timeout: 10_000 })
  })

  test('logout returns to the landing page', async () => {
    // The sidebar footer (user menu trigger) can end up below the fold
    // after the CRM view's content pushed the page's own scroll position
    // down in the previous test — bring it into view explicitly first.
    const userMenuTrigger = page.getByRole('button', { name: new RegExp(name) })
    await userMenuTrigger.scrollIntoViewIfNeeded()
    await userMenuTrigger.click()
    await page.getByText('Sign out').click()

    await expect(page.getByRole('button', { name: 'Get Started Free' }).first()).toBeVisible({ timeout: 10_000 })
  })
})

/**
 * Environment variable validation.
 *
 * Runs at server startup to fail fast if required production variables
 * are missing or misconfigured. In development, missing optional vars
 * fall back to safe defaults.
 */

import { isSmtpConfigured } from '@/lib/email/service'

export interface EnvStatus {
  ok: boolean
  errors: string[]
  warnings: string[]
  config: {
    nodeEnv: string
    database: {
      provider: 'sqlite' | 'postgresql'
      url: string // masked
    }
    redis: {
      configured: boolean
      url: string // masked
    }
    smtp: {
      configured: boolean
      host: string
      port: number
    }
    serper: {
      configured: boolean
    }
    nextauth: {
      secretSet: boolean
      url: string
    }
    siem: {
      webhookUrl: boolean
    }
    playwright: {
      enabled: boolean
      extractReviews: boolean
    }
    observability: {
      logLevel: string
      alertWebhookConfigured: boolean
      metricsEnabled: boolean
    }
  }
}

/** Mask sensitive strings, showing only first/last 4 chars. */
function mask(s: string | undefined, showLength = 4): string {
  if (!s) return '(not set)'
  if (s.length <= showLength * 2) return '*'.repeat(s.length)
  return `${s.slice(0, showLength)}…${s.slice(-showLength)}`
}

/** Detect the database provider from the DATABASE_URL. */
function getDbProvider(): 'sqlite' | 'postgresql' {
  const url = process.env.DATABASE_URL ?? ''
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'postgresql'
  return 'sqlite'
}

/** Validate environment variables. Returns the status + any errors/warnings. */
export function validateEnv(): EnvStatus {
  const errors: string[] = []
  const warnings: string[] = []
  const isProd = process.env.NODE_ENV === 'production'

  // Required in production
  if (isProd) {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production')
    }
    if (!process.env.NEXTAUTH_SECRET) {
      errors.push('NEXTAUTH_SECRET is required in production (use: openssl rand -base64 32)')
    }
    if (!process.env.NEXTAUTH_URL) {
      warnings.push('NEXTAUTH_URL should be set in production (e.g. https://yourapp.com)')
    }
    if (getDbProvider() === 'sqlite') {
      warnings.push('SQLite is not recommended for production. Use PostgreSQL.')
    }
    if (!isSmtpConfigured()) {
      warnings.push('SMTP not configured — email campaigns will only log to console.')
    }
    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL not set — using in-memory queue (not suitable for multi-instance).')
    }
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    if (dbUrl.startsWith('file:')) {
      // SQLite — ok for dev
    } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      // PostgreSQL — ok
    } else {
      errors.push(`DATABASE_URL has unsupported scheme: ${dbUrl.split(':')[0]}`)
    }
  }

  // Validate NEXTAUTH_SECRET length
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && secret.length < 32) {
    warnings.push('NEXTAUTH_SECRET should be at least 32 characters for security.')
  }

  // Validate SMTP_PORT
  const smtpPort = process.env.SMTP_PORT
  if (smtpPort) {
    const port = Number(smtpPort)
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`SMTP_PORT must be a valid port number (1-65535), got: ${smtpPort}`)
    }
  }

  // Validate REDIS_URL format
  const redisUrl = process.env.REDIS_URL
  if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    errors.push(`REDIS_URL must start with redis:// or rediss://, got: ${redisUrl.split(':')[0]}://`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    config: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      database: {
        provider: getDbProvider(),
        url: mask(dbUrl),
      },
      redis: {
        configured: !!redisUrl,
        url: mask(redisUrl),
      },
      smtp: {
        configured: isSmtpConfigured(),
        host: process.env.SMTP_HOST ?? '(not set)',
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      },
      serper: {
        configured: !!process.env.SERPER_API_KEY,
      },
      nextauth: {
        secretSet: !!process.env.NEXTAUTH_SECRET,
        url: process.env.NEXTAUTH_URL ?? '(not set)',
      },
      siem: {
        webhookUrl: !!process.env.SIEM_WEBHOOK_URL,
      },
      playwright: {
        enabled: process.env.PLAYWRIGHT_ENABLED === 'true',
        extractReviews: process.env.PLAYWRIGHT_EXTRACT_REVIEWS === 'true',
      },
      observability: {
        logLevel: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
        alertWebhookConfigured: !!process.env.ALERT_WEBHOOK_URL,
        metricsEnabled: !!process.env.METRICS_TOKEN,
      },
    },
  }
}

/** Log environment status at startup. */
export function logEnvStatus(): void {
  const status = validateEnv()
  console.log('\n=== Environment Status ===')
  console.log(`Node Env:     ${status.config.nodeEnv}`)
  console.log(`Database:     ${status.config.database.provider} (${status.config.database.url})`)
  console.log(`Redis:        ${status.config.redis.configured ? 'configured' : 'not set (in-memory queue)'} (${status.config.redis.url})`)
  console.log(`SMTP:         ${status.config.smtp.configured ? 'configured' : 'not set (console mode)'} (${status.config.smtp.host}:${status.config.smtp.port})`)
  console.log(`Serper API:   ${status.config.serper.configured ? 'configured' : 'not set (mock mode)'}`)
  console.log(`NextAuth:     secret=${status.config.nextauth.secretSet ? 'set' : 'NOT SET'}, url=${status.config.nextauth.url}`)
  console.log(`Playwright:   ${status.config.playwright.enabled ? 'enabled' : 'disabled'}`)
  console.log(`SIEM:         ${status.config.siem.webhookUrl ? 'configured' : 'not set'}`)
  console.log(`Log level:    ${status.config.observability.logLevel}`)
  console.log(`Alerts:       ${status.config.observability.alertWebhookConfigured ? 'configured' : 'not set (logged locally only)'}`)
  console.log(`Metrics:      ${status.config.observability.metricsEnabled ? '/api/metrics enabled' : 'not set (METRICS_TOKEN unset — /api/metrics disabled)'}`)

  if (status.warnings.length > 0) {
    console.log('\n⚠ Warnings:')
    status.warnings.forEach((w) => console.log(`  - ${w}`))
  }

  if (status.errors.length > 0) {
    console.log('\n✗ Errors:')
    status.errors.forEach((e) => console.log(`  - ${e}`))
    if (process.env.NODE_ENV === 'production') {
      console.log('\n🚫 Refusing to start in production with errors.')
      process.exit(1)
    }
  }
  console.log('=========================\n')
}

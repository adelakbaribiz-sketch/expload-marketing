import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { llmAggregator } from '@/lib/llm/aggregator'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()

  if (req.method === 'GET') {
    // List configured providers + their strategies
    const providers = llmAggregator.listProviders()
    const configs = await db.llmProviderConfig.findMany()
    const configMap = new Map(configs.map(c => [c.provider, c]))

    return NextResponse.json({
      providers: providers.map(p => {
        const cfg = configMap.get(p.id)
        return {
          id: p.id,
          displayName: p.displayName,
          defaultModel: p.defaultModel,
          models: p.models,
          isFreeTier: p.isFreeTier,
          // Status
          hasApiKey: Boolean(process.env[`${p.id.toUpperCase()}_API_KEY`]),
          isActive: cfg?.isActive ?? true,
          priority: cfg?.priority ?? 100,
          // Quota
          dailyTokenLimit: cfg?.dailyTokenLimit ?? 1000000,
          monthlyTokenLimit: cfg?.monthlyTokenLimit ?? 10000000,
          requestsPerMinute: cfg?.requestsPerMinute ?? 60,
          cooldownMinutes: cfg?.cooldownMinutes ?? 5,
          lastFailedAt: cfg?.lastFailedAt ?? null,
          failureCount: cfg?.failureCount ?? 0,
        }
      }),
    })
  }

  if (req.method === 'POST') {
    // Initialize provider config (idempotent)
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const provider = llmAggregator.findProvider(body.provider)
    if (!provider) return NextResponse.json({ error: 'unknown_provider' }, { status: 400 })

    const config = await db.llmProviderConfig.upsert({
      where: { provider: body.provider },
      update: {
        displayName: body.displayName ?? provider.displayName,
        apiBaseUrl: body.apiBaseUrl ?? '',
        apiKey: body.apiKey, // app should encrypt before persisting in production
        isFreeTier: body.isFreeTier ?? true,
        dailyTokenLimit: body.dailyTokenLimit ?? 1000000,
        monthlyTokenLimit: body.monthlyTokenLimit ?? 10000000,
        requestsPerMinute: body.requestsPerMinute ?? 60,
        isActive: body.isActive ?? true,
        priority: body.priority ?? 100,
        cooldownMinutes: body.cooldownMinutes ?? 5,
      },
      create: {
        provider: body.provider,
        displayName: body.displayName ?? provider.displayName,
        apiBaseUrl: body.apiBaseUrl ?? '',
        apiKey: body.apiKey,
        models: JSON.stringify(provider.models),
        isFreeTier: body.isFreeTier ?? true,
        dailyTokenLimit: body.dailyTokenLimit ?? 1000000,
        monthlyTokenLimit: body.monthlyTokenLimit ?? 10000000,
        requestsPerMinute: body.requestsPerMinute ?? 60,
        isActive: body.isActive ?? true,
        priority: body.priority ?? 100,
        cooldownMinutes: body.cooldownMinutes ?? 5,
      },
    })

    // If API key provided, set as env var for current process
    if (body.apiKey) process.env[`${body.provider.toUpperCase()}_API_KEY`] = body.apiKey

    return NextResponse.json({ config }, { status: 201 })
  }

  if (req.method === 'DELETE') {
    // Reset a provider's stored config back to defaults (providers themselves
    // are a fixed, hardcoded list in the aggregator — this clears the DB
    // override, not the provider's availability).
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider')
    if (!provider) return NextResponse.json({ error: 'provider query param required' }, { status: 400 })
    await db.llmProviderConfig.deleteMany({ where: { provider } })
    delete process.env[`${provider.toUpperCase()}_API_KEY`]
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const DELETE = withProtection(handler, { rateLimit: 'write' })

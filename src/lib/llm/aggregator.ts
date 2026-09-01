/**
 * LLM Aggregator — the central orchestrator.
 *
 * Responsibilities:
 *  - Hold a priority-ordered list of provider strategies.
 *  - Auto-fallback: if a provider returns RateLimitError/AuthError/ProviderError,
 *    transparently retry the next active provider.
 *  - Daily/monthly token quota tracking per provider (persisted in DB).
 *  - Emit notification events on provider switch, quota warning, quota exceeded.
 *  - Persist every usage record for audit & analytics.
 *
 * Design Pattern: Strategy + Chain of Responsibility (fallback chain).
 *
 * Usage (server-only):
 *   import { llmAggregator } from '@/lib/llm/aggregator'
 *   const response = await llmAggregator.complete({
 *     messages: [{ role: 'user', content: 'Hello' }],
 *     sessionType: 'negotiation',
 *     tenantId,
 *   })
 */

import 'server-only'
import { db } from '@/lib/db'
import { LlmProviderStrategy, LlmRequest, LlmResponse } from './types'
import { OpenRouterProvider, RateLimitError, AuthError, ProviderError } from './providers/openrouter'
import { GroqProvider } from './providers/groq'
import { CerebrasProvider } from './providers/cerebras'
import { MistralProvider } from './providers/mistral'
import { HuggingFaceProvider } from './providers/huggingface'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

const QUOTA_WARNING_PERCENT = 80 // emit warning at 80% of daily limit

class LlmAggregator {
  private providers: LlmProviderStrategy[]
  /** Provider IDs currently in cooldown (rate-limited). Map: providerId → resumeAt timestamp. */
  private cooldowns: Map<string, number> = new Map()
  /** Last successfully used provider (preference for next call). */
  private lastSuccessful: string | null = null

  constructor() {
    // Priority order — Groq is fastest, then Cerebras, OpenRouter (most models), Mistral, HuggingFace
    this.providers = [
      new GroqProvider(),
      new CerebrasProvider(),
      new OpenRouterProvider(),
      new MistralProvider(),
      new HuggingFaceProvider(),
    ]
  }

  /** Get all registered providers (for UI listing). */
  listProviders(): LlmProviderStrategy[] { return this.providers }

  /** Get the active provider for a given model (or null). */
  findProvider(providerId: string): LlmProviderStrategy | undefined {
    return this.providers.find(p => p.id === providerId)
  }

  /** Main entry point — auto-fallback across providers. */
  async complete(req: LlmRequest): Promise<LlmResponse> {
    // 1. Build candidate list: last successful first, then others by priority
    const candidates = this.getActiveCandidates()
    if (candidates.length === 0) {
      await emitNotificationEvent({
        type: 'llm_error',
        title: 'All LLM providers unavailable',
        message: 'No active LLM provider could serve the request. Check API keys in Settings → LLM Providers.',
        severity: 'critical',
        tenantId: req.tenantId,
        category: 'llm',
      })
      throw new Error('No active LLM provider available')
    }

    let lastError: Error | null = null
    for (const provider of candidates) {
      // 2. Check daily quota before calling
      const quotaCheck = await this.checkQuota(provider.id, req.tenantId)
      if (!quotaCheck.allowed) {
        await this.recordAudit(provider.id, 'quota_exceeded', `Provider ${provider.id} daily quota exceeded (${quotaCheck.usedToday}/${quotaCheck.dailyLimit})`, req.tenantId)
        continue
      }
      // 3. Warn at 80% usage
      if (quotaCheck.percentUsed >= QUOTA_WARNING_PERCENT && !quotaCheck.warned) {
        await emitNotificationEvent({
          type: 'llm_quota_warning',
          title: `${provider.displayName} approaching daily quota`,
          message: `${quotaCheck.percentUsed}% of daily token budget used (${quotaCheck.usedToday}/${quotaCheck.dailyLimit}). Will switch providers soon.`,
          severity: 'warning',
          tenantId: req.tenantId,
          category: 'llm',
          metadata: { provider: provider.id, usedToday: quotaCheck.usedToday, dailyLimit: quotaCheck.dailyLimit },
        })
      }

      // 4. Try the call
      try {
        // Load API key from DB if user has configured one; otherwise env
        const apiKey = await this.loadApiKey(provider.id, req.tenantId)
        const response = await provider.complete(req, apiKey)

        // 5. Success — record usage & remember provider
        await this.recordUsage(provider, response, req, 'success')
        this.lastSuccessful = provider.id

        // 6. If we just recovered from a fallback, emit "back to normal" notification
        if (candidates[0].id !== provider.id) {
          await emitNotificationEvent({
            type: 'llm_provider_recovered',
            title: 'Switched LLM provider',
            message: `Using ${provider.displayName} as primary provider recovered.`,
            severity: 'info',
            tenantId: req.tenantId,
            category: 'llm',
            metadata: { provider: provider.id },
          })
        }
        return response
      } catch (err) {
        lastError = err as Error
        const isRateLimit = err instanceof RateLimitError
        const isAuth = err instanceof AuthError
        const isProvider = err instanceof ProviderError

        // Record failed usage
        await this.recordUsage(provider, { provider: provider.id, model: req.model ?? provider.defaultModel, text: '', inputTokens: 0, outputTokens: 0, totalTokens: 0, latencyMs: 0, costUsd: 0 }, req, isRateLimit ? 'rate_limited' : 'error', (err as Error).message)

        // Set cooldown for rate-limited providers
        if (isRateLimit) {
          const cooldownMs = 5 * 60 * 1000 // 5 min
          this.cooldowns.set(provider.id, Date.now() + cooldownMs)
          await this.recordAudit(provider.id, 'rate_limited', `Rate limited; cooldown ${cooldownMs / 60000}min`, req.tenantId)
        }

        // Emit "switching" notification (only on first failure of this chain)
        if (provider === candidates[0]) {
          await emitNotificationEvent({
            type: 'llm_provider_switched',
            title: `Switching LLM provider`,
            message: `${provider.displayName} unavailable (${isRateLimit ? 'rate limited' : isAuth ? 'auth error' : 'error'}). Trying next provider.`,
            severity: 'warning',
            tenantId: req.tenantId,
            category: 'llm',
            metadata: { fromProvider: provider.id, reason: (err as Error).name },
          })
        }
        // Continue to next provider
        continue
      }
    }

    // All providers exhausted
    await emitNotificationEvent({
      type: 'llm_all_failed',
      title: 'All LLM providers failed',
      message: `Could not complete request: ${lastError?.message ?? 'unknown error'}. Please try again later.`,
      severity: 'critical',
      tenantId: req.tenantId,
      category: 'llm',
    })
    throw new Error(`All LLM providers failed: ${lastError?.message ?? 'unknown error'}`)
  }

  /** Get providers that are not in cooldown. */
  private getActiveCandidates(): LlmProviderStrategy[] {
    const now = Date.now()
    // Clean expired cooldowns
    for (const [k, v] of this.cooldowns.entries()) {
      if (v < now) this.cooldowns.delete(k)
    }
    const active = this.providers.filter(p => !this.cooldowns.has(p.id))
    // Prefer lastSuccessful first
    if (this.lastSuccessful) {
      const last = active.find(p => p.id === this.lastSuccessful)
      if (last) return [last, ...active.filter(p => p.id !== this.lastSuccessful)]
    }
    return active
  }

  /** Check if provider has remaining daily quota. */
  private async checkQuota(providerId: string, _tenantId?: string) {
    const config = await db.llmProviderConfig.findUnique({ where: { provider: providerId } })
    const dailyLimit = config?.dailyTokenLimit ?? 1000000
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const usage = await db.llmUsageRecord.aggregate({
      where: { provider: providerId, createdAt: { gte: startOfDay }, status: 'success' },
      _sum: { totalTokens: true },
    })
    const usedToday = usage._sum.totalTokens ?? 0
    const percentUsed = Math.round((usedToday / dailyLimit) * 100)

    // Check if we already warned today
    const warned = await db.llmAuditEvent.findFirst({
      where: { provider: providerId, eventType: 'quota_warning', createdAt: { gte: startOfDay } },
    })

    return {
      allowed: usedToday < dailyLimit,
      usedToday,
      dailyLimit,
      percentUsed,
      warned: Boolean(warned),
    }
  }

  /** Load API key — prefer DB (per-tenant) over env. */
  private async loadApiKey(providerId: string, tenantId?: string): Promise<string | undefined> {
    if (tenantId) {
      // Future: per-tenant provider keys (TenantLlmKey model)
      // For now, all tenants share platform-level env keys.
    }
    const envKey = process.env[`${providerId.toUpperCase()}_API_KEY`]
    return envKey || undefined
  }

  /** Persist usage record. */
  private async recordUsage(
    provider: LlmProviderStrategy,
    resp: LlmResponse,
    req: LlmRequest,
    status: 'success' | 'rate_limited' | 'error' | 'timeout',
    errorMessage?: string,
  ) {
    try {
      const config = await db.llmProviderConfig.findUnique({ where: { provider: provider.id } })
      await db.llmUsageRecord.create({
        data: {
          providerConfigId: config?.id ?? 'unknown',
          provider: provider.id,
          model: resp.model,
          inputTokens: resp.inputTokens,
          outputTokens: resp.outputTokens,
          totalTokens: resp.totalTokens,
          costUsd: resp.costUsd,
          requestType: req.sessionType ?? 'chat',
          tenantId: req.tenantId,
          sessionType: req.sessionType,
          sessionId: req.sessionId,
          status,
          errorMessage,
          latencyMs: resp.latencyMs,
        },
      })
    } catch (e) {
      console.error('Failed to record LLM usage:', e)
    }
  }

  /** Persist audit event. */
  private async recordAudit(provider: string, eventType: string, message: string, _tenantId?: string, metadata?: any) {
    try {
      const config = await db.llmProviderConfig.findUnique({ where: { provider } })
      await db.llmAuditEvent.create({
        data: {
          providerConfigId: config?.id ?? 'unknown',
          provider, eventType, message,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      })
    } catch (e) {
      console.error('Failed to record LLM audit:', e)
    }
  }
}

/** Singleton aggregator instance. */
export const llmAggregator = new LlmAggregator()

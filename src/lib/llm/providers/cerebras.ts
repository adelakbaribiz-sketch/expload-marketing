/**
 * Cerebras Provider Strategy.
 * Cerebras offers free, ultra-fast inference (Llama 3.1 on Wafer-Scale Engine).
 *
 * Docs: https://inference-docs.cerebras.ai/
 * Env: CEREBRAS_API_KEY (free at https://cloud.cerebras.ai/)
 */

import { LlmProviderStrategy, LlmRequest, LlmResponse, ProviderModel, estimateTokens } from '../types'
import { RateLimitError, AuthError, ProviderError } from './openrouter'
import { withTimeout } from '@/lib/integrations/types'

const BASE_URL = 'https://api.cerebras.ai/v1'
// See groq.ts for why this exists — no provider had a completion timeout
// before this phase (RELIABILITY-AUDIT.md).
const COMPLETION_TIMEOUT_MS = 20_000

const MODELS: ProviderModel[] = [
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', contextWindow: 131072, isFree: true },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', contextWindow: 131072, isFree: true },
]

export class CerebrasProvider implements LlmProviderStrategy {
  readonly id = 'cerebras'
  readonly displayName = 'Cerebras'
  readonly defaultModel = 'llama-3.3-70b'
  readonly models = MODELS
  readonly isFreeTier = true

  async healthCheck(): Promise<boolean> {
    const key = process.env.CEREBRAS_API_KEY
    if (!key) return false
    try {
      const res = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } })
      return res.ok
    } catch { return false }
  }

  async complete(req: LlmRequest, apiKey?: string): Promise<LlmResponse> {
    const key = apiKey ?? process.env.CEREBRAS_API_KEY
    if (!key) throw new AuthError('CEREBRAS_API_KEY not set')
    const start = Date.now()
    const model = req.model ?? this.defaultModel
    const res = await withTimeout(
      fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model, messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 2048,
        }),
      }),
      COMPLETION_TIMEOUT_MS,
      'cerebras',
    )
    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 429) throw new RateLimitError(`Cerebras rate-limited`)
      if (res.status === 401) throw new AuthError(`Cerebras auth failed`)
      throw new ProviderError(`Cerebras ${res.status}: ${errText}`)
    }
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    const usage = data.usage ?? {}
    return {
      text, provider: this.id, model,
      inputTokens: usage.prompt_tokens ?? estimateTokens(req.messages.map(m => m.content).join('')),
      outputTokens: usage.completion_tokens ?? estimateTokens(text),
      totalTokens: usage.total_tokens ?? 0,
      latencyMs: Date.now() - start, costUsd: 0,
    }
  }
  estimateTokens(text: string): number { return estimateTokens(text) }
}

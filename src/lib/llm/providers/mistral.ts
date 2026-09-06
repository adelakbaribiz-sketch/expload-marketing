/**
 * Mistral Provider Strategy.
 * Mistral AI's La Plateforme — offers free tier with rate limits.
 *
 * Docs: https://docs.mistral.ai/
 * Env: MISTRAL_API_KEY (free at https://console.mistral.ai/)
 */

import { LlmProviderStrategy, LlmRequest, LlmResponse, ProviderModel, estimateTokens } from '../types'
import { RateLimitError, AuthError, ProviderError } from './openrouter'
import { withTimeout } from '@/lib/integrations/types'

const BASE_URL = 'https://api.mistral.ai/v1'
// See groq.ts for why this exists (RELIABILITY-AUDIT.md).
const COMPLETION_TIMEOUT_MS = 20_000

const MODELS: ProviderModel[] = [
  { id: 'mistral-small-latest', name: 'Mistral Small', contextWindow: 32768, isFree: true },
  { id: 'mistral-large-latest', name: 'Mistral Large', contextWindow: 32768, isFree: false },
  { id: 'open-mistral-7b', name: 'Open Mistral 7B', contextWindow: 32768, isFree: true },
  { id: 'open-mixtral-8x7b', name: 'Open Mixtral 8x7B', contextWindow: 32768, isFree: true },
  { id: 'open-mixtral-8x22b', name: 'Open Mixtral 8x22B', contextWindow: 65536, isFree: true },
]

export class MistralProvider implements LlmProviderStrategy {
  readonly id = 'mistral'
  readonly displayName = 'Mistral AI'
  readonly defaultModel = 'open-mistral-7b'
  readonly models = MODELS
  readonly isFreeTier = true

  async healthCheck(): Promise<boolean> {
    const key = process.env.MISTRAL_API_KEY
    if (!key) return false
    try {
      const res = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } })
      return res.ok
    } catch { return false }
  }

  async complete(req: LlmRequest, apiKey?: string): Promise<LlmResponse> {
    const key = apiKey ?? process.env.MISTRAL_API_KEY
    if (!key) throw new AuthError('MISTRAL_API_KEY not set')
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
      'mistral',
    )
    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 429) throw new RateLimitError(`Mistral rate-limited`)
      if (res.status === 401) throw new AuthError(`Mistral auth failed`)
      throw new ProviderError(`Mistral ${res.status}: ${errText}`)
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

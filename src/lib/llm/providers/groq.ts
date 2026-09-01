/**
 * Groq Provider Strategy.
 * Groq offers ultra-fast inference on Llama, Mixtral, Gemma models — all free.
 *
 * Docs: https://console.groq.com/docs
 * Env: GROQ_API_KEY (free at https://console.groq.com/keys)
 */

import { LlmProviderStrategy, LlmRequest, LlmResponse, ProviderModel, estimateTokens } from '../types'
import { RateLimitError, AuthError, ProviderError } from './openrouter'

const BASE_URL = 'https://api.groq.com/openai/v1'

const MODELS: ProviderModel[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', contextWindow: 131072, isFree: true },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', contextWindow: 131072, isFree: true },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, isFree: true },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, isFree: true },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', contextWindow: 131072, isFree: true },
]

export class GroqProvider implements LlmProviderStrategy {
  readonly id = 'groq'
  readonly displayName = 'Groq'
  readonly defaultModel = 'llama-3.3-70b-versatile'
  readonly models = MODELS
  readonly isFreeTier = true

  async healthCheck(): Promise<boolean> {
    const key = process.env.GROQ_API_KEY
    if (!key) return false
    try {
      const res = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } })
      return res.ok
    } catch { return false }
  }

  async complete(req: LlmRequest, apiKey?: string): Promise<LlmResponse> {
    const key = apiKey ?? process.env.GROQ_API_KEY
    if (!key) throw new AuthError('GROQ_API_KEY not set')
    const start = Date.now()
    const model = req.model ?? this.defaultModel
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 429) throw new RateLimitError(`Groq rate-limited`)
      if (res.status === 401) throw new AuthError(`Groq auth failed`)
      throw new ProviderError(`Groq ${res.status}: ${errText}`)
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

/**
 * OpenRouter Provider Strategy.
 * OpenRouter aggregates many models and exposes an OpenAI-compatible API.
 * Many models are free (`:free` suffix).
 *
 * Docs: https://openrouter.ai/docs
 * Env: OPENROUTER_API_KEY (optional — free models work without it at lower limits).
 */

import { LlmProviderStrategy, LlmRequest, LlmResponse, ProviderModel, estimateTokens } from '../types'

const BASE_URL = 'https://openrouter.ai/api/v1'

const MODELS: ProviderModel[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', contextWindow: 65536, isFree: true },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', contextWindow: 65536, isFree: true },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', contextWindow: 32768, isFree: true },
  { id: 'mistralai/mistral-nemo:free', name: 'Mistral Nemo (Free)', contextWindow: 131072, isFree: true },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', contextWindow: 8192, isFree: true },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)', contextWindow: 32768, isFree: true },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', contextWindow: 65536, isFree: true },
  { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek Chat (Free)', contextWindow: 65536, isFree: true },
]

export class OpenRouterProvider implements LlmProviderStrategy {
  readonly id = 'openrouter'
  readonly displayName = 'OpenRouter'
  readonly defaultModel = 'meta-llama/llama-3.3-70b-instruct:free'
  readonly models = MODELS
  readonly isFreeTier = true

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/models`, { headers: this.headers(process.env.OPENROUTER_API_KEY) })
      return res.ok
    } catch { return false }
  }

  async complete(req: LlmRequest, apiKey?: string): Promise<LlmResponse> {
    const key = apiKey ?? process.env.OPENROUTER_API_KEY
    const start = Date.now()
    const model = req.model ?? this.defaultModel
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers(key),
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 429) throw new RateLimitError(`OpenRouter rate-limited`)
      if (res.status === 401) throw new AuthError(`OpenRouter auth failed`)
      throw new ProviderError(`OpenRouter ${res.status}: ${errText}`)
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

  private headers(apiKey?: string): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`
    h['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL ?? 'https://expload.io'
    h['X-Title'] = 'Autonomous Marketing SaaS'
    return h
  }
}

export class RateLimitError extends Error { constructor(msg: string) { super(msg); this.name = 'RateLimitError' } }
export class AuthError extends Error { constructor(msg: string) { super(msg); this.name = 'AuthError' } }
export class ProviderError extends Error { constructor(msg: string) { super(msg); this.name = 'ProviderError' } }

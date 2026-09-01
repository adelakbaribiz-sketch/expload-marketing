/**
 * HuggingFace Inference Provider Strategy.
 * HuggingFace offers free serverless inference on many open models.
 *
 * Docs: https://huggingface.co/docs/api-inference/
 * Env: HUGGINGFACE_API_KEY (free at https://huggingface.co/settings/tokens)
 */

import { LlmProviderStrategy, LlmRequest, LlmResponse, ProviderModel, estimateTokens } from '../types'
import { RateLimitError, AuthError, ProviderError } from './openrouter'

const BASE_URL = 'https://api-inference.huggingface.co/models'

const MODELS: ProviderModel[] = [
  { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B', contextWindow: 131072, isFree: true },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B v0.3', contextWindow: 32768, isFree: true },
  { id: 'meta-llama/Meta-Llama-3-8B-Instruct', name: 'Llama 3 8B', contextWindow: 8192, isFree: true },
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B', contextWindow: 32768, isFree: true },
  { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B Beta', contextWindow: 4096, isFree: true },
]

export class HuggingFaceProvider implements LlmProviderStrategy {
  readonly id = 'huggingface'
  readonly displayName = 'HuggingFace'
  readonly defaultModel = 'mistralai/Mistral-7B-Instruct-v0.3'
  readonly models = MODELS
  readonly isFreeTier = true

  async healthCheck(): Promise<boolean> {
    const key = process.env.HUGGINGFACE_API_KEY
    if (!key) return false
    try {
      const res = await fetch(`${BASE_URL}/mistralai/Mistral-7B-Instruct-v0.3`, {
        headers: { Authorization: `Bearer ${key}` },
        method: 'GET',
      })
      return res.status !== 401
    } catch { return false }
  }

  async complete(req: LlmRequest, apiKey?: string): Promise<LlmResponse> {
    const key = apiKey ?? process.env.HUGGINGFACE_API_KEY
    if (!key) throw new AuthError('HUGGINGFACE_API_KEY not set')
    const start = Date.now()
    const model = req.model ?? this.defaultModel

    // HF uses a chat-completions-compatible wrapper endpoint now
    const res = await fetch(`${BASE_URL}/${model}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      if (res.status === 429) throw new RateLimitError(`HuggingFace rate-limited`)
      if (res.status === 401) throw new AuthError(`HuggingFace auth failed`)
      throw new ProviderError(`HuggingFace ${res.status}: ${errText}`)
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

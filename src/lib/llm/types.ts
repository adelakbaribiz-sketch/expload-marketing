/**
 * LLM Provider Strategy Interface.
 *
 * Each provider implements this interface. The Aggregator routes calls
 * to the active provider and falls back automatically on rate-limit/error.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmRequest {
  messages: LlmMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tenantId?: string
  sessionType?: string  // 'negotiation' | 'onboarding' | 'extraction' | 'chat'
  sessionId?: string
}

export interface LlmResponse {
  text: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  latencyMs: number
  costUsd: number
}

export interface LlmProviderStrategy {
  /** Unique provider identifier. */
  readonly id: string
  /** Human-readable name. */
  readonly displayName: string
  /** Default free model. */
  readonly defaultModel: string
  /** Available models on this provider. */
  readonly models: ProviderModel[]
  /** Whether the provider offers a free tier. */
  readonly isFreeTier: boolean

  /** Test that the provider is reachable & API key valid. */
  healthCheck(): Promise<boolean>
  /** Execute a chat completion. */
  complete(req: LlmRequest, apiKey?: string): Promise<LlmResponse>
  /** Estimate token count for a string (rough — actual count comes from API response). */
  estimateTokens(text: string): number
}

export interface ProviderModel {
  id: string
  name: string
  contextWindow: number
  isFree: boolean
  description?: string
}

/** Rough token estimate — 4 chars ≈ 1 token for English, 1.5 for CJK. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const cjk = (text.match(/[\u4e00-\u9fff\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff]/g) || []).length
  const other = text.length - cjk
  return Math.ceil(cjk / 1.5 + other / 4)
}

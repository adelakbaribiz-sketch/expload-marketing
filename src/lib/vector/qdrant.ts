/**
 * Vector Search Engine — Qdrant-style semantic search.
 *
 * In production, this integrates with Qdrant (https://qdrant.tech) — a dedicated
 * vector database optimized for similarity search at scale.
 *
 * In dev mode (no Qdrant URL configured), falls back to in-DB cosine similarity
 * using the VectorIndex Prisma model. This works for small datasets (<10k vectors).
 *
 * Use cases:
 *  - Semantic lead search (find similar businesses)
 *  - Knowledge base Q&A (find relevant documents)
 *  - Content recommendation (find similar articles)
 *  - Customer segmentation (cluster by behavior)
 */

import 'server-only'
import { db } from '@/lib/db'
import { withTimeout } from '@/lib/integrations/types'
import { logger } from '@/lib/observability/logger'

// Qdrant's own fetch calls had no timeout at all before this phase.
const QDRANT_TIMEOUT_MS = 8_000

const QDRANT_URL = process.env.QDRANT_URL ?? ''
const QDRANT_API_KEY = process.env.QDRANT_API_KEY ?? ''
const EMBEDDING_API = process.env.EMBEDDING_API ?? 'https://api.openai.com/v1/embeddings'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
const EMBEDDING_API_KEY = process.env.OPENAI_API_KEY ?? process.env.EMBEDDING_API_KEY ?? ''

/** Check if Qdrant is configured. */
export function isQdrantEnabled(): boolean {
  return Boolean(QDRANT_URL)
}

/** Check if a real embedding API key is configured — if not, generateEmbedding() silently falls back to a non-semantic pseudo-embedding. */
export function isEmbeddingApiConfigured(): boolean {
  return Boolean(EMBEDDING_API_KEY)
}

/** Generate embedding for a text using OpenAI-compatible API. */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!EMBEDDING_API_KEY) {
    // Fallback: simple hash-based pseudo-embedding (384 dims, deterministic)
    return pseudoEmbedding(text, 384)
  }
  try {
    const res = await withTimeout(
      fetch(EMBEDDING_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
        },
        body: JSON.stringify({ input: text, model: EMBEDDING_MODEL }),
      }),
      QDRANT_TIMEOUT_MS,
      'embedding-api',
    )
    if (!res.ok) throw new Error(`Embedding API ${res.status}`)
    const data = await res.json()
    return data.data?.[0]?.embedding ?? pseudoEmbedding(text, 384)
  } catch (err) {
    logger.warn('embedding.api_failed_using_pseudo', { error: String(err) })
    return pseudoEmbedding(text, 384)
  }
}

/** Pseudo-embedding fallback: deterministic hash-based vector (for dev only). */
function pseudoEmbedding(text: string, dims: number): number[] {
  const vec = new Array(dims).fill(0)
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean)
  for (const tok of tokens) {
    let hash = 0
    for (let i = 0; i < tok.length; i++) {
      hash = ((hash << 5) - hash) + tok.charCodeAt(i)
      hash = hash & hash
    }
    const idx = Math.abs(hash) % dims
    vec[idx] += 1
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map(v => v / mag)
}

/** Index a text chunk for semantic search. */
export async function indexVector(params: {
  sourceType: string
  sourceId: string
  tenantId?: string
  textChunk: string
  metadata?: Record<string, any>
}): Promise<void> {
  const vector = await generateEmbedding(params.textChunk)

  if (isQdrantEnabled()) {
    // A live Qdrant outage must not stop the DB backup write below (the
    // comment already says "Always also store in DB" — before this fix,
    // qdrantUpsert() throwing here meant the vector wasn't indexed
    // *anywhere*, contradicting that). Fails soft, logged.
    try {
      await qdrantUpsert({
        id: `${params.sourceType}:${params.sourceId}`,
        vector,
        payload: {
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          tenantId: params.tenantId,
          text: params.textChunk.slice(0, 1000),
          ...params.metadata,
        },
      })
    } catch (err) {
      logger.warn('qdrant.upsert_failed', { sourceType: params.sourceType, sourceId: params.sourceId, error: String(err) })
    }
  }

  // Always also store in DB (as backup + for dev mode)
  await db.vectorIndex.create({
    data: {
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      tenantId: params.tenantId,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDim: vector.length,
      vector: JSON.stringify(vector),
      textChunk: params.textChunk,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  })
}

/** Semantic search: find similar items by text query. */
export async function semanticSearch(params: {
  query: string
  tenantId?: string
  sourceType?: string
  limit?: number
  threshold?: number  // min similarity (0-1)
}): Promise<Array<{ sourceType: string; sourceId: string; score: number; textChunk: string; metadata?: any }>> {
  const queryVector = await generateEmbedding(params.query)
  const limit = params.limit ?? 10
  const threshold = params.threshold ?? 0.3

  if (isQdrantEnabled()) {
    // A live Qdrant outage during search previously threw uncaught all
    // the way up to the caller — the documented in-DB fallback only ever
    // applied when Qdrant wasn't *configured*, not when it was configured
    // but unreachable in the moment. Fall through to the same in-DB path
    // below on failure instead.
    try {
      return await qdrantSearch({ vector: queryVector, ...params, limit, threshold })
    } catch (err) {
      logger.warn('qdrant.search_failed_falling_back', { tenantId: params.tenantId, error: String(err) })
    }
  }

  // Fallback: in-DB cosine similarity
  const where: any = {}
  if (params.tenantId) where.tenantId = params.tenantId
  if (params.sourceType) where.sourceType = params.sourceType

  const candidates = await db.vectorIndex.findMany({
    where, take: 1000,  // limit scan size for dev
    orderBy: { createdAt: 'desc' },
  })

  const scored = candidates.map(c => {
    const vec = JSON.parse(c.vector) as number[]
    const score = cosineSimilarity(queryVector, vec)
    return {
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      score,
      textChunk: c.textChunk,
      metadata: c.metadata ? JSON.parse(c.metadata) : undefined,
    }
  })

  return scored
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Cosine similarity between two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

// ============================================================================
// Qdrant API client (production)
// ============================================================================

async function qdrantUpsert(params: { id: string; vector: number[]; payload: any }): Promise<void> {
  const collection = 'expload_vectors'
  // Ensure collection exists (lazy create)
  await withTimeout(
    fetch(`${QDRANT_URL}/collections/${collection}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
      body: JSON.stringify({
        vectors: { size: params.vector.length, distance: 'Cosine' },
      }),
    }),
    QDRANT_TIMEOUT_MS,
    'qdrant',
  ).catch(() => {})

  await withTimeout(
    fetch(`${QDRANT_URL}/collections/${collection}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
      body: JSON.stringify({
        points: [{ id: params.id, vector: params.vector, payload: params.payload }],
      }),
    }),
    QDRANT_TIMEOUT_MS,
    'qdrant',
  )
}

async function qdrantSearch(params: {
  vector: number[]; tenantId?: string; sourceType?: string; limit: number; threshold: number
}): Promise<any[]> {
  const filter: any = { must: [] }
  if (params.tenantId) filter.must.push({ key: 'tenantId', match: { value: params.tenantId } })
  if (params.sourceType) filter.must.push({ key: 'sourceType', match: { value: params.sourceType } })

  const res = await withTimeout(
    fetch(`${QDRANT_URL}/collections/expload_vectors/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
      body: JSON.stringify({
        vector: params.vector,
        limit: params.limit,
        score_threshold: params.threshold,
        with_payload: true,
        filter: filter.must.length > 0 ? filter : undefined,
      }),
    }),
    QDRANT_TIMEOUT_MS,
    'qdrant',
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.result ?? []).map((r: any) => ({
    sourceType: r.payload?.sourceType,
    sourceId: r.payload?.sourceId,
    score: r.score,
    textChunk: r.payload?.text ?? '',
    metadata: r.payload,
  }))
}

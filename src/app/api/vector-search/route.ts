import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { semanticSearch, indexVector, isQdrantEnabled } from '@/lib/vector/qdrant'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    // Status
    return NextResponse.json({
      qdrantEnabled: isQdrantEnabled(),
      embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small (pseudo)',
    })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    if (body.action === 'search') {
      const results = await semanticSearch({
        query: body.query,
        tenantId: user.tenantId,
        sourceType: body.sourceType,
        limit: body.limit ?? 10,
        threshold: body.threshold ?? 0.3,
      })
      return NextResponse.json({ results })
    }
    if (body.action === 'index') {
      await indexVector({
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        tenantId: user.tenantId,
        textChunk: body.textChunk,
        metadata: body.metadata,
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

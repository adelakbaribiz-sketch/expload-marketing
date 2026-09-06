import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { validateUpload, MAX_FILE_SIZE_BYTES } from '@/lib/storage/validate'
import { generateStorageKey, getStorage, StorageError } from '@/lib/storage'
import { enqueue, QueueUnavailableError } from '@/lib/queue'

/**
 * Upload a document for an onboarding session (business brief, requirements
 * doc, etc). Saved to private storage (never under `public/`) and queued
 * for text extraction — extraction runs in the background job worker so a
 * large PDF/DOCX never blocks this request or ties up a server thread.
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const sessionId = form?.get('sessionId')

  if (!(file instanceof File) || typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ error: 'file and sessionId are required' }, { status: 400 })
  }

  const session = await db.onboardingSession.findFirst({ where: { id: sessionId, tenantId } })
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: `File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit` }, { status: 413 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = validateUpload(file.name, file.type, file.size, buffer)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const storageKey = generateStorageKey(tenantId, validation.extension!)
  try {
    await getStorage().save(storageKey, buffer)
  } catch (err) {
    if (err instanceof StorageError) {
      return NextResponse.json(
        { error: 'storage_unavailable', message: 'File storage is temporarily unavailable. Please try uploading again shortly.' },
        { status: 503 },
      )
    }
    throw err
  }

  const doc = await db.onboardingDocument.create({
    data: {
      sessionId,
      filename: file.name.slice(0, 255),
      fileType: validation.extension!,
      fileSize: file.size,
      storageUrl: storageKey,
      status: 'pending',
    },
  })

  // Previously an unguarded call: a Redis outage left the document row
  // stuck at status 'pending' forever with no indication anything went
  // wrong (the file was already saved, so a partial failure here is a
  // real inconsistent state, not just a lost request). See
  // RELIABILITY-AUDIT.md. Mirror document_extract's own failure-cleanup
  // convention (mark failed, don't leave an unprocessable file behind)
  // rather than leaving it silently 'pending'.
  try {
    await enqueue('document_extract', { documentId: doc.id })
  } catch (err) {
    if (err instanceof QueueUnavailableError) {
      await db.onboardingDocument.update({
        where: { id: doc.id },
        data: { status: 'failed', errorMessage: 'Processing queue temporarily unavailable — please re-upload.' },
      })
      await getStorage().delete(storageKey).catch(() => {})
      return NextResponse.json(
        { error: 'queue_unavailable', message: 'Document processing is temporarily unavailable. Please try uploading again shortly.' },
        { status: 503 },
      )
    }
    throw err
  }

  return NextResponse.json({ doc: { id: doc.id, filename: doc.filename, fileSize: doc.fileSize, status: doc.status } }, { status: 201 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

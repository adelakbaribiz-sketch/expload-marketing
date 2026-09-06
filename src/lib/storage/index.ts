import 'server-only'
import { mkdir, readFile, writeFile, unlink, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Storage abstraction for uploaded files.
 *
 * All files are stored PRIVATE by default, outside `public/` — Next.js
 * never serves them directly; every read goes through an authenticated (or
 * signed-URL, see signed-url.ts) route handler. There is currently exactly
 * one caller (onboarding document upload); the interface stays adapter-
 * agnostic so a future S3-compatible adapter is a drop-in, matching the
 * env-gated pattern already used by src/lib/queue/index.ts (Redis vs.
 * in-memory) — not implemented here since no S3 SDK is installed and
 * nothing yet needs it.
 */

export interface StorageAdapter {
  save(key: string, data: Buffer): Promise<void>
  read(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  size(key: string): Promise<number>
}

const PRIVATE_ROOT = join(process.cwd(), 'storage', 'private')

class LocalStorageAdapter implements StorageAdapter {
  private resolve(key: string): string {
    // Keys are always server-generated (see generateStorageKey) — never
    // built from user input — so this is belt-and-suspenders, not the
    // primary defense against path traversal.
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
      throw new Error('invalid storage key')
    }
    return join(PRIVATE_ROOT, key)
  }

  async save(key: string, data: Buffer): Promise<void> {
    const path = this.resolve(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data)
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key))
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolve(key)).catch(() => {})
  }

  async size(key: string): Promise<number> {
    return (await stat(this.resolve(key))).size
  }
}

let adapter: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (!adapter) adapter = new LocalStorageAdapter()
  return adapter
}

/** Local filesystem path for a storage key — for callers (like the document extractor) that need a real path rather than a Buffer. Local-adapter-only; a future remote adapter would need its own temp-download step here. */
export function localPathFor(key: string): string {
  return join(PRIVATE_ROOT, key)
}

/** Server-generated, collision-resistant storage key. Never derived from the user-supplied filename — that's kept only as display metadata on the DB row. */
export function generateStorageKey(tenantId: string, extension: string): string {
  return `${tenantId}/${randomUUID()}.${extension}`
}

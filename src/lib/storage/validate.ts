import 'server-only'

/**
 * Upload validation: allowed types, size limit, and a cheap magic-byte
 * check so a renamed `.exe` can't ride in as `.pdf` on extension alone.
 * Malware-scanning strategy: this allowlist + size cap + the magic-byte
 * check IS the current line of defense — there's no ClamAV/VirusTotal
 * integration in this environment. `scanBuffer()` is the seam to plug one
 * into later without touching the upload route itself.
 */

export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'html', 'htm'] as const
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB — these are text-source documents, not media

const MIME_BY_EXTENSION: Record<AllowedExtension, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
  html: ['text/html'],
  htm: ['text/html'],
}

const MAGIC_BYTES: Partial<Record<AllowedExtension, (buf: Buffer) => boolean>> = {
  pdf: (buf) => buf.subarray(0, 4).toString('ascii') === '%PDF',
  // .docx is a zip archive (PK\x03\x04)
  docx: (buf) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04,
}

export interface ValidationResult {
  valid: boolean
  error?: string
  extension?: AllowedExtension
}

/** Validate an uploaded file's extension, declared MIME type, size, and (for pdf/docx) magic bytes. */
export function validateUpload(filename: string, mimeType: string, size: number, buffer: Buffer): ValidationResult {
  if (size <= 0 || size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File must be between 1 byte and ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` }
  }

  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return { valid: false, error: `File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}` }
  }
  const extension = ext as AllowedExtension

  const allowedMimes = MIME_BY_EXTENSION[extension]
  if (mimeType && !allowedMimes.includes(mimeType)) {
    return { valid: false, error: `Declared type "${mimeType}" does not match ".${extension}"` }
  }

  const magicCheck = MAGIC_BYTES[extension]
  if (magicCheck && !magicCheck(buffer)) {
    return { valid: false, error: 'File content does not match its extension' }
  }

  return { valid: true, extension }
}

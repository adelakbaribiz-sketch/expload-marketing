/**
 * Document Text Extractor.
 *
 * Supports: PDF, DOCX, TXT, MD, HTML.
 * Each extractor returns plain text suitable for LLM context.
 *
 * For PDF: uses pdf-parse (lightweight, no native deps).
 * For DOCX: uses mammoth (extracts text from Word .docx).
 * For TXT/MD/HTML: direct read.
 */

import 'server-only'
import { readFile } from 'node:fs/promises'

export interface ExtractedDoc {
  filename: string
  fileType: string
  text: string
  charCount: number
  truncated: boolean
}

const MAX_CHARS = 50000

export async function extractDocument(filePath: string, filename: string, fileType: string): Promise<ExtractedDoc> {
  const buffer = await readFile(filePath)
  let text: string

  switch (fileType.toLowerCase()) {
    case 'pdf':
      text = await extractPdf(buffer)
      break
    case 'docx':
      text = await extractDocx(buffer)
      break
    case 'txt':
    case 'md':
      text = buffer.toString('utf-8')
      break
    case 'html':
    case 'htm':
      text = stripHtml(buffer.toString('utf-8'))
      break
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }

  text = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  const truncated = text.length > MAX_CHARS
  if (truncated) text = text.slice(0, MAX_CHARS)

  return { filename, fileType, text, charCount: text.length, truncated }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import — pdf-parse v2 is ESM without bundled types
    // @ts-ignore - missing types
    const mod = await import('pdf-parse')
    const fn = (mod as any).default ?? mod
    const data = await fn(buffer)
    return data.text ?? ''
  } catch (err) {
    throw new Error(`PDF extraction failed: ${(err as Error).message}. Install pdf-parse: bun add pdf-parse`)
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (err) {
    throw new Error(`DOCX extraction failed: ${(err as Error).message}. Install mammoth: bun add mammoth`)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

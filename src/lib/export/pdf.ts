/**
 * PDF export via `pdfkit` — a pure-JS PDF generator with no native deps and
 * no headless browser required (Playwright is only a devDependency, added
 * for E2E tests in Phase 09, and even the full `playwright` package isn't
 * installed — not a reliable runtime dependency to build a production
 * feature on). Scoped to what this app's reports actually need: a title, a
 * generated-at stamp, and a simple table — not general HTML-to-PDF
 * rendering.
 */
import PDFDocument from 'pdfkit'
import { NextResponse } from 'next/server'

export interface PdfTableColumn {
  header: string
  width: number
  align?: 'left' | 'right' | 'center'
}

export interface PdfReportOptions {
  title: string
  subtitle?: string
  generatedAt?: Date
  columns: PdfTableColumn[]
  rows: (string | number)[][]
}

/** Render a simple titled table report to a PDF Buffer. */
export function buildPdfReport(opts: PdfReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(18).text(opts.title, { align: 'left' })
    if (opts.subtitle) doc.fontSize(11).fillColor('#666').text(opts.subtitle)
    doc.fontSize(9).fillColor('#999').text(`Generated ${(opts.generatedAt ?? new Date()).toISOString()}`)
    doc.moveDown(1)

    const startX = doc.x
    let y = doc.y
    const rowHeight = 20

    const drawRow = (cells: (string | number)[], opts2: { bold?: boolean; fillHeader?: boolean }) => {
      let x = startX
      if (opts2.fillHeader) {
        doc.rect(startX, y, opts.columns.reduce((s, c) => s + c.width, 0), rowHeight).fill('#f3f4f6')
        doc.fillColor('#111')
      }
      doc.font(opts2.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      opts.columns.forEach((col, i) => {
        doc.text(String(cells[i] ?? ''), x + 4, y + 5, { width: col.width - 8, align: col.align ?? 'left' })
        x += col.width
      })
      y += rowHeight
    }

    drawRow(opts.columns.map((c) => c.header), { bold: true, fillHeader: true })

    for (const row of opts.rows) {
      if (y > doc.page.height - 80) {
        doc.addPage()
        y = doc.y
      }
      drawRow(row, {})
    }

    doc.end()
  })
}

/** Build a Next.js Response for a PDF download. */
export function pdfResponse(filename: string, buffer: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

import { NextResponse } from 'next/server'

/**
 * Dependency-free CSV export — no library needed, it's just delimited
 * text. See pdf.ts for why PDF export needed a real (lightweight)
 * dependency instead.
 */

export interface CsvColumn<T> {
  header: string
  /** Extract this column's value from a row. Defaults to `row[header]` if omitted. */
  value?: (row: T) => string | number | boolean | null | undefined
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // RFC 4180: quote any field containing a comma, quote, or newline; escape internal quotes by doubling them.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Build a CSV string (with a UTF-8 BOM so Excel opens non-ASCII text, e.g. Persian/Arabic, correctly instead of mangling it). */
export function toCsv<T extends Record<string, any>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.value ? c.value(row) : row[c.header])).join(','),
  )
  return '﻿' + [header, ...lines].join('\r\n')
}

/** Build a Next.js Response for a CSV download with the right headers. */
export function csvResponse(filename: string, csv: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

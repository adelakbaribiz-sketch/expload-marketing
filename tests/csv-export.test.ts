import { describe, expect, test } from 'bun:test'
import { toCsv } from '../src/lib/export/csv'

describe('toCsv', () => {
  test('produces a header row and one row per record', () => {
    const csv = toCsv(
      [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
      [{ header: 'Name', value: (r) => r.name }, { header: 'Age', value: (r) => r.age }],
    )
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[0]).toBe('Name,Age')
    expect(lines[1]).toBe('Alice,30')
    expect(lines[2]).toBe('Bob,25')
  })

  test('quotes and escapes a cell containing a comma or quote', () => {
    const csv = toCsv(
      [{ name: 'Smith, John "Jack"' }],
      [{ header: 'Name', value: (r) => r.name }],
    )
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[1]).toBe('"Smith, John ""Jack"""')
  })

  test('renders null/undefined as an empty cell', () => {
    const csv = toCsv([{ v: null }, { v: undefined }], [{ header: 'V', value: (r) => r.v }])
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[1]).toBe('')
    expect(lines[2]).toBe('')
  })

  test('starts with a UTF-8 BOM so Excel opens non-Latin text correctly', () => {
    const csv = toCsv([{ name: 'تست' }], [{ header: 'نام', value: (r) => r.name }])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  test('falls back to row[header] when no value() extractor is given', () => {
    const csv = toCsv([{ Name: 'Alice' }], [{ header: 'Name' }])
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[1]).toBe('Alice')
  })
})

/**
 * Verifies prisma/schema.prisma (sqlite, dev) and
 * prisma/schema.production.prisma (postgresql, staging/production — see
 * that file's own header comment for why two files exist at all: Prisma's
 * datasource.provider is a static string that must match the real
 * migration history, so one schema file can't be "sqlite in dev,
 * postgresql in prod" while also having a real, deployable
 * prisma/migrations/ history) declare the exact same models.
 *
 * Compares everything AFTER each file's own `datasource` block — that
 * block is expected to differ (that's the entire point of having two
 * files); every model/enum/generator definition below it must be
 * byte-identical. Exits non-zero (and prints a diff-shaped report) on any
 * divergence, so this is CI-gate-capable, not just a report.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEV_SCHEMA = join(__dirname, '..', 'prisma', 'schema.prisma')
const PROD_SCHEMA = join(__dirname, '..', 'prisma', 'schema.production.prisma')

/** Strip everything up to and including the closing brace of the `datasource` block. */
function stripDatasourceBlock(content: string): string {
  const match = content.match(/datasource\s+\w+\s*\{[^}]*\}/)
  if (!match) throw new Error('Could not find a datasource block — schema file format changed unexpectedly.')
  return content.slice(match.index! + match[0].length).trim()
}

function main() {
  const devContent = readFileSync(DEV_SCHEMA, 'utf-8')
  const prodContent = readFileSync(PROD_SCHEMA, 'utf-8')

  const devModels = stripDatasourceBlock(devContent)
  const prodModels = stripDatasourceBlock(prodContent)

  if (devModels === prodModels) {
    console.log('[PASS] schema.prisma and schema.production.prisma declare identical models.')
    process.exit(0)
  }

  console.error('[FAIL] schema.prisma and schema.production.prisma have drifted — everything after the datasource block must be identical.')

  const devLines = devModels.split('\n')
  const prodLines = prodModels.split('\n')
  const maxLines = Math.max(devLines.length, prodLines.length)
  let diffCount = 0
  for (let i = 0; i < maxLines && diffCount < 20; i++) {
    if (devLines[i] !== prodLines[i]) {
      diffCount++
      console.error(`  line ${i + 1}:`)
      console.error(`    schema.prisma:            ${devLines[i] ?? '(missing)'}`)
      console.error(`    schema.production.prisma: ${prodLines[i] ?? '(missing)'}`)
    }
  }
  if (diffCount === 0) {
    console.error('  (files differ in length only — one has trailing content the other lacks)')
  }
  console.error('\nFix: copy whichever file has the correct change into the other, everywhere except its datasource block.')
  process.exit(1)
}

main()

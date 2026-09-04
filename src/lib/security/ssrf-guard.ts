/**
 * SSRF guard — reject fetches into private/loopback/link-local/reserved
 * address space. Any feature that has the SERVER fetch a USER-SUPPLIED URL
 * (website crawlers, "test connection" buttons, webhook delivery, etc.)
 * must run its target through `assertPublicHost()` before every fetch —
 * including every redirect hop, since a first check alone doesn't protect
 * against a redirect to an internal address.
 *
 * No 'server-only' import here on purpose: this is pure logic (net/dns
 * builtins only, no Next.js request context), so it can be unit-tested
 * directly — see scripts/security-checks.ts.
 */

import dns from 'node:dns/promises'
import net from 'node:net'

export function isPrivateOrReservedIp(ip: string): boolean {
  const type = net.isIP(ip)
  if (type === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local, includes cloud metadata endpoint
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    if (a >= 224) return true // multicast + reserved
    return false
  }
  if (type === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return true // link-local fe80::/10
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true // unique local fc00::/7
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice(7)
      if (net.isIP(v4) === 4) return isPrivateOrReservedIp(v4)
    }
    return false
  }
  return true // couldn't even parse as an IP — refuse rather than guess
}

export async function assertPublicHost(hostname: string): Promise<void> {
  const bare = hostname.replace(/^\[/, '').replace(/\]$/, '') // strip IPv6 brackets if present
  if (bare.toLowerCase() === 'localhost') throw new Error('Refusing to fetch a private/internal address')
  if (net.isIP(bare)) {
    if (isPrivateOrReservedIp(bare)) throw new Error('Refusing to fetch a private/internal address')
    return
  }
  const records = await dns.lookup(bare, { all: true })
  if (records.length === 0) throw new Error('Could not resolve host')
  for (const r of records) {
    if (isPrivateOrReservedIp(r.address)) throw new Error('Refusing to fetch a private/internal address')
  }
}

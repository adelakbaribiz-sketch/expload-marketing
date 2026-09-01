import { cookies } from 'next/headers'
import { getAuthTenantId } from '@/lib/auth/session'

/**
 * Multi-tenant context resolver.
 *
 * Priority:
 *   1. Authenticated user's tenantId (from NextAuth session)
 *   2. X-Tenant-ID header (for API clients)
 *   3. tenant-id cookie (fallback for unauthenticated browsing)
 */
export async function getTenantId(): Promise<string | null> {
  // 1. Auth session (highest priority)
  const authTid = await getAuthTenantId()
  if (authTid) return authTid

  // 2. Header
  const headerTenant = await headersGet('x-tenant-id')
  if (headerTenant) return headerTenant

  // 3. Cookie
  const cookieStore = await cookies()
  return cookieStore.get('tenant-id')?.value ?? null
}

export async function getTenantIdOrNull(): Promise<string | null> {
  return getTenantId()
}

export async function requireTenantId(): Promise<string> {
  const id = await getTenantId()
  if (!id) {
    throw new Error('Tenant ID required. Authenticate or set the X-Tenant-ID header.')
  }
  return id
}

async function headersGet(name: string): Promise<string | null> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return h.get(name)
  } catch {
    return null
  }
}

import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/simple-session'

/**
 * Multi-tenant context resolver.
 *
 * Priority:
 *   1. Authenticated user's own tenantId (the normal case for every user)
 *   2. tenant-id cookie — ONLY honored for an authenticated SuperAdmin.
 *      This backs the sidebar's tenant-switcher (src/components/providers.tsx's
 *      TenantSync writes this cookie), which lets a SuperAdmin view/manage a
 *      different tenant's data. It is deliberately NOT honored for anyone
 *      else and NEVER for an unauthenticated caller — see SECURITY-BASELINE.md
 *      and adr/0004. The previous X-Tenant-ID header fallback had zero
 *      legitimate callers anywhere in the app and has been removed outright.
 */
export async function getTenantId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  if (user.isSuperAdmin) {
    const cookieStore = await cookies()
    const override = cookieStore.get('tenant-id')?.value
    if (override) return override
  }

  return user.tenantId
}

export async function getTenantIdOrNull(): Promise<string | null> {
  return getTenantId()
}

export async function requireTenantId(): Promise<string> {
  const id = await getTenantId()
  if (!id) {
    throw new Error('Tenant ID required — no authenticated session found.')
  }
  return id
}

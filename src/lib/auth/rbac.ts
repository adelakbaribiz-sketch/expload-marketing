import 'server-only'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'

/**
 * RBAC (Role-Based Access Control) system.
 *
 * Permission hierarchy:
 *   super_admin → all permissions
 *   owner → all tenant permissions
 *   admin → all except user/role management
 *   manager → create/edit most things, no settings/billing
 *   editor → create/edit content, no delete
 *   viewer → read-only
 */

export interface PermissionCheck {
  allowed: boolean
  reason?: string
}

/** Check if the current user has a specific permission. */
export async function hasPermission(permission: string): Promise<PermissionCheck> {
  const user = await getCurrentUser()
  if (!user) return { allowed: false, reason: 'Not authenticated' }

  // Super admin has all permissions
  const superAdmin = await db.superAdmin.findUnique({ where: { userId: user.id } })
  if (superAdmin?.isActive) return { allowed: true }

  // Owner has all tenant permissions
  if (user.role === 'owner') return { allowed: true }

  // Admin has most permissions
  if (user.role === 'admin' && !permission.startsWith('team.') && !permission.startsWith('billing.')) {
    return { allowed: true }
  }

  // Check role-based permissions
  const roleId = (user as any).roleId
  if (roleId) {
    const role = await db.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    })
    if (role) {
      const hasPerm = role.permissions.some(rp => rp.permission.name === permission)
      if (hasPerm) return { allowed: true }
    }
  }

  return { allowed: false, reason: `Missing permission: ${permission}` }
}

/** Require a specific permission, throws if not allowed. */
export async function requirePermission(permission: string): Promise<void> {
  const check = await hasPermission(permission)
  if (!check.allowed) {
    throw new Error(`Unauthorized: ${check.reason}`)
  }
}

/**
 * Blocks the 'viewer' role from write operations. `leads-view.tsx`/
 * `campaigns-view.tsx` already hide their write affordances for this role
 * client-side (`canWrite = user?.role !== 'viewer'`) on the assumption the
 * backend enforces the same rule — Phase 09's frontend audit found it
 * didn't, so a viewer calling the API directly could create/edit/delete
 * leads and campaigns despite being documented as read-only (see the
 * role-hierarchy comment at the top of this file). Deliberately narrow:
 * only blocks the literal 'viewer' role string rather than routing through
 * `hasPermission()`, since the custom-role `Permission` table isn't seeded
 * yet (see AGENT-CONTEXT.md) and `hasPermission()` would incorrectly deny
 * legitimate 'manager'/'editor' users who have no custom role assigned.
 */
export async function requireNonViewer(): Promise<PermissionCheck> {
  const user = await getCurrentUser()
  if (!user) return { allowed: false, reason: 'Not authenticated' }
  if (user.role === 'viewer') return { allowed: false, reason: 'Viewer role is read-only' }
  return { allowed: true }
}

/** Check if user is super admin. */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  const sa = await db.superAdmin.findUnique({ where: { userId: user.id } })
  return Boolean(sa?.isActive)
}

/**
 * Check if user is platform staff with admin-level access (super admin, or
 * an internal employee whose platformRole is 'admin'/'super_admin'). This is
 * the correct gate for platform-global, non-tenant-scoped internal-operations
 * data (payroll, internal HR) — same convention already used inline in
 * POST /api/internal/employees.
 */
export async function isPlatformStaffAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  const [sa, emp] = await Promise.all([
    db.superAdmin.findUnique({ where: { userId: user.id } }),
    db.internalEmployee.findUnique({ where: { userId: user.id } }),
  ])
  if (sa?.isActive) return true
  return Boolean(emp && (emp.platformRole === 'admin' || emp.platformRole === 'super_admin') && emp.status === 'active')
}

/** Get all permissions for the current user. */
export async function getUserPermissions(): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []

  // Super admin
  const sa = await db.superAdmin.findUnique({ where: { userId: user.id } })
  if (sa?.isActive) return ['*'] // all permissions

  // Owner
  if (user.role === 'owner') return ['*']

  // Role-based
  const roleId = (user as any).roleId
  if (roleId) {
    const role = await db.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    })
    if (role) {
      return role.permissions.map(rp => rp.permission.name)
    }
  }

  // Default by role string
  const defaults: Record<string, string[]> = {
    admin: ['leads.*', 'campaigns.*', 'seo.*', 'ads.*', 'social.*', 'content.*', 'analytics.*', 'ai.*'],
    manager: ['leads.*', 'campaigns.*', 'seo.*', 'ads.*', 'social.*', 'content.*', 'analytics.*'],
    editor: ['leads.read', 'leads.create', 'leads.update', 'campaigns.read', 'campaigns.create', 'campaigns.update', 'content.read', 'content.create', 'content.update'],
    viewer: ['leads.read', 'campaigns.read', 'seo.read', 'ads.read', 'social.read', 'content.read', 'analytics.read'],
  }

  return defaults[user.role] ?? []
}

/** Check wildcard permission match. */
export function matchesPermission(userPerms: string[], required: string): boolean {
  if (userPerms.includes('*')) return true
  // Check exact match
  if (userPerms.includes(required)) return true
  // Check wildcard: if user has "leads.*" and required is "leads.create"
  const parts = required.split('.')
  if (parts.length >= 2) {
    const wildcard = `${parts[0]}.*`
    if (userPerms.includes(wildcard)) return true
  }
  return false
}

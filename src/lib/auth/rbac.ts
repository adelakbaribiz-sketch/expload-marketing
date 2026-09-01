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

/** Check if user is super admin. */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  const sa = await db.superAdmin.findUnique({ where: { userId: user.id } })
  return Boolean(sa?.isActive)
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

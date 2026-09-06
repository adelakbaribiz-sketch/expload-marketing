import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'

/** Returns the current authenticated user, or null. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      // Found via a Phase 18 contract check: /api/auth/login already
      // returns roleId (it forwards authenticateUser()'s full object),
      // but this endpoint rebuilt the object by hand and had silently
      // dropped it — an inconsistency between "who am I right after
      // login" and "who am I on a later page load."
      roleId: user.roleId,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      internalPlatformRole: user.internalPlatformRole,
    },
  })
}

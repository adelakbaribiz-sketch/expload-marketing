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
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      internalPlatformRole: user.internalPlatformRole,
    },
  })
}

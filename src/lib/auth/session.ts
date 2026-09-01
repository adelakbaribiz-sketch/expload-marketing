import 'server-only'
import { getCurrentUser, getAuthTenantId, getAuthUserId } from './simple-session'

export { getCurrentUser, getAuthTenantId, getAuthUserId }

/** Require authentication — returns the user. */
export async function requireSession() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

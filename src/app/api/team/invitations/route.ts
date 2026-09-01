import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'teamInvitation',
  fields: ['email', 'role', 'token', 'invitedBy', 'status', 'expiresAt'],
})

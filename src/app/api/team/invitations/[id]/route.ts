import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'teamInvitation',
  fields: ['email', 'role', 'status', 'expiresAt'],
})

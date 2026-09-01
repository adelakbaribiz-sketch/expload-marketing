import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'webhookSubscription',
  fields: ['url', 'events', 'secretToken', 'isActive'],
})

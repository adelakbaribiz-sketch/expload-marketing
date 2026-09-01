import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'webhookSubscription',
  fields: ['url', 'events', 'secretToken', 'isActive', 'totalSent', 'totalFailed', 'lastSentAt', 'lastResponseStatus'],
})

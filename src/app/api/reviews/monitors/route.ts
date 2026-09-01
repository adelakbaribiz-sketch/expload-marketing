import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'reviewMonitor',
  fields: ['platform', 'businessName', 'placeId', 'rating', 'reviewCount', 'avgRating', 'lastChecked', 'autoRespond', 'responseTemplate', 'sentimentScore', 'sentimentBreakdown'],
  include: { reviews: true },
})

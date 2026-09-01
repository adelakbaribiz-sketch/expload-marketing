import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'reviewMonitor',
  fields: ['platform', 'businessName', 'placeId', 'rating', 'reviewCount', 'avgRating', 'lastChecked', 'autoRespond', 'responseTemplate', 'sentimentScore', 'sentimentBreakdown'],
  include: { reviews: true },
})

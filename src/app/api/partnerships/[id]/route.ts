import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'partnershipOpportunity',
  fields: ['title', 'description', 'type', 'partnerName', 'partnerType', 'partnerWebsite', 'partnerContact', 'valueProposition', 'expectedBenefit', 'estimatedValue', 'timeline', 'requirements', 'status', 'priority', 'matchScore'],
})

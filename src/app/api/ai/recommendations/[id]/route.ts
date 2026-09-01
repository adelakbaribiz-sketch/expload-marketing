import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'aiRecommendation',
  fields: ['agentId', 'category', 'priority', 'title', 'description', 'actionData', 'impact', 'status'],
})

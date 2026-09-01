import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'aiRecommendation',
  fields: ['agentId', 'category', 'priority', 'title', 'description', 'actionData', 'impact', 'status'],
})

import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'goal',
  fields: ['title', 'type', 'targetValue', 'currentValue', 'unit', 'startDate', 'endDate', 'status', 'priority', 'linkedPhases', 'projectedValue', 'projectedDate', 'history'],
})

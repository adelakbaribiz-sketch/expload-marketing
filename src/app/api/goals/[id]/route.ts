import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'goal',
  fields: ['title', 'type', 'targetValue', 'currentValue', 'unit', 'startDate', 'endDate', 'status', 'priority', 'linkedPhases', 'projectedValue', 'projectedDate', 'history'],
})

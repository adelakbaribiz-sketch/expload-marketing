import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'customerJourney',
  fields: ['name', 'description', 'steps', 'trigger', 'triggerConfig', 'isActive', 'totalEnrolled', 'totalCompleted', 'totalConverted'],
})

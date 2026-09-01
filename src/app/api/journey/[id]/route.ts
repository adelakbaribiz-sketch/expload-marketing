import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'customerJourney',
  fields: ['name', 'description', 'steps', 'trigger', 'triggerConfig', 'isActive'],
})

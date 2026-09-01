import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'aiAgent',
  fields: ['name', 'type', 'description', 'config', 'isActive'],
  include: { tasks: true, recommendations: true },
})

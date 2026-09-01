import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'aiAgent',
  fields: ['name', 'type', 'description', 'config', 'isActive'],
  include: { tasks: true, recommendations: true },
})

import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'fraudRule',
  fields: ['name', 'type', 'description', 'config', 'severity', 'action', 'isActive'],
})

import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'workflow',
  fields: ['name', 'description', 'trigger', 'triggerConfig', 'steps', 'isActive'],
  include: { runs: true },
})

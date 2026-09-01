import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'workflow',
  fields: ['name', 'description', 'trigger', 'triggerConfig', 'steps', 'isActive'],
  include: { runs: true },
})

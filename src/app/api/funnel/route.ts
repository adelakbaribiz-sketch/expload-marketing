import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'marketingFunnel',
  fields: ['name', 'description', 'stages', 'results', 'startDate', 'endDate', 'segment'],
})

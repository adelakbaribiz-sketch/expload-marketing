import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'marketingFunnel',
  fields: ['name', 'description', 'stages', 'results', 'startDate', 'endDate', 'segment'],
})

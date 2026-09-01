import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'adCampaign',
  fields: ['adAccountId', 'name', 'status', 'budget', 'budgetType', 'startDate', 'endDate'],
})

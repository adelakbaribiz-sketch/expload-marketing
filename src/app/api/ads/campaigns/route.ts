import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'adCampaign',
  fields: ['adAccountId', 'name', 'status', 'budget', 'budgetType', 'startDate', 'endDate'],
})

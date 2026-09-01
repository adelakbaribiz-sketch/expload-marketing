import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'exportProduct',
  fields: ['name', 'hsCode', 'category', 'description', 'globalMarketSize', 'globalGrowthRate', 'topExporters', 'topImporters', 'avgPrice', 'priceTrend', 'priceVolatility', 'competitionLevel', 'barriers', 'certifications', 'targetMarkets', 'opportunityScore', 'notes'],
})

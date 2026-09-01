import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'exportProduct',
  fields: ['name', 'hsCode', 'category', 'description', 'globalMarketSize', 'globalGrowthRate', 'topExporters', 'topImporters', 'avgPrice', 'priceTrend', 'priceVolatility', 'competitionLevel', 'barriers', 'certifications', 'targetMarkets', 'opportunityScore', 'notes'],
})

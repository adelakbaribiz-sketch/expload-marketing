import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'exportMarket',
  fields: ['country', 'countryCode', 'region', 'marketSize', 'growthRate', 'importVolume', 'importTrend', 'tariffRate', 'importDuty', 'vatRate', 'tradeBarriers', 'regulations', 'opportunityScore', 'competitionLevel', 'marketEntryDifficulty', 'recommendedStrategy', 'population', 'gdpPerCapita', 'internetPenetration', 'keyCities', 'mainPorts', 'language', 'currency', 'paymentMethods', 'notes'],
})

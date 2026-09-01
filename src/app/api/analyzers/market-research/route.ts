import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'marketResearch',
  fields: ['title', 'type', 'country', 'product', 'summary', 'keyFindings', 'recommendations', 'dataSources', 'marketSize', 'growthRate', 'competitionLevel', 'aiAnalysis', 'confidenceScore', 'status'],
})

import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'marketResearch',
  fields: ['title', 'type', 'country', 'product', 'summary', 'keyFindings', 'recommendations', 'dataSources', 'marketSize', 'growthRate', 'competitionLevel', 'aiAnalysis', 'confidenceScore', 'status'],
})

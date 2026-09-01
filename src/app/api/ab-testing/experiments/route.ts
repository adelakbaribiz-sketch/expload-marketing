import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'abTestExperiment',
  fields: ['name', 'description', 'status', 'controlName', 'controlData', 'variantName', 'variantData', 'trafficSplit', 'controlVisitors', 'variantVisitors', 'controlConversions', 'variantConversions', 'controlConversionRate', 'variantConversionRate', 'confidenceLevel', 'winner', 'targetUrl', 'targetMetric', 'startDate', 'endDate'],
})

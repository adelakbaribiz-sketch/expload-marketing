import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'monthlyReport',
  fields: ['title', 'month', 'language', 'executiveSummary', 'achievements', 'challenges', 'metrics', 'recommendations', 'nextMonthPlan', 'aiAnalysis', 'pdfUrl', 'status', 'sentTo'],
})

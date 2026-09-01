import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'monthlyReport',
  fields: ['title', 'month', 'language', 'executiveSummary', 'achievements', 'challenges', 'metrics', 'recommendations', 'nextMonthPlan', 'aiAnalysis', 'pdfUrl', 'status', 'sentTo'],
})

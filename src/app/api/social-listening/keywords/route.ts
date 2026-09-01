import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'brandKeyword',
  fields: ['keyword', 'isActive', 'alertOnPositive', 'alertOnNegative', 'alertOnNeutral', 'totalMentions', 'lastChecked'],
})

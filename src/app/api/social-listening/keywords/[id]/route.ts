import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'brandKeyword',
  fields: ['keyword', 'isActive', 'alertOnPositive', 'alertOnNegative', 'alertOnNeutral', 'totalMentions', 'lastChecked'],
})

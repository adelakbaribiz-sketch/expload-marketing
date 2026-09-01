import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'backlinkOpportunity',
  fields: ['sourceDomain', 'sourceUrl', 'targetUrl', 'domainAuthority', 'pageAuthority', 'relevanceScore', 'linkType', 'status', 'contactEmail', 'contactName', 'outreachTemplate', 'outreachSentAt', 'responseReceivedAt', 'acquiredAt', 'notes'],
  include: { outreaches: true },
})

import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'backlinkOpportunity',
  fields: ['sourceDomain', 'sourceUrl', 'targetUrl', 'domainAuthority', 'pageAuthority', 'relevanceScore', 'linkType', 'status', 'contactEmail', 'contactName', 'outreachTemplate', 'outreachSentAt', 'responseReceivedAt', 'acquiredAt', 'notes'],
  include: { outreaches: true },
})

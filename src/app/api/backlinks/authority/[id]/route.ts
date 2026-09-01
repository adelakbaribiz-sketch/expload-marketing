import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'authorityTracker',
  fields: ['domain', 'domainAuthority', 'pageAuthority', 'backlinksCount', 'referringDomains', 'trustFlow', 'citationFlow', 'spamScore', 'history'],
})

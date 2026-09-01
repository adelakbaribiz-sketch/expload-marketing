import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'authorityTracker',
  fields: ['domain', 'domainAuthority', 'pageAuthority', 'backlinksCount', 'referringDomains', 'trustFlow', 'citationFlow', 'spamScore', 'history'],
})

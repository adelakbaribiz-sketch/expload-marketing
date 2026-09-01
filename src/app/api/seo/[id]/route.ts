import { createDomainItemHandlers } from '@/lib/crud/domain-handler'

export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'seoProject',
  fields: ['name', 'domain', 'crawlFrequency'],
  include: { crawls: true, pages: true, issues: true, keywords: true, backlinks: true },
})

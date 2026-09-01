import { createDomainHandlers } from '@/lib/crud/domain-handler'

export const { GET, POST } = createDomainHandlers({
  model: 'seoProject',
  fields: ['name', 'domain', 'crawlFrequency'],
  include: { crawls: true, pages: true, issues: true, keywords: true, backlinks: true },
})

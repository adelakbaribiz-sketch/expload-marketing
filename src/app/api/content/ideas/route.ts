import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'contentIdea',
  fields: ['title', 'description', 'topic', 'contentType', 'keywords', 'source', 'status', 'aiScore'],
  include: { pieces: true },
})

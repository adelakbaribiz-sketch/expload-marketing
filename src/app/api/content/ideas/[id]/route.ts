import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'contentIdea',
  fields: ['title', 'description', 'topic', 'contentType', 'keywords', 'source', 'status', 'aiScore'],
  include: { pieces: true },
})

import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'contentPiece',
  fields: ['title', 'body', 'excerpt', 'contentType', 'wordCount', 'status', 'aiGenerated', 'seoScore', 'ideaId'],
  include: { idea: true, creator: true },
})

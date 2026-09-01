import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'contentPiece',
  fields: ['title', 'body', 'excerpt', 'contentType', 'wordCount', 'status', 'aiGenerated', 'seoScore', 'ideaId'],
  include: { idea: true, creator: true },
})

import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'brandMention',
  fields: ['keyword', 'platform', 'url', 'title', 'snippet', 'author', 'sentiment', 'sentimentScore', 'reach', 'engagement', 'status', 'isFlagged', 'mentionedAt'],
})

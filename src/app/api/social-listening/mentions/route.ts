import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'brandMention',
  fields: ['keyword', 'platform', 'url', 'title', 'snippet', 'author', 'sentiment', 'sentimentScore', 'reach', 'engagement', 'status', 'isFlagged', 'mentionedAt'],
})

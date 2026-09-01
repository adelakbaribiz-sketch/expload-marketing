import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'socialPost',
  fields: ['socialAccountId', 'content', 'mediaUrls', 'status', 'scheduledAt', 'publishedAt'],
})

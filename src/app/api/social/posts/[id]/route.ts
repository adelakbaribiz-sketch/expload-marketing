import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'socialPost',
  fields: ['socialAccountId', 'content', 'mediaUrls', 'status', 'scheduledAt', 'publishedAt'],
})

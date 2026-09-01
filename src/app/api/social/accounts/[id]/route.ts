import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'socialAccount',
  fields: ['platform', 'handle', 'displayName', 'avatarUrl', 'followerCount', 'isConnected'],
  include: { posts: true },
})

import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'socialAccount',
  fields: ['platform', 'handle', 'displayName', 'avatarUrl', 'followerCount', 'isConnected'],
  include: { posts: true },
})

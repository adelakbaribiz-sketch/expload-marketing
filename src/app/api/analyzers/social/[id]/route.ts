import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'socialAnalysis',
  fields: ['platform', 'handle', 'displayName', 'followerCount', 'followingCount', 'postCount', 'avgLikes', 'avgComments', 'avgShares', 'engagementRate', 'followerGrowth', 'postingFrequency', 'topHashtags', 'bestPostingTime', 'contentCategories', 'influenceScore', 'authenticityScore', 'brandFitScore', 'competitorRank', 'marketShare'],
})

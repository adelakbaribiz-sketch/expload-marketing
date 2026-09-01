import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'socialAnalysis',
  fields: ['platform', 'handle', 'displayName', 'followerCount', 'followingCount', 'postCount', 'avgLikes', 'avgComments', 'avgShares', 'engagementRate', 'followerGrowth', 'postingFrequency', 'topHashtags', 'bestPostingTime', 'contentCategories', 'influenceScore', 'authenticityScore', 'brandFitScore', 'competitorRank', 'marketShare', 'rawData'],
})

import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'competitorAnalysis',
  fields: ['competitorId', 'contentType', 'contentFormats', 'topicDiversity', 'topTopics', 'titleKeywords', 'descriptionStyle', 'postsPerWeek', 'postsPerMonth', 'uploadSchedule', 'consistencyScore', 'avgLikes', 'avgComments', 'avgShares', 'engagementRate', 'commentResponseRate', 'avgResponseTime', 'avgViews', 'peakViews', 'subscriberGrowth', 'avgWatchTime', 'ctr', 'totalSubscribers', 'seoKeywords', 'tagStrategy', 'descriptionOptimized', 'usesEndCards', 'usesPlaylists', 'internalLinking', 'thumbnailStyle', 'visualConsistency', 'colorScheme', 'usesBranding', 'audienceAgeRange', 'audienceGender', 'audienceCountries', 'toneOfVoice', 'languageUsed', 'hasSponsorships', 'sponsorBrands', 'hasAffiliateLinks', 'affiliatePrograms', 'monetizationMethods', 'estimatedMonthlyEarnings', 'platforms', 'crossPlatformStrategy', 'totalFollowersAll', 'strengths', 'weaknesses', 'uniqueSellingPoints', 'improvementOpportunities', 'aiAnalysis'],
  include: { competitor: true },
})

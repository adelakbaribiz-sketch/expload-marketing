import { createDomainItemHandlers } from '@/lib/crud/domain-handler'
export const { GET, PATCH, DELETE } = createDomainItemHandlers({
  model: 'competitorProfile',
  fields: ['name', 'domain', 'description', 'foundedYear', 'employees', 'revenue', 'websiteTraffic', 'trafficTrend', 'organicKeywords', 'paidKeywords', 'backlinks', 'domainAuthority', 'socialFollowers', 'socialEngagement', 'marketingSpend', 'adChannels', 'contentOutput', 'seoScore', 'strengths', 'weaknesses', 'opportunities', 'threats', 'marketPosition', 'marketShare', 'growthRate', 'threat', 'notes'],
})

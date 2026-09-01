import { createDomainHandlers } from '@/lib/crud/domain-handler'
export const { GET, POST } = createDomainHandlers({
  model: 'landingPage',
  fields: ['name', 'slug', 'html', 'css', 'config', 'status', 'visitors', 'conversions', 'conversionRate', 'metaTitle', 'metaDescription', 'experimentId', 'publishedAt'],
})
